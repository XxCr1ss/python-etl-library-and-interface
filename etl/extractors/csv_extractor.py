import os
import pandas as pd
import petl as etl
from tabulate import tabulate
from typing import Union, Optional, Dict, Any


class CSVExtractor:
    """
    Clase especializada en la extracción, validación y escritura de archivos CSV.
    Permite obtener estadísticas, previsualizar datos y exportarlos.
    """
    def __init__(self, file_path: str):
        """
        Inicializa el extractor validando que el archivo exista.

        :param file_path: Ruta absoluta o relativa del archivo CSV.
        :raises FileNotFoundError: Si el archivo no existe.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"El archivo {file_path} no existe.")

        self.file_path = file_path


    def read_csv(self, **kwargs) -> pd.DataFrame:
        """
        Lee el archivo CSV y retorna un DataFrame de pandas.

        :param kwargs: Argumentos adicionales compatibles con pandas.read_csv().
        :return: DataFrame con los datos del CSV.
        :raises Exception: Si ocurre un error durante la lectura.
        """
        try:
            data = pd.read_csv(self.file_path, **kwargs)
            print(f"✅ Archivo CSV leído exitosamente: {self.file_path} "
                  f"({len(data)} registros, {len(data.columns)} columnas)")
            return data
        except Exception as e:
            print(f"❌ Error al leer el archivo CSV: {e}")
            raise


    def preview_data(self, n: int = 5, **kwargs) -> None:
        """
        Muestra una vista previa formateada del archivo CSV.

        :param n: Número de filas a mostrar.
        :param kwargs: Argumentos adicionales para read_csv().
        """
        try:
            data = self.read_csv(**kwargs)

            print(f"\n📊 Vista previa de datos ({n} filas de {len(data)} totales):")
            print(f"📁 Archivo: {self.file_path}")
            print(f"📏 Dimensiones: {len(data)} filas × {len(data.columns)} columnas")
            print(f"🏷️ Columnas: {list(data.columns)}")
            print("\n" + "=" * 80)

            print(
                tabulate(
                    data.head(n),
                    headers='keys',
                    tablefmt='fancy_grid',
                    showindex=False
                )
            )

            print(f"\n📋 Tipos de datos:")
            for col, dtype in data.dtypes.head(5).items():
                print(f"  - {col}: {dtype}")

            if len(data.columns) > 5:
                print(f"  ... y {len(data.columns) - 5} columnas más")

        except Exception as e:
            print(f"❌ Error al previsualizar los datos: {e}")
            raise


    def tocsv(self, df: pd.DataFrame, filename: Optional[str] = None,
              write_header: bool = True, mode: str = "replace", **kwargs) -> None:
        """
        Guarda un DataFrame en formato CSV usando petl.

        :param df: DataFrame a exportar.
        :param filename: Ruta destino del archivo.
        :param write_header: Indica si se escribe la cabecera.
        :param mode: 'replace' para sobrescribir, 'append' para añadir.
        :param kwargs: Argumentos adicionales para etl.tocsv().
        :raises ValueError: Si el modo no es válido.
        """
        if filename is None:
            filename = self.file_path

        if mode not in ["replace", "append"]:
            raise ValueError(f"Modo '{mode}' no válido. Use 'replace' o 'append'.")

        if df.empty:
            print("⚠️ Advertencia: El DataFrame está vacío.")

        if isinstance(df, pd.DataFrame):
            if df.columns.str.contains("Unnamed").any():
                print("🔄 Detectadas columnas 'Unnamed', aplicando corrección automática...")
                df.columns = df.iloc[0]
                df = df[1:]
                df = df.reset_index(drop=True)

        table = etl.fromdataframe(df)

        try:
            if mode == "append" and os.path.exists(filename):
                print(f"📥 Modo append: añadiendo {len(df)} registros a '{filename}'")
                existing = etl.fromcsv(filename)
                combined = etl.cat(existing, table)
                etl.tocsv(combined, filename, write_header=write_header, **kwargs)
            else:
                action = "reemplazando" if os.path.exists(filename) else "creando"
                print(f"💾 {action.capitalize()} archivo '{filename}' con {len(df)} registros")
                etl.tocsv(table, filename, write_header=write_header, **kwargs)

            print(f"✅ Datos guardados exitosamente en '{filename}' (modo: {mode}).")

        except Exception as e:
            print(f"❌ Error al guardar los datos en el archivo CSV: {e}")
            raise


    def get_basic_stats(self, **kwargs) -> Dict[str, Any]:
        """
        Obtiene estadísticas básicas del archivo CSV.

        :param kwargs: Argumentos adicionales para read_csv().
        :return: Diccionario con tamaño, filas, columnas, memoria y tipos de datos.
        """
        try:
            df = self.read_csv(**kwargs)
            file_size = os.path.getsize(self.file_path)

            stats = {
                'file_size_bytes': file_size,
                'file_size_mb': round(file_size / (1024 * 1024), 2),
                'rows': len(df),
                'columns': len(df.columns),
                'column_names': df.columns.tolist(),
                'memory_usage_mb': round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2),
                'data_types': df.dtypes.astype(str).to_dict()
            }

            print(f"📈 Estadísticas de '{self.file_path}':")
            for key, value in stats.items():
                if key not in ['column_names', 'data_types']:
                    print(f"  - {key}: {value}")

            return stats

        except Exception as e:
            print(f"❌ Error al obtener estadísticas: {e}")
            raise


    def validate_csv_structure(self, required_columns: Optional[list] = None,
                               min_rows: int = 1, **kwargs) -> tuple:
        """
        Valida la estructura del CSV según columnas requeridas y número mínimo de filas.

        :param required_columns: Lista de columnas obligatorias.
        :param min_rows: Número mínimo de filas requeridas.
        :param kwargs: Argumentos adicionales para read_csv().
        :return: Tupla (bool, mensaje) indicando si el CSV es válido.
        """
        try:
            df = self.read_csv(**kwargs)
            issues = []

            if required_columns:
                missing_cols = [col for col in required_columns if col not in df.columns]
                if missing_cols:
                    issues.append(f"Columnas faltantes: {missing_cols}")

            if len(df) < min_rows:
                issues.append(f"Mínimo {min_rows} filas requeridas, encontradas: {len(df)}")

            if df.empty:
                issues.append("El archivo está vacío")

            if issues:
                return False, f"Problemas de validación: {'; '.join(issues)}"
            else:
                return True, f"CSV válido: {len(df)} filas, {len(df.columns)} columnas"

        except Exception as e:
            return False, f"Error en validación: {str(e)}"
