import pandas as pd
from tabulate import tabulate
from functools import wraps

def validate_params(df_type=False, columns_type=False, lambda_type=False, n_type=False):
    """
    Decorador para validar parámetros en las funciones de transformación de DataFrames.
    
    Args:
        df_type: Valida si el primer argumento es un DataFrame
        columns_type: Valida si el segundo argumento es string, lista, diccionario o None
        lambda_type: Valida si el argumento es una función callable o string
        n_type: Valida si el último argumento es un entero
    
    Returns:
        Función decorada con validación de parámetros
    """
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                if df_type:
                    try:
                        if not isinstance(args[0], pd.DataFrame):
                            raise TypeError("El primer argumento debe ser un DataFrame de pandas")
                    except IndexError:
                        raise ValueError("Falta el argumento del DataFrame")

                if columns_type:
                    try:
                        if not isinstance(args[1], (str, list, dict, type(None))):
                            raise TypeError("El segundo argumento debe ser un string, lista, diccionario o None")
                    except IndexError:
                        pass  

                if lambda_type:
                    try:
                        if not (callable(args[2]) or isinstance(args[2], str) or callable(args[1]) or isinstance(args[1], str)):
                            raise TypeError("El argumento debe ser una función lambda válida o un string")
                    except IndexError:
                        pass  

                if n_type:
                    try:
                        if not (isinstance(args[3], int) or isinstance(args[2], int)):
                            raise ValueError("El ultimo argumento debe ser un entero")
                    except IndexError:
                        pass  

                return func(*args, **kwargs)
            except Exception as e:
                raise ValueError(f"Error en la validación de parámetros: {e}")

        return wrapper
    return decorator

