"""
Paquete ETL - Extracción, Transformación y Carga de datos.

Este paquete centraliza los módulos principales:
- extractors: para extraer datos de diferentes fuentes
- transformer: para transformar y manipular datos
- loaders: para cargar datos a distintos destinos
- colombia_saludable: módulo específico del proyecto

Además, expone directamente las clases y operaciones más utilizadas.
"""

# Subpaquetes
from . import extractors
from . import transformer
from . import loaders

# Clases principales de extractors
from .extractors.db_extractor import DB_Extractor
from .extractors.csv_extractor import CSVExtractor
from .extractors.xlsx_extractor import XLSXExtractor

# Clases principales de transformer
from .transformer.header import HeaderOperations
from .transformer.basics_data_transformer import BasicsTransformOperations
from .transformer.advanced_data_transforms import TransformOperations
from .transformer.expresions import DataExpresion
from .transformer.convert import ConvertOperations
from .transformer.fecha import DateTime
from .transformer.selecs import DataSelect

# Clases principales de loaders
from .loaders.csv_loader import CSV_Loader
from .loaders.db_loader import DB_Loader
from .loaders.xlsx_loader import Excel_Loader

__all__ = [
    # Subpaquetes
    "extractors",
    "transformer",
    "loaders",

    # Extractors
    "DB_Extractor",
    "CSVExtractor",
    "XLSXExtractor",

    # Transformer
    "HeaderOperations",
    "BasicsTransformOperations",
    "TransformOperations",
    "DataExpresion",
    "ConvertOperations",
    "DateTime",
    "DataSelect",

    # Loaders
    "CSV_Loader",
    "DB_Loader",
    "Excel_Loader",
]
