from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services import transform_service

router = APIRouter()

class SourceModel(BaseModel):
    type: str # "file" o "database"
    filepath: Optional[str] = None
    sheet_name: Optional[str] = None
    db_type: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    table_name: Optional[str] = None
    service_name: Optional[str] = None

class StepModel(BaseModel):
    type: str
    params: Dict[str, Any]

class TransformPreviewReq(BaseModel):
    source: SourceModel
    steps: List[StepModel]
    limit: Optional[int] = 5

CATALOG_OPERATIONS = [
    {
        "type": "rename_columns",
        "name": "Renombrar Columnas",
        "description": "Cambia el nombre de una o más columnas del dataset.",
        "params": {
            "columns": { "type": "dict", "description": "Diccionario de {nombre_viejo: nombre_nuevo}", "required": True }
        }
    },
    {
        "type": "convert_types",
        "name": "Cambiar Tipo de Datos",
        "description": "Convierte una o más columnas a un tipo de dato específico (ej. entero, decimal, texto, fecha).",
        "params": {
            "columns": { "type": "any", "description": "Lista de columnas a convertir o un string para una sola", "required": True },
            "dtype": { "type": "any", "description": "Tipo de dato destino o mapeo de columnas", "required": True }
        }
    },
    {
        "type": "fill_nulls",
        "name": "Rellenar Nulos",
        "description": "Reemplaza los valores nulos (NaN / None) en una columna por un valor específico.",
        "params": {
            "column": { "type": "str", "description": "Columna a rellenar", "required": True },
            "value": { "type": "any", "description": "Valor de reemplazo", "required": True }
        }
    },
    {
        "type": "select_columns",
        "name": "Seleccionar Columnas",
        "description": "Mantiene únicamente las columnas especificadas en el dataset.",
        "params": {
            "columns": { "type": "list", "description": "Lista de columnas a mantener", "required": True }
        }
    },
    {
        "type": "remove_columns",
        "name": "Eliminar Columnas",
        "description": "Elimina del dataset las columnas indicadas.",
        "params": {
            "columns": { "type": "any", "description": "Lista de columnas a eliminar o un string para una sola", "required": True }
        }
    },
    {
        "type": "left_join",
        "name": "Cruzar Datos (Left Join)",
        "description": "Cruza los datos del dataset principal con un dataset secundario.",
        "params": {
            "right_source": { "type": "dict", "description": "Configuración de origen del dataset secundario", "required": True },
            "on": { "type": "any", "description": "Columna(s) de cruce (string o lista de 2 elementos para nombres diferentes)", "required": True }
        }
    },
    {
        "type": "group_by",
        "name": "Agrupar y Promediar",
        "description": "Agrupa los datos por una o más columnas y calcula el promedio de otra columna numérica.",
        "params": {
            "by": { "type": "any", "description": "Columna o columnas por las cuales agrupar (string o lista)", "required": True },
            "column": { "type": "str", "description": "Columna numérica a promediar", "required": True }
        }
    },
    {
        "type": "filter_value",
        "name": "Filtrar por Valor",
        "description": "Filtra las filas del dataset aplicando una condición lógica sobre una columna.",
        "params": {
            "column": { "type": "str", "description": "Columna a evaluar", "required": True },
            "value": { "type": "any", "description": "Valor de comparación", "required": True },
            "operator": { "type": "str", "description": "Operador lógico: 'eq' (=), 'ne' (!=), 'gt' (>), 'ge' (>=), 'lt' (<), 'le' (<=)", "required": False }
        }
    },
    {
        "type": "split_column",
        "name": "Dividir Columna de Texto",
        "description": "Divide una columna de texto en múltiples columnas utilizando un delimitador.",
        "params": {
            "column": { "type": "str", "description": "Columna a dividir", "required": True },
            "delimiter": { "type": "str", "description": "Carácter delimitador", "required": True },
            "new_columns": { "type": "list", "description": "Lista opcional con nombres de las nuevas columnas", "required": False }
        }
    }
]

@router.get("/operations", response_model=List[Dict[str, Any]])
async def get_supported_operations():
    """
    Retorna el catálogo de transformaciones soportadas por la API.
    """
    return CATALOG_OPERATIONS

@router.post("/preview")
async def transform_preview(req: TransformPreviewReq):
    """
    Recibe la configuración de origen y una lista de transformaciones,
    y retorna la vista previa de los datos resultantes.
    """
    try:
        source_dict = req.source.model_dump(exclude_none=True)
        steps_dict = [step.model_dump() for step in req.steps]
        
        result = transform_service.process_transform_preview(
            source=source_dict,
            steps=steps_dict,
            limit=req.limit
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor de transformación: {str(e)}")
