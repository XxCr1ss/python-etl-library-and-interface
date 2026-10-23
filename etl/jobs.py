"""Sequential, bounded multi-output ETL. A manifest records facts, not global rollback."""
import hashlib
import asyncio
import time
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import Field, JsonValue, model_validator

from .schema import Contract, Identifier, LoadSchemaSpec, CheckSpec, check_frame, coerce_frame
from .load_transport import encode_dataset, strict_json, LoadValidationError, MAX_LOAD_ROWS
from .recipe import apply_transformation_steps


class JobStep(Contract):
    type: str = Field(min_length=1, max_length=100)
    params: dict[str, JsonValue]

    @model_validator(mode="after")
    def safe_step(self):
        # Jobs reuse data operations, without expanding the legacy expression surface.
        allowed = {"rename_columns", "convert_types", "fill_nulls", "select_columns", "remove_columns", "left_join", "right_join", "inner_join", "outer_join", "group_by", "filter_value", "split_column", "union", "normalize_delimited_column", "sort_columns", "convert_column_to_list", "explode_column_list", "clean_numeric_columns", "clean_date_format", "convert_to_ordered_category", "boolean_to_binary", "sort_by", "search_in_column", "search_in_table", "split_column_into_rows", "drop_duplicates", "replace_values", "group_by_sum", "group_by_count", "group_by_shift", "filter_by_list_length", "replace_all_headers", "prefix_header", "suffix_header", "add_sequential_index", "filter_in_range", "filter_in_list", "filter_is_null", "select_not_none"}
        if self.type not in allowed:
            raise ValueError("Operación no disponible para trabajos declarativos.")
        params = {"columns", "dtype", "column", "value", "right_source", "on", "by", "operator", "delimiter", "new_columns", "secondary_source", "keep_original", "ascending", "new_column", "format_output", "categories", "ordered", "pattern", "complement", "case_sensitive", "new_column_name", "drop_original", "subset", "old_value", "new_value", "periods", "length", "keep_in", "new_headers", "prefix", "suffix", "column_name", "start", "min_value", "max_value", "values"}
        if not set(self.params) <= params:
            raise ValueError("El paso contiene parámetros desconocidos o una conexión embebida.")
        for name in ("right_source", "secondary_source"):
            value = self.params.get(name)
            if value is not None and (not isinstance(value, dict) or len(value) != 1 or not set(value) <= {"node_ref", "source_ref"} or not all(isinstance(v, str) for v in value.values())):
                raise ValueError("Los trabajos usan referencias a nodos/orígenes, sin conexiones embebidas.")
        return self


class JobOutput(Contract):
    target_ref: Identifier
    table_name: Identifier
    table_type: Literal["dimension", "fact"] = "dimension"
    if_exists: Literal["fail", "append", "reload", "replace"] = "fail"
    schema_spec: LoadSchemaSpec


class JobNode(Contract):
    id: Identifier
    source_ref: Identifier | None = None
    input_node: Identifier | None = None
    depends_on: list[Identifier] = Field(default_factory=list, max_length=40)
    recipe: list[JobStep] = Field(default_factory=list, max_length=100)
    checks: list[CheckSpec] = Field(default_factory=list, max_length=50)
    preserve_rows: bool = False
    preserve_sums: list[Identifier] = Field(default_factory=list, max_length=20)
    output: JobOutput | None = None

    @model_validator(mode="after")
    def one_input(self):
        if (self.source_ref is None) == (self.input_node is None):
            raise ValueError("Cada nodo requiere un origen o un nodo de entrada.")
        return self

    def dependencies(self):
        result = set(self.depends_on)
        if self.input_node:
            result.add(self.input_node)
        for step in self.recipe:
            for name in ("right_source", "secondary_source"):
                source = step.params.get(name)
                if isinstance(source, dict) and "node_ref" in source:
                    result.add(source["node_ref"])
        return result


