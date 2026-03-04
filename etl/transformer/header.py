import pandas as pd
from tabulate import tabulate

class HeaderOperations:
    """
    Clase que proporciona operaciones especializadas para manipular encabezados de DataFrames.
    Incluye métodos para visualizar, renombrar, modificar y eliminar columnas.
    """
    
    @staticmethod
    def head(df, n=5, print_result=True):
        """
        Muestra las primeras n filas del DataFrame incluyendo los encabezados de columnas.
        
        Args:
            df: DataFrame de pandas a visualizar
            n: Número de filas a mostrar (por defecto 5)
            print_result: Si es True, imprime el resultado; si es False, solo lo retorna
        
        Returns:
            String con la representación tabular de las primeras n filas incluyendo encabezados
        """
        try:
            df_head = df.head(n)
            result = tabulate(df_head, headers="keys", tablefmt="fancy_grid", showindex=False)
            return result
        except Exception as e:
            print(f"Error al obtener las primeras {n} filas: {e}")
            raise
    
    @staticmethod
    def replace_all_headers(df, new_headers, show=0): 
        """
        Reemplaza completamente todos los nombres de columnas del DataFrame con una nueva lista.
        
        Args:
            df: DataFrame de pandas
            new_headers: Lista con los nuevos nombres para todas las columnas
            show: Número de filas a mostrar después del cambio (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con los nuevos nombres de columnas asignados
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if not isinstance(new_headers, list):
                raise TypeError("new_headers debe ser una lista de nombres de columnas")
            if len(new_headers) != len(df.columns):
                raise ValueError("La cantidad de nuevos nombres debe coincidir con el número de columnas del DataFrame")
            
            df.columns = new_headers  # Cambia los nombres de las columnas

            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:
                print(HeaderOperations.head(df, len(df)))

            return df
        except Exception as e:
            print(f"Error al reemplazar el encabezado: {e}")
            raise

    @staticmethod
    def rename_columns(df, *args, show=0, **kwargs): 
        """
        Renombra columnas específicas del DataFrame usando diferentes métodos.
        
        Soporta dos formas de uso:
        1. Con diccionario: rename_columns(df, {'viejo_nombre': 'nuevo_nombre'})
        2. Con argumentos keyword: rename_columns(df, viejo_nombre='nuevo_nombre')
        
        Args:
            df: DataFrame de pandas
            *args: Puede contener un diccionario con mapeo de renombrado
            show: Número de filas a mostrar después del cambio (0: no mostrar, >0: n filas, -1: todas)
            **kwargs: Pares clave-valor para renombrar columnas (clave: nombre viejo, valor: nombre nuevo)
        
        Returns:
            DataFrame con las columnas especificadas renombradas
        """
        try:
            # Si pasamos un diccionario de renombrado, usamos el método rename de pandas
            if args and isinstance(args[0], dict):
                df = df.rename(columns=args[0])
            else:
                # Si se pasan argumentos individuales, renombramos una sola columna
                for old_name, new_name in kwargs.items():
                    df = df.rename(columns={old_name: new_name})

            # Si se solicita mostrar la tabla, usamos el método head de esta clase
            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:  # Si show es -1, mostramos todo el DataFrame
                print(HeaderOperations.head(df, len(df)))

            return df  # Retornar el DataFrame para seguir trabajando con él
        except Exception as e:
            print(f"Error al renombrar columnas: {e}")
            raise

    @staticmethod
    def drop_header(df, columns_to_drop, show=0):
        """
        Elimina una o más columnas del DataFrame basado en sus nombres.
        
        Args:
            df: DataFrame de pandas
            columns_to_drop: Nombre individual (string) o lista de nombres de columnas a eliminar
            show: Número de filas a mostrar después de la eliminación (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con las columnas especificadas eliminadas
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            
            if isinstance(columns_to_drop, str):  # Si se pasa un solo nombre como string, convertirlo en lista
                columns_to_drop = [columns_to_drop]
            
            if not isinstance(columns_to_drop, list):
                raise TypeError("columns_to_drop debe ser un string o una lista de nombres de columnas")

            df = df.drop(columns=columns_to_drop, errors='ignore')  # Elimina las columnas sin error si no existen

            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:
                print(HeaderOperations.head(df, len(df)))

            return df  # Retorna el DataFrame modificado

        except Exception as e:
            print(f"Error al eliminar columnas: {e}")
            raise

    @staticmethod
    def prefix_header(df, prefix, show=0):
        """
        Agrega un prefijo a todos los nombres de columnas del DataFrame.
        
        Args:
            df: DataFrame de pandas
            prefix: Prefijo a agregar a todos los nombres de columnas
            show: Número de filas a mostrar después del cambio (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con prefijos agregados a todos los nombres de columnas
        """
        try:
            df = df.add_prefix(prefix)
            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:
                print(HeaderOperations.head(df, len(df)))
            return df
        except Exception as e:
            print(f"Error al agregar prefijo a los encabezados: {e}")
            raise

    @staticmethod
    def suffix_header(df, suffix, show=0):
        """
        Agrega un sufijo a todos los nombres de columnas del DataFrame.
        
        Args:
            df: DataFrame de pandas
            suffix: Sufijo a agregar a todos los nombres de columnas
            show: Número de filas a mostrar después del cambio (0: no mostrar, >0: n filas, -1: todas)
        
        Returns:
            DataFrame con sufijos agregados a todos los nombres de columnas
        """
        try:
            df = df.add_suffix(suffix)
            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:
                print(HeaderOperations.head(df, len(df)))
            return df
        except Exception as e:
            print(f"Error al agregar sufijo a los encabezados: {e}")
            raise

    @staticmethod
    def get_column_names(df, print_result=True):
        """
        Muestra todos los nombres de columnas de un DataFrame.
        
        Args:
            df: DataFrame de pandas
            print_result: Si es True, imprime el resultado; si es False, solo lo retorna
        
        Returns:
            Lista con los nombres de todas las columnas
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            
            column_names = df.columns.tolist()
            
            if print_result:
                print(f"📋 COLUMNAS DISPONIBLES ({len(column_names)} columnas):")
                for i, col in enumerate(column_names, 1):
                    print(f"  {i}. {col}")
            
            return column_names
            
        except Exception as e:
            error_msg = f"Error al obtener nombres de columnas: {e}"
            if print_result:
                print(error_msg)
            return []

  
    
    @staticmethod
    def add_sequential_index(df, column_name="index", start=1, show=0):
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")

            df[column_name] = range(start, start + len(df))

            if show > 0:
                print(HeaderOperations.head(df, show))
            elif show == -1:
                print(HeaderOperations.head(df, len(df)))

            return df

        except Exception as e:
            print(f"Error al agregar índice secuencial: {e}")
            raise
