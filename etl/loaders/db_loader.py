import pandas as pd
import sqlalchemy as sqlch
from tabulate import tabulate


class DB_Loader:
    """
    Clase para cargar datos en bases de datos con funcionalidades específicas
    para tablas de dimensión y hechos, incluyendo validaciones.
    """
    
    def __init__(self, engine=None):
        """
        Inicializa el DB_Loader con un engine de base de datos.
        
        Parámetros:
        -----------
        engine : sqlalchemy.engine, opcional
            Engine de conexión a la base de datos. Si es None, se deberá pasar
            en cada método que lo requiera.
        """
        self.engine = engine
        if self.engine is None:
            print("⚠️ Advertencia: No se ha proporcionado un engine en el constructor. Deberás pasarlo a los métodos.")

    def _get_engine(self, engine):
        """
        Método interno para obtener el engine de conexión.
        
        Parámetros:
        -----------
        engine : sqlalchemy.engine
            Engine proporcionado al método
            
        Retorna:
        --------
        sqlalchemy.engine
            Engine válido para conexión a BD
            
        Lanza:
        ------
        ValueError
            Si no se encuentra un engine válido
        """
        if engine is not None:
            return engine
        elif self.engine is not None:
            return self.engine
        else:
            raise ValueError("❌ No se ha proporcionado un engine de base de datos.")

    def load_dimension(self, dfs, table_names, if_exists="replace", index=False, engine=None):
        """
        Carga una o varias tablas de dimensión en la base de datos.
        
        Por defecto reemplaza la tabla completa (comportamiento típico para dimensiones).
        Soporta carga múltiple de dimensiones en una sola llamada.
        
        Parámetros:
        -----------
        dfs : DataFrame o lista de DataFrames
            Datos a cargar en las tablas de dimensión
        table_names : str o lista de str
            Nombre(s) de la(s) tabla(s) de dimensión
        if_exists : str, default "replace"
            Comportamiento si la tabla existe:
            - 'fail': lanza error
            - 'replace': reemplaza la tabla existente
            - 'append': agrega datos a la tabla existente
        index : bool, default False
            Si se incluye el índice del DataFrame en la tabla
        engine : sqlalchemy.engine, opcional
            Conexión a la base de datos. Si es None, usa el engine de la instancia.
            
        Lanza:
        ------
        ValueError
            - Si la cantidad de DataFrames y nombres no coincide
            - Si ocurre error durante la carga
        """
        try:
            eng = self._get_engine(engine)
            db_backend = eng.url.get_backend_name()
            
            # Si es solo un DataFrame y un nombre, lo convierte en listas
            if isinstance(dfs, pd.DataFrame):
                dfs = [dfs]
            if isinstance(table_names, str):
                table_names = [table_names]
                
            # Validación de consistencia entre datos y nombres
            if len(dfs) != len(table_names):
                raise ValueError("La cantidad de DataFrames y nombres de tabla debe coincidir.")
                
            # Carga cada dimensión en la base de datos
            for df, table_name in zip(dfs, table_names):
                df.to_sql(name=table_name, con=eng, if_exists=if_exists, index=index)
                print(f"✅ Dimensión '{table_name}' cargada exitosamente en la base de datos '{db_backend} (modo: {if_exists}).")
                
        except Exception as e:
            print(f"❌ Error al cargar dimensión: {e}")
            raise

    def load_fact(self, df, table_name, foreign_keys_map=None, if_exists="append", index=False, engine=None, dtype=None, validate_foreign_keys=True):
        """
        Carga una tabla de hechos con validación de claves foráneas.
        
        Convierte claves foráneas y primarias a string para evitar errores de tipo.
        Incluye validaciones específicas para diferentes motores de base de datos.
        
        Parámetros:
        -----------
        df : DataFrame
            Datos de la tabla de hechos a cargar
        table_name : str
            Nombre de la tabla de hechos
        foreign_keys_map : dict, opcional
            Mapeo de claves foráneas: {columna_fk: (tabla_dimension, columna_pk)}
        if_exists : str, default "append"
            Comportamiento si la tabla existe ('fail', 'replace', 'append')
        index : bool, default False
            Si se incluye el índice del DataFrame
        engine : sqlalchemy.engine, opcional
            Conexión a la base de datos
        dtype : dict, opcional
            Especificación de tipos de datos para columnas
        validate_foreign_keys : bool, default True
            Si validar las claves foráneas antes de la carga
            
        Lanza:
        ------
        ValueError
            - Si columnas de FK no existen en el DataFrame
            - Si hay valores de FK que no existen en las dimensiones
            - Si el motor de BD no es soportado para validación
        """
        try:
            eng = self._get_engine(engine)
            db_backend = eng.url.get_backend_name()

            # Limitar columnas de texto a 4000 caracteres si el motor es Oracle
            if db_backend == "oracle":
                for col in df.select_dtypes(include=['object']).columns:
                    df[col] = df[col].astype(str).str.slice(0, 4000)
                if dtype is None:
                    dtype = {col: sqlch.types.VARCHAR(4000) 
                            for col in df.select_dtypes(include=['object']).columns}

            # Validación de claves foráneas si se proporciona el mapeo
            if foreign_keys_map and validate_foreign_keys:
                # Verificar que las columnas FK existen en el DataFrame
                missing_in_fact = [fk for fk in foreign_keys_map.keys() if fk not in df.columns]
                if missing_in_fact:
                    raise ValueError(f"🚫 Columnas no encontradas en tabla de hechos: {missing_in_fact}")

                # Validar cada clave foránea contra su dimensión correspondiente
                with eng.connect() as conn:
                    for fk_col, (dim_table, dim_pk) in foreign_keys_map.items():
                        # Convierte claves foráneas a string para comparación consistente
                        df[fk_col] = df[fk_col].astype(str)
                        unique_values = df[fk_col].unique()
                        
                        if len(unique_values) > 0:
                            # Consultas específicas por motor de base de datos
                            if db_backend == "postgresql":
                                query = f"SELECT {dim_pk} FROM {dim_table} WHERE {dim_pk} = ANY(%(values)s)"
                                result = pd.read_sql(query, conn, params={"values": list(unique_values)})
                            elif db_backend == "oracle":
                                values_str = ",".join([f"'{str(v)}'" for v in unique_values])
                                query = f"SELECT {dim_pk} FROM {dim_table} WHERE TO_CHAR({dim_pk}) IN ({values_str})"
                                result = pd.read_sql(query, conn)
                            elif db_backend == "mysql":
                                values_str = ",".join([f"'{str(v)}'" for v in unique_values])
                                query = f"SELECT {dim_pk} FROM {dim_table} WHERE {dim_pk} IN ({values_str})"
                                result = pd.read_sql(query, conn)
                            else:
                                raise ValueError("Validación de claves foráneas solo soportada para PostgreSQL y Oracle.")
                            
                            # Verificar valores faltantes en la dimensión
                            result_ids = set(result[dim_pk].astype(str).unique())
                            missing_values = set([str(v) for v in unique_values]) - result_ids
                            if missing_values:
                                raise ValueError(
                                    f"🚫 Valores no encontrados en dimensión {dim_table}.{dim_pk}: "
                                    f"{missing_values} (para la columna {fk_col})"
                                )

            # Cargar los datos en la tabla de hechos
            df.to_sql(name=table_name, con=eng, if_exists=if_exists, index=index, dtype=dtype)
            print(f"✅ Hechos cargados exitosamente en la tabla '{table_name}' (modo: {if_exists}).")

        except Exception as e:
            print(f"❌ Error al cargar hechos '{table_name}': {e}")
            raise

    def truncate_table(self, table_name, engine=None):
        """
        Vacía completamente una tabla antes de la carga.
        
        Útil para limpieza de tablas existentes antes de cargar nuevos datos.
        
        Parámetros:
        -----------
        table_name : str
            Nombre de la tabla a truncar
        engine : sqlalchemy.engine, opcional
            Conexión a la base de datos
            
        Lanza:
        ------
        Exception
            Si ocurre error durante el truncado
        """
        try:
            eng = self._get_engine(engine)
            with eng.connect() as conn:
                conn.execute(f"TRUNCATE TABLE {table_name}")
            print(f"🧹 Tabla '{table_name}' truncada exitosamente.")
        except Exception as e:
            print(f"❌ Error al truncar la tabla '{table_name}': {e}")
            raise

    def load_data(self, dataframe, table_name="Transformacion", if_exists="append", index=False, engine=None):
        """
        Carga genérica de datos en cualquier tabla.
        
        Método simple para carga de datos sin validaciones específicas.
        
        Parámetros:
        -----------
        dataframe : DataFrame
            Datos a cargar
        table_name : str, default "Transformacion"
            Nombre de la tabla destino
        if_exists : str, default "append"
            Comportamiento si la tabla existe
        index : bool, default False
            Si se incluye el índice del DataFrame
        engine : sqlalchemy.engine, opcional
            Conexión a la base de datos
            
        Lanza:
        ------
        Exception
            Si ocurre error durante la carga
        """
        try:
            eng = self._get_engine(engine)
            dataframe.to_sql(name=table_name, con=eng, if_exists=if_exists, index=index)
            print(f"✅ Datos cargados exitosamente en la tabla '{table_name}'.")
        except Exception as e:
            print(f"❌ Error al cargar datos: {e}")
            raise

    def check_connection(self, engine=None):
        """
        Verifica que la conexión a la base de datos esté activa.
        
        Realiza una consulta simple (SELECT 1) para validar la conexión.
        
        Parámetros:
        -----------
        engine : sqlalchemy.engine, opcional
            Conexión a la base de datos a verificar
            
        Lanza:
        ------
        Exception
            Si la conexión no es válida o hay error de conexión
        """
        eng = self._get_engine(engine)
        try:
            with eng.connect() as conn:
                conn.execute(sqlch.text("SELECT 1"))
            print("✅ Conexión a base de datos verificada.")
        except Exception as e:
            print(f"❌ Error al verificar conexión: {e}")


    def verify_table_load(self, table_name, engine=None, show_sample=5):
        eng = self._get_engine(engine)

        with eng.connect() as conn:
            # Verificar existencia (PostgreSQL)
            exists_query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '{table_name}'
            );
            """
            exists = pd.read_sql(exists_query, conn).iloc[0, 0]

            if not exists:
                print(f"❌ La tabla '{table_name}' no existe.")
                return

            # Total registros
            total = pd.read_sql(
                f"SELECT COUNT(*) AS total FROM {table_name}", conn
            )["total"][0]

            # Muestra
            sample_df = pd.read_sql(
                f"SELECT * FROM {table_name} LIMIT {show_sample}", conn
            )

        resumen = pd.DataFrame({
            "Tabla": [table_name],
            "Total Registros": [total]
        })

        print("\n📊 VERIFICACIÓN ETL")
        print(tabulate(resumen, headers="keys", tablefmt="fancy_grid", showindex=False))
        print("\n🔎 Muestra:")
        print(tabulate(sample_df, headers="keys", tablefmt="fancy_grid", showindex=False))
        print()
