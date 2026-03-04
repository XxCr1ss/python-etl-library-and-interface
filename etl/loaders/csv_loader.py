import pandas as pd
import os
from typing import Union, List, Dict, Tuple, Optional, Any

class CSV_Loader:
    """
    Clase para cargar, guardar y gestionar archivos CSV con funcionalidades
    específicas para procesos ETL y manejo de datos estructurados.
    
    Proporciona métodos para carga, validación, combinación y gestión
    de archivos CSV con soporte para tablas de dimensión y hechos.
    """
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Inicializa el cargador CSV con una ruta base opcional.
        
        Si se proporciona una ruta base que no existe, se crea automáticamente.
        
        Parámetros:
        -----------
        base_path : str, opcional
            Ruta base donde se almacenarán/leerán los archivos CSV.
            Si es None, se usará la ruta actual o rutas absolutas.
        """
        self.base_path = base_path
        if self.base_path and not os.path.exists(self.base_path):
            os.makedirs(self.base_path)
            print(f"📂 Directorio creado: {self.base_path}")

    def _get_full_path(self, filename: str) -> str:
        """
        Construye la ruta completa del archivo.
        
        Combina la ruta base con el nombre de archivo si base_path está definido.
        
        Parámetros:
        -----------
        filename : str
            Nombre del archivo o ruta relativa/absoluta
            
        Retorna:
        --------
        str
            Ruta completa al archivo
        """
        if self.base_path:
            return os.path.join(self.base_path, filename)
        return filename

    def load_csv(self, filename: str, sep: str = ",", encoding: str = "utf-8", **kwargs) -> pd.DataFrame:
        """
        Carga un archivo CSV en un DataFrame de pandas.
        
        Soporta todos los parámetros de pd.read_csv() para flexibilidad
        en la carga de diferentes formatos CSV.
        
        Parámetros:
        -----------
        filename : str
            Nombre del archivo (o ruta completa si base_path no está definido)
        sep : str, default ","
            Separador de campos del CSV
        encoding : str, default "utf-8"
            Codificación del archivo
        **kwargs : dict
            Argumentos adicionales para pd.read_csv():
            - dtype: Especificación de tipos de datos
            - parse_dates: Columnas a parsear como fechas
            - na_values: Valores a considerar como NaN
            - skiprows: Filas a saltar
            - nrows: Número máximo de filas a leer
            
        Retorna:
        --------
        DataFrame
            DataFrame con los datos cargados del CSV
            
        Lanza:
        ------
        FileNotFoundError
            Si el archivo no existe
        pd.errors.EmptyDataError
            Si el archivo está vacío
        UnicodeDecodeError
            Si hay problemas de codificación
        """
        try:
            full_path = self._get_full_path(filename)
            df = pd.read_csv(full_path, sep=sep, encoding=encoding, **kwargs)
            print(f"✅ CSV cargado exitosamente: {full_path} ({len(df)} registros, {len(df.columns)} columnas)")
            return df
        except Exception as e:
            print(f"❌ Error al cargar CSV {filename}: {e}")
            raise

    def save_csv(self, df: pd.DataFrame, filename: str, index: bool = False, 
                sep: str = ",", encoding: str = "utf-8", mode: str = "w", **kwargs) -> None:
        """
        Guarda un DataFrame en archivo CSV.
        
        Soporta diferentes modos de escritura y todos los parámetros
        de pd.DataFrame.to_csv().
        
        Parámetros:
        -----------
        df : DataFrame
            DataFrame a guardar
        filename : str
            Nombre del archivo destino
        index : bool, default False
            Si se incluye el índice del DataFrame
        sep : str, default ","
            Separador de campos
        encoding : str, default "utf-8"
            Codificación del archivo
        mode : str, default "w"
            Modo de escritura: 
            - "w": Write (sobrescribe)
            - "a": Append (añade al final)
        **kwargs : dict
            Argumentos adicionales para df.to_csv():
            - header: Si incluir encabezados
            - columns: Columnas específicas a guardar
            - date_format: Formato para fechas
            
        Lanza:
        ------
        PermissionError
            Si no hay permisos de escritura
        Exception
            Para otros errores durante el guardado
        """
        try:
            full_path = self._get_full_path(filename)
            
            # Determinar si incluir headers basado en el modo
            header = kwargs.pop('header', True if mode == "w" else False)
            
            with open(full_path, mode, encoding=encoding) as f:
                df.to_csv(f, index=index, sep=sep, header=header, **kwargs)
                
            print(f"💾 CSV guardado exitosamente: {full_path} ({len(df)} registros, {len(df.columns)} columnas)")
        except Exception as e:
            print(f"❌ Error al guardar CSV {filename}: {e}")
            raise

    def merge_csvs(self, file_pattern: str, output_filename: str, how: str = "outer", 
                  **kwargs) -> pd.DataFrame:
        """
        Combina múltiples archivos CSV en uno solo mediante concatenación.
        
        Útil para consolidar datos divididos en múltiples archivos
        con la misma estructura.
        
        Parámetros:
        -----------
        file_pattern : str
            Patrón para encontrar archivos (ej: "data_*.csv", "ventas_*.csv")
        output_filename : str
            Nombre del archivo combinado de salida
        how : str, default "outer"
            Tipo de concatenación (similar a pandas.concat):
            - "outer": Unión de todos los registros (default)
            - "inner": Solo registros comunes (no común en concat)
            - "append": Simple append (ignore_index=True)
        **kwargs : dict
            Argumentos adicionales para pd.concat():
            - ignore_index: Resetear índices (default True)
            - sort: Ordenar columnas (default False)
            
        Retorna:
        --------
        DataFrame
            DataFrame combinado con todos los datos
            
        Lanza:
        ------
        ValueError
            Si base_path no está definido
        FileNotFoundError
            Si no se encuentran archivos con el patrón
        Exception
            Si hay errores durante la combinación
        """
        try:
            if not self.base_path:
                raise ValueError("Se requiere base_path para merge_csvs")
                
            # Buscar archivos que coincidan con el patrón
            all_files = [f for f in os.listdir(self.base_path) 
                        if f.endswith('.csv') and f.startswith(file_pattern.replace('*', ''))]
            
            if not all_files:
                raise FileNotFoundError(f"No se encontraron archivos con patrón: {file_pattern}")
            
            print(f"📁 Encontrados {len(all_files)} archivos para combinar: {all_files}")
            
            # Cargar todos los DataFrames
            dfs = [self.load_csv(f) for f in all_files]
            
            # Configurar parámetros de concatenación
            concat_kwargs = {
                'ignore_index': True,
                'sort': False
            }
            concat_kwargs.update(kwargs)
            
            # Combinar DataFrames
            merged_df = pd.concat(dfs, axis=0, **concat_kwargs)
            
            # Guardar resultado
            self.save_csv(merged_df, output_filename)
            print(f"🔀 Merge completado: {len(all_files)} archivos → {output_filename} ({len(merged_df)} registros totales)")
            return merged_df
            
        except Exception as e:
            print(f"❌ Error al fusionar CSVs: {e}")
            raise

    def validate_csv(self, filename: str, required_columns: Optional[List[str]] = None, 
                    min_rows: int = 0) -> Tuple[bool, str]:
        """
        Valida la estructura básica y contenido de un archivo CSV.
        
        Realiza verificaciones de existencia de columnas, número de registros
        y capacidad de carga del archivo.
        
        Parámetros:
        -----------
        filename : str
            Nombre del archivo a validar
        required_columns : list, opcional
            Lista de columnas requeridas que deben existir
        min_rows : int, default 0
            Número mínimo de registros requeridos
            
        Retorna:
        --------
        tuple
            (bool, str): Tupla con resultado de validación y mensaje descriptivo
            
        Ejemplos:
        ---------
        >>> validador.validate_csv("datos.csv", ["id", "nombre"], min_rows=1)
        (True, "CSV válido: datos.csv (100 registros, 5 columnas)")
        """
        try:
            df = self.load_csv(filename)
            validation_messages = []
            
            # Validar columnas requeridas
            if required_columns:
                missing = [col for col in required_columns if col not in df.columns]
                if missing:
                    return (False, f"Columnas faltantes: {missing}")
            
            # Validar número mínimo de registros
            if len(df) < min_rows:
                validation_messages.append(f"Mínimo {min_rows} registros requeridos, encontrados: {len(df)}")
            
            # Validar que hay columnas
            if len(df.columns) == 0:
                validation_messages.append("No se encontraron columnas en el archivo")
            
            # Validar que no todas las filas son NaN
            if df.dropna(how='all').empty:
                validation_messages.append("Todas las filas están vacías")
            
            if validation_messages:
                return (False, f"Problemas de validación: {'; '.join(validation_messages)}")
            else:
                return (True, f"CSV válido: {filename} ({len(df)} registros, {len(df.columns)} columnas)")
                
        except Exception as e:
            return (False, f"Error de validación: {str(e)}")

    def load_fact(self, df: pd.DataFrame, filename: str, foreign_keys: Optional[List[str]] = None, 
                 mode: str = "append", sep: str = ",", encoding: str = "utf-8", index: bool = False) -> None:
        """
        Carga una tabla de hechos en formato CSV, con validación de claves foráneas.
        
        Diseñado específicamente para tablas de hechos en procesos ETL.
        Por defecto usa modo append para añadir nuevos registros.
        
        Parámetros:
        -----------
        df : DataFrame
            DataFrame con los datos de hechos a guardar
        filename : str
            Nombre del archivo destino
        foreign_keys : list, opcional
            Lista de nombres de columnas que son claves foráneas.
            Se valida que existan en el DataFrame
        mode : str, default "append"
            Modo de escritura: "append" (añadir) o "replace" (reemplazar)
        sep : str, default ","
            Separador de campos
        encoding : str, default "utf-8"
            Codificación del archivo
        index : bool, default False
            Si se incluye el índice del DataFrame
            
        Lanza:
        ------
        ValueError
            Si faltan columnas de clave foránea en el DataFrame
        Exception
            Si ocurre error durante el guardado
        """
        try:
            # Validar claves foráneas si se proporcionan
            if foreign_keys:
                missing = [key for key in foreign_keys if key not in df.columns]
                if missing:
                    raise ValueError(f"🚫 Faltan columnas de clave foránea: {missing}")
            
            # Determinar modo de escritura
            write_mode = "a" if mode == "append" else "w"
            header = True if mode == "replace" else False
            
            self.save_csv(df, filename, index=index, sep=sep, encoding=encoding, 
                         mode=write_mode, header=header)
            print(f"✅ Hechos cargados exitosamente en '{filename}' (modo: {mode}, registros: {len(df)}).")
            
        except Exception as e:
            print(f"❌ Error al cargar hechos '{filename}': {e}")
            raise

    def load_dimension(self, df: pd.DataFrame, filename: str, mode: str = "replace", 
                      sep: str = ",", encoding: str = "utf-8", index: bool = False) -> None:
        """
        Carga una tabla de tipo dimensión en formato CSV.
        
        Por defecto reemplaza el archivo completo, que es el comportamiento
        típico para tablas de dimensión en procesos ETL.
        
        Parámetros:
        -----------
        df : DataFrame
            DataFrame con los datos de dimensión a guardar
        filename : str
            Nombre del archivo destino
        mode : str, default "replace"
            Modo de escritura: "replace" (reemplazar) o "append" (añadir)
        sep : str, default ","
            Separador de campos
        encoding : str, default "utf-8"
            Codificación del archivo
        index : bool, default False
            Si se incluye el índice del DataFrame
            
        Lanza:
        ------
        Exception
            Si ocurre error durante el guardado
        """
        try:
            write_mode = "w" if mode == "replace" else "a"
            header = True if mode == "replace" else False
            
            self.save_csv(df, filename, index=index, sep=sep, encoding=encoding, 
                         mode=write_mode, header=header)
            print(f"✅ Dimensión '{filename}' cargada correctamente (modo: {mode}, registros: {len(df)}).")
            
        except Exception as e:
            print(f"❌ Error al cargar dimensión '{filename}': {e}")
            raise

    def get_file_info(self, filename: str) -> Dict[str, Any]:
        """
        Obtiene información detallada de un archivo CSV.
        
        Parámetros:
        -----------
        filename : str
            Nombre del archivo a analizar
            
        Retorna:
        --------
        dict
            Diccionario con información del archivo:
            {
                'file_size': tamaño en bytes,
                'rows': número de registros,
                'columns': número de columnas,
                'column_names': lista de nombres de columnas,
                'data_types': tipos de datos por columna
            }
        """
        try:
            full_path = self._get_full_path(filename)
            df = self.load_csv(filename)
            
            return {
                'file_size': os.path.getsize(full_path),
                'rows': len(df),
                'columns': len(df.columns),
                'column_names': df.columns.tolist(),
                'data_types': df.dtypes.astype(str).to_dict(),
                'missing_values': df.isnull().sum().to_dict()
            }
        except Exception as e:
            print(f"❌ Error al obtener información del archivo {filename}: {e}")
            raise

    def list_csv_files(self, pattern: str = "*.csv") -> List[str]:
        """
        Lista todos los archivos CSV en el directorio base.
        
        Parámetros:
        -----------
        pattern : str, default "*.csv"
            Patrón de búsqueda para archivos CSV
            
        Retorna:
        --------
        list
            Lista de nombres de archivos CSV encontrados
        """
        if not self.base_path:
            return []
        
        import glob
        search_pattern = os.path.join(self.base_path, pattern)
        return [os.path.basename(f) for f in glob.glob(search_pattern)]