class JobDefinition(Contract):
    version: Literal[1] = 1
    title: str = Field(min_length=1, max_length=200)
    nodes: list[JobNode] = Field(min_length=1, max_length=40)

    @model_validator(mode="after")
    def graph(self):
        self.ordered_nodes()
        outputs = [(n.output.target_ref, n.output.table_name) for n in self.nodes if n.output]
        if len(set(outputs)) != len(outputs):
            raise ValueError("Dos salidas no pueden escribir la misma tabla en un trabajo.")
        if not outputs:
            raise ValueError("El trabajo requiere al menos una salida.")
        return self

    def ordered_nodes(self):
        remaining = {node.id: node for node in self.nodes}
        outputs = {(n.output.target_ref, n.output.table_name): n.id for n in self.nodes if n.output}
        def dependencies(node):
            deps = node.dependencies()
            if node.output:
                for fk in node.output.schema_spec.foreign_keys:
                    reference = outputs.get((node.output.target_ref, fk.target_table))
                    if reference:
                        deps.add(reference)
            return deps
        if len(remaining) != len(self.nodes):
            raise ValueError("IDs de nodos repetidos.")
        completed, ordered = set(), []
        while remaining:
            ready = [n for n in remaining.values() if dependencies(n) <= completed]
            if not ready:
                raise ValueError("El grafo contiene ciclos o dependencias ausentes.")
            for node in ready:
                ordered.append(node)
                completed.add(node.id)
                del remaining[node.id]
        return ordered


def digest(value):
    return hashlib.sha256(strict_json(value).encode("utf-8")).hexdigest()


def frame_fingerprint(frame):
    data = encode_dataset(frame)
    data["rows"].sort(key=strict_json)
    return digest(data)


