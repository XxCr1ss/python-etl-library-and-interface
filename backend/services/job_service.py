"""Local replaceable manifest store; no source data or credentials are persisted."""
import asyncio
import hashlib
import json
import os
import time
from pathlib import Path

from fastapi import HTTPException
from etl.jobs import execute_job, digest, frame_fingerprint
from etl.schema import coerce_frame
from etl.load_execution import persist_and_verify
from etl.load_transport import encode_dataset, LOAD_PROTOCOL_VERSION
from services import load_service, transform_service
from services.agent_manager import agent_manager

_tasks = {}
_owners = set()


class ManifestStore:
    def __init__(self, owner):
        root = Path(os.getenv("ETL_JOB_MANIFEST_DIR", Path(__file__).resolve().parents[2] / ".etl_runtime" / "jobs"))
        self.folder = root / hashlib.sha256(owner.encode()).hexdigest()
        self.folder.mkdir(parents=True, exist_ok=True)

    def path(self, run_id):
        from uuid import UUID
        return self.folder / (str(UUID(str(run_id))) + ".json")

    def read(self, run_id):
        from uuid import UUID
        run_id = str(UUID(str(run_id)))
        path = self.path(run_id)
        if not path.exists():
            raise HTTPException(404, "Ejecución no disponible en este contexto.")
        value = json.loads(path.read_text(encoding="utf-8"))
        if value.get("status") in {"accepted", "validating", "running"} and (str(self.folder), str(run_id)) not in _tasks:
            # A restart cannot establish whether an in-flight write committed.
            validating = value["status"] in {"accepted", "validating"}
            value["status"] = "failed" if validating else "partial"
            for node in value.get("nodes", {}).values():
                if node.get("status") in {"running", "unknown"}:
                    node["status"] = "failed" if validating else "unknown"
        return value

    def claim(self, run_id, value):
        retention = max(1, int(os.getenv("ETL_JOB_MANIFEST_RETENTION_DAYS", "30"))) * 86400
        maximum = max(1, int(os.getenv("ETL_JOB_MAX_MANIFESTS", "100")))
        files = list(self.folder.glob("*.json"))
        for path in files:
            from uuid import UUID
            try:
                UUID(path.stem)
            except ValueError:
                continue
            if path.is_symlink():
                continue
            if time.time() - path.stat().st_mtime > retention and (str(self.folder), path.stem) not in _tasks:
                record = json.loads(path.read_text(encoding="utf-8"))
                if record.get("status") in {"success", "validated", "failed"}:
                    path.unlink()
        if sum(1 for _ in self.folder.glob("*.json")) >= maximum:
            raise HTTPException(429, "Se alcanzó el límite de manifiestos de este contexto; revisa la retención antes de iniciar otro trabajo.")
        try:
            with self.path(run_id).open("x", encoding="utf-8") as handle:
                json.dump(value, handle, ensure_ascii=False)
        except FileExistsError:
            return False
        return True

    def records(self):
        from uuid import UUID
        result = []
        for path in self.folder.glob("*.json"):
            try:
                UUID(path.stem)
                if not path.is_symlink():
                    result.append(self.read(path.stem))
            except (ValueError, OSError):
                continue
        return sorted(result, key=lambda r: r.get("started_at", ""), reverse=True)

    def summaries(self):
        return [{key: record.get(key) for key in ("run_id", "title", "status", "preview_only", "started_at", "finished_at", "definition_hash")} for record in self.records()][:100]

    def write(self, value):
        path = self.path(value["run_id"])
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding="utf-8")
        temporary.replace(path)


