import pandas as pd
from tabulate import tabulate

class DataExpresion:
    """
    Clase para realizar operaciones de exploración y expresión de datos en DataFrames de pandas.
    Proporciona métodos estáticos para visualización, búsqueda y transformación de datos.
    """
    
    @staticmethod
    def head(df, n=5, print_result=True):
        """
        Devuelve o imprime las primeras n filas del DataFrame con formato tabular.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame del cual se obtendrán las primeras filas.
        n : int, opcional (default=5)
            Número de filas a mostrar.
        print_result : bool, opcional (default=True)
            Si es True, imprime el resultado. Si es False, solo lo retorna.
            
        Retorna:
        --------
        str
            Representación tabular de las primeras n filas.
            
        Ejemplo:
        --------
        >>> DataExpresion.head(df, n=3)
        ╒════╤══════════╤══════════╕
        │    │ Columna1 │ Columna2 │
        ╞════╪══════════╪══════════╡
        │  0 │ valor1   │ valorA   │
        ├────┼──────────┼──────────┤
        │  1 │ valor2   │ valorB   │
        ├────┼──────────┼──────────┤
        │  2 │ valor3   │ valorC   │
        ╘════╧══════════╧══════════╛
        """
        try:
            # Validar que n sea un entero positivo
            if not isinstance(n, int) or n < 1:
                raise ValueError("n debe ser un entero positivo")
                
            # Obtener las primeras n filas del DataFrame
            df_head = df.head(n)
            
            # Formatear el resultado como tabla
            result = tabulate(df_head, headers="keys", tablefmt="fancy_grid", showindex=False)
            
            # Imprimir el resultado si se solicita
            if print_result:
                print(result)
                
            return result
            
        except Exception as e:
            print(f"Error al obtener las primeras {n} filas: {e}")
            raise

    @staticmethod
    def search_in_column(df, field, pattern, show=0, complement=False, case_sensitive=False):
        """
        Busca filas donde el campo especificado contenga el patrón dado.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame en el que se realizará la búsqueda.
        field : str
            Nombre de la columna donde buscar.
        pattern : str
            Patrón de texto a buscar.
        show : int, opcional (default=0)
            Número de resultados a mostrar. Si es 0, no muestra nada.
            Si es -1, muestra todos los resultados.
        complement : bool, opcional (default=False)
            Si es True, devuelve las filas que NO contienen el patrón.
        case_sensitive : bool, opcional (default=False)
            Si es True, la búsqueda distingue entre mayúsculas y minúsculas.
            
        Retorna:
        --------
        pandas.DataFrame
            DataFrame con las filas que coinciden con el patrón de búsqueda.
            
        Ejemplo:
        --------
        >>> resultado = DataExpresion.search_in_column(df, 'nombre', 'juan', show=3)
        Buscando 'juan' en la columna 'nombre'...
        ╒════╤══════════╤══════════╕
        │    │ nombre   │ edad     │
        ╞════╪══════════╪══════════╡
        │  0 │ Juan     │ 25       │
        ├────┼──────────┼──────────┤
        │  1 │ Juanita  │ 30       │
        ╘════╧══════════╧══════════╛
        """
        try:
            # Validaciones de tipos de parámetros
            if not isinstance(field, str):
                raise TypeError("field debe ser un string")
            if not isinstance(pattern, str):
                raise TypeError("pattern debe ser un string")
            if not isinstance(complement, bool):
                raise TypeError("complement debe ser un booleano")
            if not isinstance(show, int) or show < -1:
                raise ValueError("show debe ser un entero mayor o igual a -1")
            if field not in df.columns:
                raise ValueError(f"La columna '{field}' no existe en el DataFrame")
                
            # Realizar la búsqueda (case insensitive por defecto)
            if case_sensitive:
                mask = df[field].astype(str).str.contains(pattern, na=False)
            else:
                mask = df[field].astype(str).str.contains(pattern, case=False, na=False)
            
            # Aplicar complemento si se solicita
            if complement:
                result = df[~mask]
                search_type = "EXCLUYENDO"
            else:
                result = df[mask]
                search_type = "INCLUYENDO"
                
            # Mostrar resultados si se solicita
            if show != 0:
                print(f"Buscando '{pattern}' en la columna '{field}' ({search_type} coincidencias)...")
                n_show = show if show > 0 else len(result)
                print(f"Encontradas {len(result)} coincidencias. Mostrando {min(n_show, len(result))}:")
                print(DataExpresion.head(result, n_show))
            
            return result
            
        except Exception as e:
            print(f"Error en search_in_column: {e}")
            raise

    @staticmethod
    def search_in_table(df, pattern, show=0, complement=False, case_sensitive=False):
        """
        Busca filas donde cualquier campo contenga el patrón dado.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame en el que se realizará la búsqueda.
        pattern : str
            Patrón de texto a buscar en cualquier columna.
        show : int, opcional (default=0)
            Número de resultados a mostrar. Si es 0, no muestra nada.
            Si es -1, muestra todos los resultados.
        complement : bool, opcional (default=False)
            Si es True, devuelve las filas que NO contienen el patrón.
        case_sensitive : bool, opcional (default=False)
            Si es True, la búsqueda distingue entre mayúsculas y minúsculas.
            
        Retorna:
        --------
        pandas.DataFrame
            DataFrame con las filas que coinciden con el patrón de búsqueda.
            
        Ejemplo:
        --------
        >>> resultado = DataExpresion.search_in_table(df, '2023', show=5)
        Buscando '2023' en cualquier columna...
        ╒════╤══════════╤════════════╕
        │    │ fecha    │ valor      │
        ╞════╪══════════╪════════════╡
        │  0 │ 2023-01  │ 100        │
        ├────┼──────────┼────────────┤
        │  1 │ 2023-02  │ 200        │
        ╘════╧══════════╧════════════╛
        """
        try:
            # Validaciones de tipos de parámetros
            if not isinstance(pattern, str):
                raise TypeError("pattern debe ser un string")
            if not isinstance(complement, bool):
                raise TypeError("complement debe ser un booleano")
            if not isinstance(show, int) or show < -1:
                raise ValueError("show debe ser un entero mayor o igual a -1")
                
            # Realizar la búsqueda en todas las columnas
            if case_sensitive:
                mask = df.astype(str).apply(lambda row: row.str.contains(pattern, na=False)).any(axis=1)
            else:
                mask = df.astype(str).apply(lambda row: row.str.contains(pattern, case=False, na=False)).any(axis=1)
            
            # Aplicar complemento si se solicita
            if complement:
                result = df[~mask]
                search_type = "EXCLUYENDO"
            else:
                result = df[mask]
                search_type = "INCLUYENDO"
                
            # Mostrar resultados si se solicita
            if show != 0:
                print(f"Buscando '{pattern}' en cualquier columna ({search_type} coincidencias)...")
                n_show = show if show > 0 else len(result)
                print(f"Encontradas {len(result)} coincidencias. Mostrando {min(n_show, len(result))}:")
                print(DataExpresion.head(result, n_show))
            
            return result
            
        except Exception as e:
            print(f"Error en search_in_table: {e}")
            raise

    @staticmethod
    def split_column_into_rows(df, field, delimiter, show=0, new_column_name=None, drop_original=False):
        """
        Divide un campo en varias filas mediante un delimitador.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame que contiene la columna a dividir.
        field : str
            Nombre de la columna que se dividirá.
        delimiter : str
            Delimitador utilizado para dividir los valores.
        show : int, opcional (default=0)
            Número de resultados a mostrar. Si es 0, no muestra nada.
            Si es -1, muestra todos los resultados.
        new_column_name : str, opcional (default=None)
            Nuevo nombre para la columna dividida. Si es None, mantiene el nombre original.
        drop_original : bool, opcional (default=False)
            Si es True, elimina la columna original después de dividir.
            
        Retorna:
        --------
        pandas.DataFrame
            DataFrame con la columna dividida en filas.
            
        """
        try:
            # Validaciones de tipos de parámetros
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if not isinstance(field, str) or field not in df.columns:
                raise ValueError(f"field debe ser un nombre de columna válido: {df.columns.tolist()}")
            if not isinstance(delimiter, str):
                raise TypeError("delimiter debe ser un string")
            if not isinstance(show, int) or show < -1:
                raise ValueError("show debe ser un entero mayor o igual a -1")
                
            # Hacer una copia para no modificar el DataFrame original
            df_copy = df.copy()
            
            # Dividir la columna y expandir a filas
            df_exploded = df_copy.assign(**{field: df_copy[field].astype(str).str.split(delimiter)}).explode(field)
            
            # Renombrar la columna si se especifica
            if new_column_name:
                df_exploded = df_exploded.rename(columns={field: new_column_name})
            
            # Eliminar la columna original si se solicita
            if drop_original and new_column_name:
                df_exploded = df_exploded.drop(columns=[field])
            
            # Resetear el índice
            result = df_exploded.reset_index(drop=True)
            
            # Mostrar resultados si se solicita
            if show != 0:
                print(f"Dividiendo la columna '{field}' por el delimitador '{delimiter}'...")
                n_show = show if show > 0 else len(result)
                print(f"Generadas {len(result)} filas. Mostrando {min(n_show, len(result))}:")
                print(DataExpresion.head(result, n_show))
            
            return result
            
        except Exception as e:
            print(f"Error en split_column_into_rows: {e}")
            raise

    # NUEVAS FUNCIONALIDADES PROPUESTAS

    @staticmethod
    def describe_data(df, include_all=False):
        """
        Proporciona estadísticas descriptivas del DataFrame.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame a analizar.
        include_all : bool, opcional (default=False)
            Si es True, incluye todas las columnas (también las no numéricas).
            
        Retorna:
        --------
        pandas.DataFrame
            DataFrame con estadísticas descriptivas.
        """
        try:
            if include_all:
                # Incluir todas las columnas
                description = df.describe(include='all')
            else:
                # Solo columnas numéricas (comportamiento por defecto)
                description = df.describe()
                
            print("Estadísticas descriptivas del DataFrame:")
            print(tabulate(description, headers="keys", tablefmt="fancy_grid"))
            return description
            
        except Exception as e:
            print(f"Error al generar estadísticas descriptivas: {e}")
            raise

    @staticmethod
    def value_counts_table(df, column, normalize=False, show=10):
        """
        Muestra el conteo de valores únicos en una columna con formato tabular.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame que contiene la columna.
        column : str
            Nombre de la columna para contar valores.
        normalize : bool, opcional (default=False)
            Si es True, muestra proporciones en lugar de conteos.
        show : int, opcional (default=10)
            Número de valores a mostrar.
            
        Retorna:
        --------
        pandas.Series
            Serie con los conteos de valores.
        """
        try:
            if column not in df.columns:
                raise ValueError(f"La columna '{column}' no existe en el DataFrame")
                
            counts = df[column].value_counts(normalize=normalize).head(show)
            
            print(f"Conteo de valores en la columna '{column}':")
            counts_df = counts.reset_index()
            counts_df.columns = [column, 'Proporción' if normalize else 'Conteo']
            print(tabulate(counts_df, headers="keys", tablefmt="fancy_grid", showindex=False))
            
            return counts
            
        except Exception as e:
            print(f"Error al contar valores: {e}")
            raise

    @staticmethod
    def filter_by_value(df, column, value, operator='eq', show=0):
        """
        Filtra el DataFrame basado en valores de una columna.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame a filtrar.
        column : str
            Columna por la cual filtrar.
        value : int, float, str
            Valor de comparación.
        operator : str, opcional (default='eq')
            Operador de comparación: 'eq' (igual), 'ne' (no igual),
            'gt' (mayor que), 'ge' (mayor o igual), 'lt' (menor que), 'le' (menor o igual).
        show : int, opcional (default=0)
            Número de resultados a mostrar.
            
        Retorna:
        --------
        pandas.DataFrame
            DataFrame filtrado.
        """
        try:
            if column not in df.columns:
                raise ValueError(f"La columna '{column}' no existe en el DataFrame")
                
            # Aplicar el operador correspondiente
            if operator == 'eq':
                result = df[df[column] == value]
            elif operator == 'ne':
                result = df[df[column] != value]
            elif operator == 'gt':
                result = df[df[column] > value]
            elif operator == 'ge':
                result = df[df[column] >= value]
            elif operator == 'lt':
                result = df[df[column] < value]
            elif operator == 'le':
                result = df[df[column] <= value]
            else:
                raise ValueError("Operador no válido. Use: 'eq', 'ne', 'gt', 'ge', 'lt', 'le'")
                
            # Mostrar resultados si se solicita
            if show != 0:
                print(f"Filtrando columna '{column}' con operador '{operator}' y valor '{value}':")
                n_show = show if show > 0 else len(result)
                print(f"Encontradas {len(result)} filas. Mostrando {min(n_show, len(result))}:")
                print(DataExpresion.head(result, n_show))
                
            return result
            
        except Exception as e:
            print(f"Error al filtrar por valor: {e}")
            raise

    @staticmethod
    def show_missing_data(df, show_table=True):
        """
        Muestra información sobre valores faltantes en el DataFrame.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame a analizar.
        show_table : bool, opcional (default=True)
            Si es True, muestra una tabla con los resultados.
            
        Retorna:
        --------
        pandas.Series
            Serie con el conteo de valores faltantes por columna.
        """
        try:
            missing = df.isnull().sum()
            missing_percent = (missing / len(df)) * 100
            
            missing_df = pd.DataFrame({
                'Columna': missing.index,
                'Valores_Faltantes': missing.values,
                'Porcentaje': missing_percent.values
            })
            
            if show_table:
                print("Valores faltantes por columna:")
                print(tabulate(missing_df, headers="keys", tablefmt="fancy_grid", showindex=False))
                
            return missing
            
        except Exception as e:
            print(f"Error al analizar valores faltantes: {e}")
            raise

    @staticmethod
    def get_column_types(df):
        """
        Muestra los tipos de datos de cada columna en el DataFrame.
        
        Parámetros:
        -----------
        df : pandas.DataFrame
            DataFrame a analizar.
            
        Retorna:
        --------
        pandas.Series
            Serie con los tipos de datos de cada columna.
        """
        try:
            types = df.dtypes
            types_df = types.reset_index()
            types_df.columns = ['Columna', 'Tipo_Dato']
            
            print("Tipos de datos por columna:")
            print(tabulate(types_df, headers="keys", tablefmt="fancy_grid", showindex=False))
            
            return types
            
        except Exception as e:
            print(f"Error al obtener tipos de datos: {e}")
            raise

