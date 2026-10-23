from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from backend.warehouse_models import CatalogRequest, QueryRequest, DetailRequest, ExportRequest
from etl.warehouse.responses import CatalogResponse, QueryResponse, DetailResponse
from etl.warehouse.settings import LIMITS, WarehouseError
from services import warehouse_service
from etl.warehouse.analysis_models import AnalysisRequest, ReportRequest, ReportDefinition
from etl.warehouse.responses import AnalysisResponse, ReportResponse
from services.connection_service import resolve_connection


class WarehouseRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded_request(request: Request):
            try:
                if request.url.scheme != "https" and request.url.hostname not in {"localhost", "127.0.0.1", "::1"}:
                    raise WarehouseError("insecure_transport", "El backend remoto requiere HTTPS.", 400)
                parts, size = [], 0
                async for part in request.stream():
                    size += len(part)
                    if size > LIMITS["message_bytes"]:
                        raise WarehouseError("result_limit_exceeded", "La solicitud supera el límite de bytes.", 413)
                    parts.append(part)
                request._body = b"".join(parts)
                response = await handler(request)
                response.headers["Cache-Control"] = "no-store"
                return response
            except WarehouseError as exc:
                return JSONResponse(status_code=exc.status, content={"detail": str(exc), "code": exc.code}, headers={"Cache-Control": "no-store"})
            except RequestValidationError:
                return JSONResponse(status_code=422, content={"detail": "Solicitud analítica inválida; revisa los campos y sus límites.", "code": "invalid_query"}, headers={"Cache-Control": "no-store"})
        return bounded_request


router = APIRouter(route_class=WarehouseRoute)


async def perform_resolved(operation, req, request):
    config = await resolve_connection(req.connection.model_dump(exclude_none=True), request, "target")
    connection = type(req.connection).model_validate(config)
    return await warehouse_service.perform(operation, req.model_copy(update={"connection": connection}))


@router.post("/definition", response_model=ReportDefinition)
async def validate_definition(req: ReportDefinition):
    # No connections or data access: reusable definitions contain only allowlisted configuration.
    return req


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(req: AnalysisRequest, request: Request):
    return await perform_resolved("analyze", req, request)


@router.post("/report", response_model=ReportResponse)
async def report(req: ReportRequest, request: Request):
    return await perform_resolved("report", req, request)


@router.post("/catalog", response_model=CatalogResponse)
async def catalog(req: CatalogRequest, request: Request):
    return await perform_resolved("catalog", req, request)


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest, request: Request):
    return await perform_resolved("query", req, request)


@router.post("/detail", response_model=DetailResponse)
async def detail(req: DetailRequest, request: Request):
    return await perform_resolved("detail", req, request)


@router.post("/export")
async def export(req: ExportRequest, request: Request):
    result = await perform_resolved("export", req, request)
    content = warehouse_service.download(result)
    return Response(content=content, media_type=result["mime_type"], headers={"Content-Disposition": 'attachment; filename="' + result["filename"] + '"'})
