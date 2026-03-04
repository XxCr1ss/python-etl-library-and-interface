import pandas as pd
from typing import Union, List, Dict, Optional

class Excel_Loader:
    """
    Clase para cargar y gestionar datos en archivos Excel con funcionalidades
    específicas para tablas de dimensión y hechos.
    
    Proporciona métodos para carga, validación y limpieza de hojas Excel
    con comportamiento similar a una base de datos.
    """
    
    def __init__(self, default_path: Optional[str] = None):
        """
        Inicializa el Excel_Loader con una ruta por defecto.
        
        Parámetros:
        -----------
        default_path : str, opcional
            Ruta por defecto del archivo Excel. Si se proporciona,
            no será necesario especificar la ruta en cada método.
        """
        self.default_path = default_path
    
    def _get_path(self, path: Optional[str]) -> str:
        """
        Método interno para obtener la ruta del archivo Excel.
        
        Parámetros:
        -----------
        path : str, opcional
            Ruta proporcionada al método
            
        Retorna:
        --------
        str
            Ruta válida del archivo Excel
            
        Lanza:
        ------
        ValueError
            Si no se encuentra una ruta válida
        """
        if path is not None:
            return path
        elif self.default_path is not None:
            return self.default_path
        else:
            raise ValueError("❌ No se ha proporcionado una ruta para el archivo Excel.")
    
    def load_dimension(self, df: pd.DataFrame, sheet_name: str, path: Optional[str] = None, 
                      if_exists: str = "replace", index: bool = False) -> None:
        """
        Carga una hoja de dimensión en un archivo Excel.
        
        Por defecto reemplaza el contenido completo de la hoja, que es el comportamiento
        típico para tablas de dimensión en procesos ETL.
        
        Parámetros:
        -----------
        df : DataFrame
            DataFrame con los datos de la dimensión a cargar
        sheet_name : str
            Nombre de la hoja donde se cargarán los datos
        path : str, opcional
            Ruta del archivo Excel. Si es None, usa la ruta por defecto
        if_exists : str, default "replace"
            Comportamiento si la hoja existe:
            - 'replace': Reemplaza la hoja completa
            - 'append': Agrega datos a la hoja existente (añade filas al final)
        index : bool, default False
            Si se incluye el índice del DataFrame en la hoja Excel
            
        Lanza:
        ------
        Exception
            - Si el archivo no existe en modo append
            - Si no se tienen permisos de escritura
            - Si la hoja está protegida o el archivo está abierto
        """
        try:
            file_path = self._get_path(path)
            mode = 'a' if if_exists == "append" else 'w'
            
            with pd.ExcelWriter(file_path, engine='openpyxl', mode=mode, if_sheet_exists='replace') as writer:
                df.to_excel(writer, sheet_name=sheet_name, index=index)
            print(f"✅ Dimensión '{sheet_name}' cargada exitosamente en Excel (modo: {if_exists}).")
        except Exception as e:
            print(f"❌ Error al cargar dimensión '{sheet_name}' en Excel: {e}")
            raise
    
    def load_fact(self, df: pd.DataFrame, sheet_name: str, path: Optional[str] = None, 
                 foreign_keys: Optional[List[str]] = None, if_exists: str = "append", 
                 index: bool = False) -> None:
        """
        Carga una hoja de hechos en un archivo Excel con validación de claves foráneas.
        
        Diseñado para tablas de hechos que tengan relaciones con tablas de dimensión.
        Por defecto usa modo append para añadir nuevos registros de hechos.
        
        Parámetros:
        -----------
        df : DataFrame
            DataFrame con los datos de hechos a cargar
        sheet_name : str
            Nombre de la hoja donde se cargarán los datos
        path : str, opcional
            Ruta del archivo Excel
        foreign_keys : list, opcional
            Lista de nombres de columnas que son claves foráneas.
            Se valida que existan en el DataFrame
        if_exists : str, default "append"
            Comportamiento si la hoja existe:
            - 'replace': Reemplaza la hoja completa
            - 'append': Agrega datos a la hoja existente
        index : bool, default False
            Si se incluye el índice del DataFrame
            
        Lanza:
        ------
        ValueError
            - Si faltan columnas de clave foránea en el DataFrame
        Exception
            - Si ocurre error durante la escritura del archivo
        """
        try:
            file_path = self._get_path(path)
            
            # Validar que existen las columnas de claves foráneas
            if foreign_keys:
                missing = [key for key in foreign_keys if key not in df.columns]
                if missing:
                    raise ValueError(f"🚫 Faltan columnas de clave foránea: {missing}")
            
            mode = 'a' if if_exists == "append" else 'w'
            
            with pd.ExcelWriter(file_path, engine='openpyxl', mode=mode, if_sheet_exists='replace') as writer:
                df.to_excel(writer, sheet_name=sheet_name, index=index)
            print(f"✅ Hechos cargados exitosamente en la hoja '{sheet_name}' (modo: {if_exists}).")
        except Exception as e:
            print(f"❌ Error al cargar hechos '{sheet_name}' en Excel: {e}")
            raise
    
    def clear_sheet(self, sheet_name: str, path: Optional[str] = None) -> None:
        """
        Limpia completamente una hoja del archivo Excel.
        
        Elimina todos los datos de la hoja especificada, dejándola vacía.
        Preserva todas las demás hojas del archivo.
        
        Parámetros:
        -----------
        sheet_name : str
            Nombre de la hoja a limpiar
        path : str, opcional
            Ruta del archivo Excel
            
        Lanza:
        ------
        Exception
            - Si el archivo no existe
            - Si la hoja no existe
            - Si no se tienen permisos de escritura
        """
        try:
            file_path = self._get_path(path)

            # Leer el archivo completo excluyendo la hoja a limpiar
            with pd.ExcelFile(file_path) as xls:
                sheets = {sheet: pd.read_excel(xls, sheet_name=sheet) 
                         for sheet in xls.sheet_names if sheet != sheet_name}
            
            # Reescribir el archivo excluyendo la hoja a limpiar
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                # Escribir todas las hojas excepto la que se va a limpiar
                for sheet, data in sheets.items():
                    data.to_excel(writer, sheet_name=sheet, index=False)
                # Añadir hoja vacía con el nombre original
                pd.DataFrame().to_excel(writer, sheet_name=sheet_name, index=False)
            
            print(f"🧹 Hoja '{sheet_name}' limpiada exitosamente.")
        except Exception as e:
            print(f"❌ Error al limpiar la hoja '{sheet_name}': {e}")
            raise
    
    def load_data(self, dataframe: pd.DataFrame, sheet_name: str = "Transformacion", 
                 path: Optional[str] = None, if_exists: str = "append", index: bool = False) -> None:
        """
        Carga genérica de datos en una hoja Excel.
        
        Método de propósito general para cargar cualquier DataFrame en Excel
        sin validaciones específicas de dimensiones o hechos.
        
        Parámetros:
        -----------
        dataframe : DataFrame
            Datos a cargar en la hoja Excel
        sheet_name : str, default "Transformacion"
            Nombre de la hoja destino
        path : str, opcional
            Ruta del archivo Excel
        if_exists : str, default "append"
            Comportamiento si la hoja existe
        index : bool, default False
            Si se incluye el índice del DataFrame
            
        Lanza:
        ------
        Exception
            Si ocurre error durante la carga de datos
        """
        try:
            file_path = self._get_path(path)
            mode = 'a' if if_exists == "append" else 'w'
            
            with pd.ExcelWriter(file_path, engine='openpyxl', mode=mode, if_sheet_exists='replace') as writer:
                dataframe.to_excel(writer, sheet_name=sheet_name, index=index)
            print(f"✅ Datos cargados exitosamente en la hoja '{sheet_name}'.")
        except Exception as e:
            print(f"❌ Error al cargar datos en Excel: {e}")
            raise
    
    def get_sheet_names(self, path: Optional[str] = None) -> List[str]:
        """
        Obtiene la lista de hojas en el archivo Excel.
        
        Útil para verificar la existencia de hojas antes de operaciones
        o para inspeccionar la estructura del archivo.
        
        Parámetros:
        -----------
        path : str, opcional
            Ruta del archivo Excel
            
        Retorna:
        --------
        list
            Lista de nombres de hojas en el archivo Excel
            
        Lanza:
        ------
        Exception
            - Si el archivo no existe
            - Si el archivo está corrupto
            - Si no se tienen permisos de lectura
        """
        try:
            file_path = self._get_path(path)
            with pd.ExcelFile(file_path) as xls:
                return xls.sheet_names
        except Exception as e:
            print(f"❌ Error al obtener hojas del archivo Excel: {e}")
            raise

    def read_sheet(self, sheet_name: str, path: Optional[str] = None, 
                  header: int = 0, usecols: Optional[List] = None) -> pd.DataFrame:
        """
        Lee una hoja específica del archivo Excel.
        
        Parámetros:
        -----------
        sheet_name : str
            Nombre de la hoja a leer
        path : str, opcional
            Ruta del archivo Excel
        header : int, default 0
            Fila a usar como nombres de columnas (0-indexed)
        usecols : list, opcional
            Columnas específicas a leer (por índice o nombre)
            
        Retorna:
        --------
        DataFrame
            Datos de la hoja leída
            
        Lanza:
        ------
        Exception
            - Si la hoja no existe
            - Si hay errores de formato en el archivo
        """
        try:
            file_path = self._get_path(path)
            df = pd.read_excel(file_path, sheet_name=sheet_name, header=header, usecols=usecols)
            print(f"✅ Hoja '{sheet_name}' leída exitosamente.")
            return df
        except Exception as e:
            print(f"❌ Error al leer la hoja '{sheet_name}': {e}")
            raise

    def sheet_exists(self, sheet_name: str, path: Optional[str] = None) -> bool:
        """
        Verifica si una hoja existe en el archivo Excel.
        
        Parámetros:
        -----------
        sheet_name : str
            Nombre de la hoja a verificar
        path : str, opcional
            Ruta del archivo Excel
            
        Retorna:
        --------
        bool
            True si la hoja existe, False en caso contrario
        """
        try:
            sheet_names = self.get_sheet_names(path)
            return sheet_name in sheet_names
        except Exception:
            return False

    def get_sheet_info(self, path: Optional[str] = None) -> Dict[str, Dict]:
        """
        Obtiene información detallada de todas las hojas del archivo.
        
        Parámetros:
        -----------
        path : str, opcional
            Ruta del archivo Excel
            
        Retorna:
        --------
        dict
            Diccionario con información de cada hoja:
            {
                'sheet_name': {
                    'rows': int,
                    'columns': int,
                    'column_names': list
                }
            }
        """
        try:
            file_path = self._get_path(path)
            sheet_info = {}
            
            with pd.ExcelFile(file_path) as xls:
                for sheet_name in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet_name)
                    sheet_info[sheet_name] = {
                        'rows': len(df),
                        'columns': len(df.columns),
                        'column_names': df.columns.tolist()
                    }
            
            return sheet_info
        except Exception as e:
            print(f"❌ Error al obtener información de hojas: {e}")
            raise

    def duplicate_sheet(self, source_sheet: str, target_sheet: str, 
                       path: Optional[str] = None) -> None:
        """
        Duplica una hoja en el mismo archivo Excel.
        
        Parámetros:
        -----------
        source_sheet : str
            Nombre de la hoja origen
        target_sheet : str
            Nombre de la hoja destino
        path : str, opcional
            Ruta del archivo Excel
            
        Lanza:
        ------
        Exception
            - Si la hoja origen no existe
            - Si la hoja destino ya existe
        """
        try:
            file_path = self._get_path(path)
            
            # Leer hoja origen
            df = self.read_sheet(source_sheet, path)
            
            # Escribir hoja destino
            self.load_data(df, target_sheet, path, if_exists="replace")
            
            print(f"✅ Hoja '{source_sheet}' duplicada como '{target_sheet}'.")
        except Exception as e:
            print(f"❌ Error al duplicar hoja: {e}")
            raise