class BasicsTransformOperations:
    """
    Clase que proporciona operaciones básicas de transformación para DataFrames de pandas.
    Incluye métodos para visualización, manipulación y transformación de datos.
    """

    @staticmethod
    def show_head(df, n=5, print_result=True):
        """
        Muestra las primeras n filas del DataFrame en formato tabular.
        
        Args:
            df: DataFrame de pandas a visualizar
            n: Número de filas a mostrar (por defecto 5)
            print_result: Si es True, imprime el resultado; si es False, solo lo retorna
        
        Returns:
            String con la representación tabular de las primeras n filas
        """
        try:
            df_head = df.head(n)
            result = tabulate(df_head, headers="keys", tablefmt="fancy_grid", showindex=False)
            return result
            
            
        except Exception as e:
            print(f"Error al obtener las primeras {n} filas: {e}")
            raise

    @staticmethod
    def show_tail(df, n=5, print_result=False):
        """
        Muestra las últimas n filas del DataFrame en formato tabular.
        
        Args:
            df: DataFrame de pandas a visualizar
            n: Número de filas a mostrar (por defecto 5)
            print_result: Si es True, imprime el resultado; si es False, solo lo retorna
        
        Returns:
            String con la representación tabular de las últimas n filas
        """
        try:
            df_head = df.tail(n)
            result = tabulate(df_head, headers="keys", tablefmt="fancy_grid", showindex=False)
            if print_result:
                print(result)
            return result
        except Exception as e:
            print(f"Error al obtener las últimas {n} filas: {e}")
            raise
    

    @staticmethod
    @validate_params(df_type=True, columns_type=True, lambda_type=True, n_type=True)
    def add_new_column(df, new_column_name, lambda_func, show=0):
        """
        Agrega una nueva columna al DataFrame aplicando una función lambda a cada fila.
        
        Args:
            df: DataFrame de pandas
            new_column_name: Nombre de la nueva columna a crear
            lambda_func: Función lambda o callable que se aplica a cada fila
            show: Número de filas a mostrar después de la operación (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con la nueva columna agregada
        """
        try:
            if callable(lambda_func):
                df[new_column_name] = df.apply(lambda_func, axis=1)
            else:
                raise ValueError("lambda_func debe ser una función callable")
                
            if show > 0:
                print(BasicsTransformOperations.show_head(df, show))
            elif show == -1:
                print(BasicsTransformOperations.show_head(df, len(df)))
            return df
        except Exception as e:
            print(f"Error al agregar la columna: {e}")
            raise

    

    @staticmethod
    @validate_params(df_type=True, columns_type=True, n_type=True)
    def remove_columns(df, columns_to_drop, show=0, extra_param=None):
        """
        Elimina una o múltiples columnas especificadas del DataFrame.
        
        Args:
            df: DataFrame de pandas
            columns_to_drop: Columna única (string) o lista de columnas a eliminar
            show: Número de filas a mostrar después de la operación (0: no mostrar, >0: n filas, -1: todas)
            extra_param: Parámetro adicional no utilizado (mantenido por compatibilidad)
        
        Returns:
            DataFrame con las columnas especificadas eliminadas
        """
        try:
            result_df = df.drop(columns=columns_to_drop)
            if show > 0:
                print(BasicsTransformOperations.show_head(result_df, show))
            elif show == -1:
                print(BasicsTransformOperations.show_head(result_df, len(result_df)))
            return result_df
        except Exception as e:
            print(f"Error al eliminar las columnas: {e}")
            raise


    @staticmethod
    @validate_params(df_type=True, columns_type=True, n_type=True)
    def select_columns(df, *columns, show=0):
        """
        Selecciona y reordena columnas específicas del DataFrame.
        
        Args:
            df: DataFrame de pandas
            *columns: Nombres de las columnas a seleccionar (argumentos variables)
            show: Número de filas a mostrar después de la operación (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con solo las columnas especificadas en el orden indicado
        """
        try:
            result_df = df[list(columns)]
            if show > 0:
                print(BasicsTransformOperations.show_head(result_df, show))
            elif show == -1:
                print(BasicsTransformOperations.show_head(result_df, len(result_df)))
            return result_df
        except Exception as e:
            print(f"Error al seleccionar/reordenar columnas: {e}")
            raise

    @staticmethod
    @validate_params(df_type=True, columns_type=True, lambda_type=True, n_type=True)
    def transform_column(df, column, func, show=0):
        """
        Aplica una función a todos los elementos de una columna específica.
        
        Args:
            df: DataFrame de pandas
            column: Nombre de la columna a transformar
            func: Función callable o lambda que se aplica a cada elemento de la columna
            show: Número de filas a mostrar después de la operación (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con la columna especificada transformada
        """
        try:
            df[column] = df[column].apply(func)
            if show > 0:
                print(BasicsTransformOperations.show_head(df, show))
            elif show == -1:
                print(BasicsTransformOperations.show_head(df, len(df)))
            return df
        except Exception as e:
            print(f"Error al aplicar la función a la columna '{column}': {e}")
            raise

    @staticmethod
    @validate_params(df_type=True, lambda_type=True, n_type=True)
    def filter_by_condition(df, lambda_func, show=0):
        try:
            filtered_df = df[df.apply(lambda_func, axis=1)]
            if show > 0:
                print(BasicsTransformOperations.show_head(filtered_df, show))
            elif show == -1:
                print(BasicsTransformOperations.show_head(filtered_df, len(filtered_df)))
            return filtered_df
        except Exception as e:
            print(f"Error al filtrar las filas: {e}")
            raise


    @staticmethod
    @validate_params(df_type=True, columns_type=True, n_type=True)
    def normalize_delimited_column(df, columna, delimitador=',', mantener_original=True, show=0):
        """
        Proceso completo de normalización: convierte columna con delimitadores a lista y luego expande.
        
        Args:
            df: DataFrame original
            columna: Columna a normalizar (contiene valores separados por delimitador)
            delimitador: Caracter delimitador para separar los valores
            mantener_original: Si mantener columna original después del proceso completo
            show: Mostrar resultados intermedios en cada paso del proceso
        
        Returns:
            DataFrame completamente normalizado con una fila por cada valor originalmente separado
        """
        try:
            # Paso 1: Convertir a lista
            df_con_lista = BasicsTransformOperations.convert_column_to_list(
                df, columna, delimitador, show=show
            )
            
            # Paso 2: Hacer explode
            df_normalizado = BasicsTransformOperations.explode_column_list(
                df_con_lista, 
                f'{columna}_lista', 
                mantener_original=mantener_original,
                show=show
            )
            
            return df_normalizado
            
        except Exception as e:
            print(f"Error en normalización completa: {e}")
            raise


    @staticmethod
    def sort_columns(df, columns, ascending=True):
        """
        Ordena el DataFrame por una o múltiples columnas especificadas.
        
        Args:
            df: DataFrame de pandas
            columns: Columna única (string) o lista de columnas para ordenar
            ascending: Dirección del ordenamiento (True: ascendente, False: descendente)
        
        Returns:
            DataFrame ordenado por las columnas especificadas
        """
        try:
            # Verificar si la columna existe en el DataFrame
            if isinstance(columns, str):  # Si es un solo nombre de columna
                columns = [columns]  # Convertirlo en una lista
            
            missing_columns = [col for col in columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Las siguientes columnas no existen en el DataFrame: {missing_columns}")
            # Ordenar el DataFrame
            sorted_df = df.sort_values(by=columns, ascending=ascending)
            return sorted_df
        
        except Exception as e:
            print(f"Error al ordenar las filas: {e}")
            raise

    @staticmethod
    @validate_params(df_type=True, columns_type=True, n_type=True)
    def convert_column_to_list(df, columna, delimitador=';', nueva_columna=None, show=0):
        """
        Convierte una columna de strings delimitados en una columna de listas.

        :param df: DataFrame de entrada.
        :param columna: Nombre de la columna a transformar.
        :param delimitador: Carácter delimitador usado en el string (por defecto ';').
        :param nueva_columna: Nombre de la nueva columna. Si es None, la columna original se sobrescribe.
        :param show: Número de filas a mostrar (0 para no mostrar, -1 para todas).
        :return: DataFrame con la columna transformada.
        """
        try:
            if columna not in df.columns:
                raise ValueError(f"La columna '{columna}' no existe en el DataFrame")

            # Determinar el nombre de la columna de destino
            columna_destino = nueva_columna if nueva_columna is not None else columna

            # Crear una copia del DataFrame para evitar SettingWithCopyWarning
            df_copy = df.copy()

            # Convertir a string (para manejar posibles nulos o tipos numéricos) y luego aplicar split
            # Se usa .str.split(delimitador) para convertir el string delimitado en una lista
            df_copy[columna_destino] = df_copy[columna].astype(str).str.split(delimitador)

            # Mostrar resultados si está habilitado
            if show > 0:
                print(BasicsTransformOperations.show_head(df_copy, show))
                print("\n")
            elif show == -1:
                print(BasicsTransformOperations.show_head(df_copy, len(df_copy)))
                print("\n")

            return df_copy

        except Exception as e:
            print(f"Error en convert_column_to_list: {e}")
            return df


    @staticmethod
    @validate_params(df_type=True, columns_type=True, n_type=True)
    def explode_column_list(df, columna_lista, mantener_original=True, show=0):
        """
        Expande una columna que contiene listas en múltiples filas (operación explode).
        Cada elemento de la lista se convierte en una fila individual.
        
        Args:
            df: DataFrame con la columna de listas
            columna_lista: Nombre de la columna que contiene las listas
            mantener_original: No aplica ahora, siempre se reemplaza la columna original
            show: Mostrar resultados (0: no mostrar, >0: n filas, -1: todas las filas)
        
        Returns:
            DataFrame normalizado con una fila por cada elemento de las listas
        """
        try:
            if columna_lista not in df.columns:
                raise ValueError(f"La columna '{columna_lista}' no existe en el DataFrame")
            
            # Verificar que la columna contenga listas
            if not df[columna_lista].apply(lambda x: isinstance(x, list)).any():
                raise ValueError(f"La columna '{columna_lista}' no contiene listas válidas")
            
            # Crear copia para no modificar el original
            df_copy = df.copy()
            
            # Hacer explode de la columna de lista
            df_explode = df_copy.explode(columna_lista)
            
            # Limpiar los valores en la MISMA columna
            df_explode[columna_lista] = df_explode[columna_lista].astype(str).str.strip()
            
            # Mostrar resultados si está habilitado
            if show > 0:
                print(BasicsTransformOperations.show_head(df_explode, show))
                print("\n")
            elif show == -1:
                print(BasicsTransformOperations.show_head(df_explode, len(df_explode)))
                print("\n")
            
            return df_explode
            
        except Exception as e:
            print(f"Error al explotar columna lista: {e}")
            raise


    @staticmethod
    @validate_params(df_type=True, columns_type=True)
    def get_column_metrics(df, column):
        """
        Calcula métricas básicas (promedio, suma, conteo) de una columna numérica.
        
        Args:
            df: DataFrame de pandas
            column: Nombre de la columna numérica
            
        Returns:
            Tuple: (promedio, total, cantidad)
        """
        try:
            if column not in df.columns:
                raise ValueError(f"La columna '{column}' no existe en el DataFrame")
            
            # Aseguramos que los datos sean numéricos para evitar errores en el cálculo
            values = pd.to_numeric(df[column], errors='coerce')
            
            promedio = values.mean()
            total = values.sum()
            cantidad = len(df)
            
            return promedio, total, cantidad
        except Exception as e:
            print(f"Error al calcular métricas en la columna '{column}': {e}")
            raise

    @staticmethod
    def create_fact_dataframe(tipo_analisis, promedio, total, cantidad):
        """
        Crea un DataFrame de hechos formateado para reportes de análisis.
        
        Args:
            tipo_analisis: String descriptivo del análisis (ej: 'general', 'crónicos')
            promedio: Valor del promedio calculado
            total: Valor de la suma total
            cantidad: Conteo de registros/servicios
            
        Returns:
            pd.DataFrame de una sola fila con los resultados
        """
        try:
            df_fact = pd.DataFrame([{
                'tipo_analisis': tipo_analisis,
                'promedio_costo': promedio,
                'total_servicios': cantidad,
                'costo_total': total
            }])
            return df_fact
        except Exception as e:
            print(f"Error al crear el DataFrame de hechos: {e}")
            raise

    @staticmethod
    @validate_params(df_type=True, columns_type=True)
    def quick_summary_report(df, column, analysis_label="general"):
        """
        Método 'todo en uno' que calcula métricas y devuelve el DataFrame de hechos.
        """
        prom, tot, cant = BasicsTransformOperations.get_column_metrics(df, column)
        return BasicsTransformOperations.create_fact_dataframe(analysis_label, prom, tot, cant)