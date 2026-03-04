from sqlalchemy import create_engine, text, inspect
import pandas as pd
from typing import Optional, List, Dict, Any

class DB_Extractor:
    """
    Clase para extracción de datos desde diferentes motores de bases de datos.
    
    Soporta MySQL, PostgreSQL y Oracle con funcionalidades para conexión,
    ejecución de consultas y extracción de datos en DataFrames de pandas.
    
    Características principales:
    - Conexión unificada a múltiples motores de BD
    - Ejecución de consultas SQL personalizadas
    - Extracción de tablas completas
    - Gestión automática de conexiones
    - Soporte para parámetros específicos de cada motor
    """
    
    def __init__(self, db_type: str, password: str, database: str, host: str = "localhost", 
                 user: str = "root", port: Optional[int] = None, service_name: Optional[str] = None):
        """
        Inicializa el extractor de base de datos con parámetros de conexión.
        
        Parámetros:
        -----------
        db_type : str
            Tipo de base de datos: 'mysql', 'postgresql' o 'oracle'
        password : str
            Contraseña para la autenticación
        database : str
            Nombre de la base de datos
        host : str, default "localhost"
            Host del servidor de base de datos
        user : str, default "root"
            Usuario para la autenticación
        port : int, opcional
            Puerto de conexión. Si es None, usa el puerto por defecto del motor
        service_name : str, opcional
            Service name para Oracle (requerido para conexiones Oracle)
            
        Lanza:
        ------
        ValueError
            - Si el tipo de base de datos no es soportado
            - Si falta service_name para Oracle
        """
        self.db_type = db_type.lower()
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.service_name = service_name
        self.port = port or self._default_port()
        self.engine = None 

    def _default_port(self) -> int:
        """
        Devuelve el puerto por defecto según el tipo de base de datos.
        
        Retorna:
        --------
        int
            Puerto por defecto para el motor de base de datos
            
        Lanza:
        ------
        ValueError
            Si el tipo de base de datos no es soportado
        """
        if self.db_type == "mysql":
            return 3306
        elif self.db_type == "postgresql":
            return 5432
        elif self.db_type == "oracle":
            return 1521
        else:
            raise ValueError("Tipo de base de datos no soportado.")

    def connect(self) -> None:
        """
        Establece conexión con la base de datos usando SQLAlchemy.
        
        Configura el engine de conexión según el tipo de base de datos
        y valida que la conexión sea exitosa.
        
        Lanza:
        ------
        ValueError
            - Si falta service_name para Oracle
            - Si el tipo de BD no es soportado
        Exception
            - Si falla la conexión (credenciales incorrectas, servidor no disponible, etc.)
        """
        try:
            if self.db_type == "mysql":  
                self.engine = create_engine(
                    f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
                )
            elif self.db_type == "postgresql":
                self.engine = create_engine(
                    f"postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}",
                    connect_args={'client_encoding': 'latin1'}
                )
            elif self.db_type == "oracle":
                if not self.service_name:
                    raise ValueError("Debe proporcionar 'service_name' para Oracle.")
                
                dsn = f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={self.host})(PORT={self.port}))(CONNECT_DATA=(SERVICE_NAME={self.service_name})))"
                self.engine = create_engine(f"oracle+oracledb://{self.user}:{self.password}@{dsn}")
            else:
                raise ValueError("Tipo de base de datos no soportado. Usa 'mysql', 'postgresql' o 'oracle'.")

            # Validar conexión ejecutando una consulta simple
            with self.engine.connect():
                print(f"✅ Conexión exitosa a {self.db_type.upper()} en la base de datos '{self.database}'.")
        except Exception as e:
            print(f"❌ Error al conectar a la base de datos: {e}")
            raise

    def close_connection(self) -> None:
        """
        Cierra la conexión a la base de datos y libera recursos.
        
        Dispose el engine de SQLAlchemy para liberar conexiones
        y recursos del pool de conexiones.
        """
        if self.engine:
            self.engine.dispose()
            print("🔒 Conexión cerrada.")

    def execute_query(self, query: str) -> pd.DataFrame:
        """
        Ejecuta una consulta SQL y devuelve los resultados como DataFrame.
        
        Parámetros:
        -----------
        query : str
            Consulta SQL a ejecutar (SELECT, WITH, etc.)
            
        Retorna:
        --------
        DataFrame
            Resultados de la consulta en formato DataFrame
            
        Lanza:
        ------
        ValueError
            Si no hay conexión activa
        Exception
            - Si la consulta SQL es inválida
            - Si hay errores de permisos
            - Si la consulta timeout             
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a `connect()` primero.")

            with self.engine.connect() as connection:
                df = pd.read_sql_query(text(query), connection)
            
            print(f"✅ Consulta ejecutada con éxito. Resultados: {len(df)} registros.")
            return df
        except Exception as e:
            print(f"❌ Error al ejecutar la consulta SQL: {e}")
            raise

    def get_table(self, table_name: str) -> pd.DataFrame:
        """
        Extrae una tabla completa de la base de datos.
        
        Parámetros:
        -----------
        table_name : str
            Nombre de la tabla a extraer
            
        Retorna:
        --------
        DataFrame
            Contenido completo de la tabla
            
        Lanza:
        ------
        ValueError
            Si no hay conexión activa
        Exception
            - Si la tabla no existe
            - Si hay errores de permisos
            
        Ejemplos:
        ---------
        >>> df_usuarios = extractor.get_table("usuarios")
        >>> df_ventas = extractor.get_table("ventas_2024")
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a connect() primero.")
            df = pd.read_sql_table(table_name, con=self.engine)
            print(f"✅ Tabla '{table_name}' extraída con éxito. Registros: {len(df)}.")
            return df
        except Exception as e:
            print(f"❌ Error al extraer la tabla '{table_name}': {e}")
            raise

    # NUEVAS FUNCIONES ADICIONALES

    def get_table_names(self) -> List[str]:
        """
        Obtiene la lista de todas las tablas en la base de datos.
        
        Retorna:
        --------
        List[str]
            Lista de nombres de tablas disponibles
            
        Lanza:
        ------
        ValueError
            Si no hay conexión activa
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a `connect()` primero.")
            
            inspector = inspect(self.engine)
            table_names = inspector.get_table_names()
            print(f"📊 Tablas encontradas: {len(table_names)}")
            return table_names
        except Exception as e:
            print(f"❌ Error al obtener nombres de tablas: {e}")
            raise

    def get_table_schema(self, table_name: str) -> Dict[str, Any]:
        """
        Obtiene el esquema (columnas y tipos) de una tabla específica.
        
        Parámetros:
        -----------
        table_name : str
            Nombre de la tabla a analizar
            
        Retorna:
        --------
        Dict[str, Any]
            Diccionario con información del esquema:
            {
                'columns': [lista de nombres de columnas],
                'types': [lista de tipos de datos],
                'primary_keys': [lista de claves primarias],
                'foreign_keys': [información de claves foráneas]
            }
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a `connect()` primero.")
            
            inspector = inspect(self.engine)
            columns = inspector.get_columns(table_name)
            primary_keys = inspector.get_pk_constraint(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)
            
            schema = {
                'columns': [col['name'] for col in columns],
                'types': [col['type'] for col in columns],
                'primary_keys': primary_keys.get('constrained_columns', []),
                'foreign_keys': foreign_keys
            }
            
            print(f"📋 Esquema de '{table_name}': {len(schema['columns'])} columnas")
            return schema
        except Exception as e:
            print(f"❌ Error al obtener esquema de '{table_name}': {e}")
            raise

    def get_database_info(self) -> Dict[str, Any]:
        """
        Obtiene información general de la base de datos.
        
        Retorna:
        --------
        Dict[str, Any]
            Información de la base de datos:
            {
                'database_name': str,
                'tables_count': int,
                'db_type': str,
                'host': str,
                'port': int
            }
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a `connect()` primero.")
            
            tables = self.get_table_names()
            
            info = {
                'database_name': self.database,
                'tables_count': len(tables),
                'db_type': self.db_type.upper(),
                'host': self.host,
                'port': self.port,
                'tables': tables
            }
            
            print(f"🏢 Información de BD: {self.database} ({self.db_type.upper()})")
            print(f"   📁 Tablas: {len(tables)}")
            print(f"   🌐 Host: {self.host}:{self.port}")
            
            return info
        except Exception as e:
            print(f"❌ Error al obtener información de la BD: {e}")
            raise

    def execute_procedure(self, procedure_name: str, params: Optional[Dict] = None) -> pd.DataFrame:
        """
        Ejecuta un stored procedure y devuelve los resultados.
        
        Parámetros:
        -----------
        procedure_name : str
            Nombre del stored procedure
        params : Dict, opcional
            Parámetros para el procedure {nombre_parametro: valor}
            
        Retorna:
        --------
        DataFrame
            Resultados del procedure
        """
        try:
            if self.engine is None:
                raise ValueError("No hay conexión activa. Llame a `connect()` primero.")
            
            # Construir llamada al procedure según el motor
            if self.db_type == "mysql":
                call = f"CALL {procedure_name}({', '.join(['%s'] * len(params)) if params else ''})"
            elif self.db_type == "postgresql":
                param_placeholders = ", ".join([f":{key}" for key in params.keys()]) if params else ""
                call = f"CALL {procedure_name}({param_placeholders})"
            else:
                call = f"BEGIN {procedure_name}; END;"
            
            with self.engine.connect() as connection:
                if params:
                    result = connection.execute(text(call), params)
                else:
                    result = connection.execute(text(call))
                
                # Si el procedure devuelve resultados
                if result.returns_rows:
                    df = pd.DataFrame(result.fetchall(), columns=result.keys())
                    print(f"✅ Procedure '{procedure_name}' ejecutado. Resultados: {len(df)} registros.")
                    return df
                else:
                    print(f"✅ Procedure '{procedure_name}' ejecutado exitosamente.")
                    return pd.DataFrame()
                    
        except Exception as e:
            print(f"❌ Error al ejecutar procedure '{procedure_name}': {e}")
            raise

    def sample_data(self, table_name: str, n: int = 5) -> pd.DataFrame:
        """
        Obtiene una muestra de datos de una tabla.
        
        Parámetros:
        -----------
        table_name : str
            Nombre de la tabla
        n : int, default 5
            Número de registros a muestrear
            
        Retorna:
        --------
        DataFrame
            Muestra de datos de la tabla
        """
        try:
            query = f"SELECT * FROM {table_name} LIMIT {n}"
            if self.db_type == "oracle":
                query = f"SELECT * FROM {table_name} WHERE ROWNUM <= {n}"
            elif self.db_type == "postgresql":
                query = f"SELECT * FROM {table_name} LIMIT {n}"
                
            return self.execute_query(query)
        except Exception as e:
            print(f"❌ Error al obtener muestra de '{table_name}': {e}")
            raise

    def check_connection_status(self) -> bool:
        """
        Verifica el estado actual de la conexión.
        
        Retorna:
        --------
        bool
            True si la conexión está activa, False en caso contrario
        """
        try:
            if self.engine is None:
                return False
            
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    def __enter__(self):
        """Soporte para context manager (with statement)."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Cierra conexión automáticamente al salir del context manager."""
        self.close_connection()