# Ejemplos de uso
if __name__ == "__main__":
    # Crear un DataFrame de ejemplo
    data = {
        'id': [1, 2, 3, 4, 5],
        'nombre': ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Pedro Rodríguez'],
        'edad': [25, 32, 45, 29, 38],
        'ciudad': ['Madrid,Barcelona', 'Sevilla', 'Valencia,Málaga', 'Bilbao', 'Zaragoza'],
        'salario': [30000, 45000, 60000, 35000, 52000],
        'departamento': ['Ventas', 'IT', 'Ventas', 'RH', 'IT']
    }
    
    df = pd.DataFrame(data)
    
    print("DataFrame original:")
    print(DataExpresion.head(df, print_result=True))
    
    # Ejemplo de búsqueda en columna
    print("\n1. Buscando 'Ventas' en columna 'departamento':")
    ventas = DataExpresion.search_in_column(df, 'departamento', 'Ventas', show=3)
    
    # Ejemplo de búsqueda en toda la tabla
    print("\n2. Buscando 'a' en cualquier columna:")
    con_a = DataExpresion.search_in_table(df, 'a', show=3)
    
    # Ejemplo de división de columna
    print("\n3. Dividiendo columna 'ciudad' por comas:")
    ciudades_split = DataExpresion.split_column_into_rows(df, 'ciudad', ',', show=5)
    
    # Ejemplo de nuevas funcionalidades
    print("\n4. Estadísticas descriptivas:")
    DataExpresion.describe_data(df)
    
    print("\n5. Conteo de valores en 'departamento':")
    DataExpresion.value_counts_table(df, 'departamento')
    
    print("\n6. Filtrando edad mayor a 30:")
    mayores_30 = DataExpresion.filter_by_value(df, 'edad', 30, 'gt', show=3)
    
    print("\n7. Mostrando valores faltantes:")
    DataExpresion.show_missing_data(df)
    
    print("\n8. Mostrando tipos de datos:")
    DataExpresion.get_column_types(df)