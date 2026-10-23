"""Declarative jobs; runtime connections are resolved separately from saved definitions."""
from uuid import UUID
from fastapi import APIRouter, HTTPException, Request
from pydantic import Field, model_validator
from etl.jobs import JobDefinition
from etl.schema import Contract
from etl.load_transport import MAX_LOAD_MESSAGE_BYTES
from source_models import SourceModel
from connection_models import DatabaseConnectionInput
from services.auth_service import optional_user, active_user
from services.connection_service import resolve_connection, resolve_pipeline
from services import job_service
from api.routes.warehouse import WarehouseRoute

router = APIRouter(route_class=WarehouseRoute)


class JobRequest(Contract):
    definition: JobDefinition
    sources: dict[str, SourceModel] = Field(min_length=1, max_length=40)
    targets: dict[str, DatabaseConnectionInput] = Field(min_length=1, max_length=40)
    run_id: str = Field(pattern=r"^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
    resume_run_id: str | None = Field(default=None, pattern=r"^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
    preview_only: bool = True
    confirm_destructive: bool = False
    reviewed_unknown: bool = False

    @model_validator(mode="after")
    def references(self):
        sources = {n.source_ref for n in self.definition.nodes if n.source_ref}
        for n in self.definition.nodes:
            for step in n.recipe:
                for field in ("right_source", "secondary_source"):
                    ref = step.params.get(field)
                    if isinstance(ref, dict) and ref.get("source_ref"):
                        sources.add(ref["source_ref"])
        targets = {n.output.target_ref for n in self.definition.nodes if n.output}
        if not sources <= self.sources.keys() or not targets <= self.targets.keys():
            raise ValueError("Faltan orígenes o destinos del trabajo.")
        if not self.preview_only and not self.confirm_destructive and any(n.output and n.output.if_exists in {"replace", "reload"} for n in self.definition.nodes):
            raise ValueError("Confirma explícitamente las salidas que reemplazan o recargan datos.")
        return self


async def owner_of(request):
    identity = await optional_user(request)
    return (await active_user(request)).user_id if identity else "local"


@router.post("/definition", response_model=JobDefinition)
async def validate_definition(req: JobDefinition):
    return req


@router.post("/execute")
async def execute(req: JobRequest, request: Request):
    owner = await owner_of(request)
    sources, targets = {}, {}
    for alias, source in req.sources.items():
        sources[alias], _ = await resolve_pipeline(source.model_dump(exclude_none=True), [], request)
    for alias, target in req.targets.items():
        targets[alias] = await resolve_connection(target.model_dump(exclude_none=True), request, "target")
    return await job_service.perform(req, owner, sources, targets)


@router.get("/{run_id}")
async def status(run_id: UUID, request: Request):
    return job_service.ManifestStore(await owner_of(request)).read(run_id)


@router.get("")
async def history(request: Request):
    return {"version": 1, "runs": job_service.ManifestStore(await owner_of(request)).summaries()}