async def execute_job(definition, load_source, persist, checkpoint, target_identities, previous=None, verify_output=None, preview=False, run_id=None):
    """Callbacks separate I/O from orchestration. Never retry an uncertain write."""
    definition = JobDefinition.model_validate(definition)
    definition_hash = digest(definition.model_dump(mode="json"))
    if previous and (previous.get("definition_hash") != definition_hash or previous.get("target_identities") != target_identities):
        raise LoadValidationError("Cambió la definición o el destino; no se puede reanudar esa ejecución.")
    nodes = definition.ordered_nodes()
    manifest = {"version": 1, "run_id": run_id or str(uuid4()), "definition_hash": definition_hash,
                "title": definition.title,
                "target_identities": target_identities, "started_at": datetime.now(timezone.utc).isoformat(),
                "status": "validating", "preview_only": preview,
                "nodes": {n.id: {"status": "pending", **({"table_name": n.output.table_name, "target_ref": n.output.target_ref, "load_mode": n.output.if_exists} if n.output else {})} for n in nodes}}
    frames, sources, size = {}, {}, 0
    deadline = time.monotonic() + 300

    async def source(reference):
        nonlocal size
        if "node_ref" in reference:
            return frames[reference["node_ref"]].copy()
        name = reference["source_ref"]
        if name not in sources:
            sources[name] = await load_source(name)
            size += int(sources[name].memory_usage(deep=True).sum())
            if size > 64 * 1024 * 1024:
                raise LoadValidationError("Los orígenes cacheados superan el presupuesto de memoria de 64 MiB.")
            if len(sources[name]) > MAX_LOAD_ROWS:
                raise LoadValidationError("El origen del trabajo supera el presupuesto de filas.")
        return sources[name].copy()

    checkpoint(manifest)
    # Complete transformations/checks before the first write.
    for node in nodes:
        item = manifest["nodes"][node.id]
        try:
            if time.monotonic() > deadline:
                raise LoadValidationError("El trabajo agotó su presupuesto temporal.")
            item["status"] = "running"
            checkpoint(manifest)
            original = await source({"node_ref": node.input_node} if node.input_node else {"source_ref": node.source_ref})
            input_hash = frame_fingerprint(original)
            for step in node.recipe:
                for key in ("right_source", "secondary_source"):
                    if key in step.params:
                        await source(step.params[key])
            async def cached_source(reference):
                return frames[reference["node_ref"]].copy() if "node_ref" in reference else sources[reference["source_ref"]].copy()
            frame = await asyncio.to_thread(lambda: asyncio.run(apply_transformation_steps(original, [s.model_dump() for s in node.recipe], cached_source, max_rows=MAX_LOAD_ROWS)))
            if time.monotonic() > deadline:
                raise LoadValidationError("El trabajo agotó su presupuesto antes de iniciar escrituras.")
            if len(frame) > MAX_LOAD_ROWS:
                raise LoadValidationError("Un nodo supera el presupuesto de filas.")
            if node.preserve_rows and len(frame) != len(original):
                raise LoadValidationError("El nodo no conserva el número de filas declarado.")
            from decimal import Decimal, localcontext
            for name in node.preserve_sums:
                with localcontext() as context:
                    context.prec = 100
                    if name not in original or name not in frame or sum((Decimal(str(v)) for v in original[name].dropna()), Decimal(0)) != sum((Decimal(str(v)) for v in frame[name].dropna()), Decimal(0)):
                        raise LoadValidationError("El nodo no conserva una suma declarada.")
            checks = check_frame(frame, node.checks)
            if node.output:
                frame = coerce_frame(frame, node.output.schema_spec)
                checks += check_frame(frame, node.output.schema_spec.checks)
            output_hash = frame_fingerprint(frame)
            size += int(frame.memory_usage(deep=True).sum())
            if size > 64 * 1024 * 1024:
                raise LoadValidationError("Los resultados intermedios superan el presupuesto de memoria de 64 MiB.")
            frames[node.id] = frame
            item.update(status="validated", input_hash=input_hash, output_hash=output_hash, input_rows=len(original), output_rows=len(frame), checks=checks)
            if previous:
                prior = previous.get("nodes", {}).get(node.id, {})
                if prior.get("input_hash") is not None and prior["input_hash"] != input_hash or prior.get("output_hash") is not None and prior["output_hash"] != output_hash:
                    raise LoadValidationError("Cambió el contenido de las entradas; inicia una ejecución nueva.")
            checkpoint(manifest)
        except Exception as exc:
            item["status"] = "failed"
            item["error_code"] = "validation_failed"
            item["error_message"] = str(exc) if isinstance(exc, LoadValidationError) else "No se pudo validar la transformación o sus tipos; revisa la receta y las referencias del nodo."
            for other in nodes:
                if manifest["nodes"][other.id]["status"] == "pending":
                    manifest["nodes"][other.id]["status"] = "blocked"
            manifest["status"] = "failed"
            checkpoint(manifest)
            return manifest
    # Validate cross-output references in memory before committing any output.
    outputs = {(n.output.target_ref, n.output.table_name): n for n in nodes if n.output}
    from .schema import missing
    for node in nodes:
        if not node.output:
            continue
        for fk in node.output.schema_spec.foreign_keys:
            parent = outputs.get((node.output.target_ref, fk.target_table))
            if parent:
                keys = [parent.output.schema_spec.primary_key, *parent.output.schema_spec.unique_keys]
                valid_key = any(set(key) == set(fk.target_columns) for key in keys)
                try:
                    parent_keys = set(frames[parent.id][fk.target_columns].itertuples(index=False, name=None))
                    invalid_keys = any(not any(missing(v) for v in row) and row not in parent_keys for row in frames[node.id][fk.columns].itertuples(index=False, name=None))
                except KeyError:
                    valid_key, invalid_keys = False, True
                if not valid_key or invalid_keys:
                    manifest["status"] = "failed"
                    manifest["nodes"][node.id].update(status="failed", error_code="reference_failed", error_message="Una referencia entre salidas no cumple la clave única o la correspondencia declarada.")
                    checkpoint(manifest)
                    return manifest
    if preview:
        manifest["status"] = "validated"
        checkpoint(manifest)
        return manifest
    manifest["status"] = "running"
    for index, node in enumerate(nodes):
        if not node.output:
            continue
        if time.monotonic() > deadline:
            for other in nodes[index:]:
                if other.output:
                    manifest["nodes"][other.id]["status"] = "blocked"
            manifest.update(status="partial", error_code="job_budget_exceeded")
            checkpoint(manifest)
            return manifest
        item = manifest["nodes"][node.id]
        prior = previous.get("nodes", {}).get(node.id, {}) if previous else {}
        try:
            if prior.get("status") in {"success", "unknown", "running"}:
                if not verify_output or not await verify_output(node, frames[node.id], prior):
                    raise LoadValidationError("La salida previa no se pudo conciliar. No se repetirá automáticamente.")
                item.update(status="success", reused=True, total_rows=prior.get("total_rows"))
            else:
                # Durably record uncertainty BEFORE calling any write adapter.
                item["status"] = "unknown"
                checkpoint(manifest)
                report = await persist(node, frames[node.id])
                if report.get("status") != "success" or type(report.get("total_rows")) is not int:
                    raise LoadValidationError("El destino no confirmó la carga.")
                item.update(status="success", total_rows=report["total_rows"], reused=False)
            checkpoint(manifest)
        except BaseException:
            item["status"] = "unknown"
            item["error_code"] = "write_unconfirmed"
            for other in nodes[index + 1:]:
                if other.output:
                    manifest["nodes"][other.id]["status"] = "blocked"
            manifest["status"] = "partial"
            checkpoint(manifest)
            return manifest
    manifest["status"] = "success"
    manifest["finished_at"] = datetime.now(timezone.utc).isoformat()
    checkpoint(manifest)
    return manifest
