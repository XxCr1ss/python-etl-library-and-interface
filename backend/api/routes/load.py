from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services import load_service
from api.routes.transform import SourceModel, StepModel

router = APIRouter()

class TargetConnectionModel(BaseModel):
    db_type: str
    host: str
    port: Optional[int] = None
    database: str
    user: str
    password: str
    service_name: Optional[str] = None

class LoadConfigModel(BaseModel):
    table_name: str
    table_type: str  # "dimension" o "fact"
    foreign_keys: Optional[Dict[str, List[str]]] = None
    if_exists: Optional[str] = None  # "replace" o "append" o "fail"

class LoadExecutionReq(BaseModel):
    source: SourceModel
    target_connection: TargetConnectionModel
    load_config: LoadConfigModel
    recipe: List[StepModel]

@router.post("/test-connection")
async def test_warehouse_connection(req: TargetConnectionModel):
    """
    Verifica que la conexión a la Bodega de Datos de destino sea exitosa.
    """
    try:
        config_dict = req.model_dump(exclude_none=True)
        result = load_service.test_target_connection(config_dict)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la verificación de conexión: {str(e)}")

@router.post("/execute")
async def execute_load_pipeline(req: LoadExecutionReq):
    """
    Ejecuta el pipeline completo (transformación y persistencia final) en la bodega de datos.
    """
    try:
        source_dict = req.source.model_dump(exclude_none=True)
        target_dict = req.target_connection.model_dump(exclude_none=True)
        load_dict = req.load_config.model_dump(exclude_none=True)
        recipe_dict = [step.model_dump() for step in req.recipe]
        
        result = load_service.execute_load(
            source=source_dict,
            target_config=target_dict,
            load_config=load_dict,
            recipe=recipe_dict
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la ejecución de la carga: {str(e)}")