async def perform(req, owner, sources, targets):
    from uuid import UUID
    store = ManifestStore(owner)
    run_id = str(UUID(str(req.run_id)))
    key = (str(store.folder), run_id)
    if store.path(run_id).exists():
        return store.read(run_id)
    if owner in _owners or len(_owners) >= 4:
        raise HTTPException(409, "Ya hay un trabajo en curso en este contexto.")
    previous = store.read(req.resume_run_id) if req.resume_run_id else None
    if previous and previous.get("preview_only"):
        raise HTTPException(422, "Una validación sin escritura no es una ejecución para reanudar.")
    identity = {alias: digest({k: v for k, v in config.items() if k in {"db_type", "host", "port", "database", "user", "service_name", "use_agent", "agent_id"}}) for alias, config in targets.items()}
    destinations = [(identity[n.output.target_ref], n.output.table_name) for n in req.definition.nodes if n.output]
    if len(set(destinations)) != len(destinations):
        raise HTTPException(422, "Dos salidas resueltas apuntan a la misma tabla destino.")
    if not req.preview_only and not req.resume_run_id and not req.reviewed_unknown:
        for prior in store.records():
            for node in prior.get("nodes", {}).values():
                if node.get("status") in {"unknown", "running"}:
                    target = prior.get("target_identities", {}).get(node.get("target_ref"))
                    if (target, node.get("table_name")) in destinations:
                        raise HTTPException(409, "Hay una escritura incierta sobre un destino de este trabajo. Concilia y reanuda, o revisa el destino y confirma su revisión antes de una ejecución nueva.")
    initial = {"version": 1, "run_id": run_id, "status": "accepted", "preview_only": req.preview_only, "nodes": {}}
    if not store.claim(run_id, initial):
        return store.read(run_id)
    _owners.add(owner)

    async def operation():
        try:
            for config in targets.values():
                if config.get("db_type") != "postgresql":
                    raise HTTPException(422, "Los trabajos con esquema explícito requieren PostgreSQL.")
                if config.get("use_agent"):
                    await load_service._capabilities(config, require_schema=True)

            async def load_source(alias):
                return await transform_service.load_source_df(sources[alias], typed=True)

            async def persist(node, frame, preview=False):
                output = node.output
                target = targets[output.target_ref]
                config = output.model_dump(exclude={"target_ref"})
                if preview:
                    config.update(preview_only=True, if_exists="append")
                if target.get("use_agent"):
                    agent_id, generation, max_bytes, max_rows = await load_service._capabilities(target, require_schema=True, require_preview=preview)
                    dataset = await asyncio.to_thread(encode_dataset, frame, max_bytes - 4096, max_rows)
                    payload = {"load_protocol_version": LOAD_PROTOCOL_VERSION, "target_connection": load_service.connection_parameters(target), "load_config": config, "dataset": dataset}
                    response = await agent_manager.send_command_and_wait(agent_id, "preview_load" if preview else "execute_load", payload, timeout=load_service.LOAD_TIMEOUT, expected_connection=generation, max_message_bytes=max_bytes)
                    return load_service._validate_report(load_service._result(response), config)
                return await asyncio.to_thread(persist_and_verify, frame, target, config)

            async def verify(node, frame, prior):
                # Exact full-table comparison is bounded by typed extraction. Append with
                # unrelated prior rows cannot be proven by this verifier and is refused.
                output = node.output
                target = targets[output.target_ref]
                try:
                    structure = await persist(node, frame, preview=True)
                    if "create_indexes" in structure.get("schema_actions", []):
                        return False
                    actual = await transform_service.load_source_df({**target, "type": "database", "table_name": output.table_name}, typed=True)
                    actual = coerce_frame(actual, output.schema_spec)
                    return frame_fingerprint(actual) == frame_fingerprint(frame)
                except Exception:
                    return False

            return await execute_job(req.definition.model_dump(), load_source, persist, store.write, identity,
                                     previous=previous, verify_output=verify, preview=req.preview_only, run_id=run_id)
        except BaseException:
            failure = json.loads(store.path(run_id).read_text(encoding="utf-8"))
            failure.update(status="partial" if any(n.get("status") in {"success", "unknown"} for n in failure.get("nodes", {}).values()) else "failed", error_code="preflight_failed")
            store.write(failure)
            return failure
        finally:
            _owners.discard(owner)

    task = asyncio.create_task(operation())
    _tasks[key] = task
    def finished(completed):
        _tasks.pop(key, None)
        if not completed.cancelled():
            completed.exception()
    task.add_done_callback(finished)
    return await asyncio.shield(task)
