from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from backend.warehouse_models import CatalogRequest, QueryRequest, DetailRequest, ExportRequest
from etl.warehouse.responses import CatalogResponse, QueryResponse, DetailResponse
from etl.warehouse.settings import LIMITS, WarehouseError
from services import warehouse_service


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


@router.post("/catalog", response_model=CatalogResponse)
async def catalog(req: CatalogRequest):
    return await warehouse_service.perform("catalog", req)


@router.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    return await warehouse_service.perform("query", req)


@router.post("/detail", response_model=DetailResponse)
async def detail(req: DetailRequest):
    return await warehouse_service.perform("detail", req)


@router.post("/export")
async def export(req: ExportRequest):
    result = await warehouse_service.perform("export", req)
    content = warehouse_service.download(result)
    return Response(content=content, media_type=result["mime_type"], headers={"Content-Disposition": 'attachment; filename="' + result["filename"] + '"'})
