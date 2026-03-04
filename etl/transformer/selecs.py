import pandas as pd
from tabulate import tabulate
from typing import Union, List, Set, Tuple, Callable, Any, Optional

class DataSelect:
    """
    Clase diseñada para realizar operaciones comunes de exploración, filtrado y selección de datos 
    sobre DataFrames de pandas. Los métodos son estáticos, por lo que pueden ser invocados directamente 
    sin necesidad de instanciar la clase. 
    
    Cada método incluye validaciones de tipo, control de errores y la posibilidad de visualizar 
    los resultados en formato tabular, ideal para análisis exploratorios o procesos ETL.
    """

    # ======================================================
    #  VISUALIZACIÓN
    # ======================================================
    @staticmethod
    def head(df, n=5, print_result=True):
        """
        Muestra las primeras `n` filas del DataFrame con formato de tabla visual (usando tabulate).

        Parámetros:
        - df (pd.DataFrame): DataFrame a visualizar.
        - n (int): Número de filas a mostrar. Por defecto, 5.
        - print_result (bool): Si es True, imprime la tabla. Si es False, solo la devuelve como string.

        Retorna:
        - str: Representación tabular del subconjunto de datos.

        Uso común:
        - Ideal para inspeccionar las primeras filas de un DataFrame o verificar transformaciones recientes.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if not isinstance(n, int) or n <= 0:
                raise ValueError("n debe ser un entero positivo")

            df_head = df.head(n)
            result = tabulate(df_head, headers="keys", tablefmt="fancy_grid", showindex=False)
            if print_result:
                print(result)
            return result
        except Exception as e:
            print(f"Error al obtener las primeras {n} filas: {e}")
            raise

    # ======================================================
    #  FILTROS GENERALES
    # ======================================================
    @staticmethod
    def filter_by_operation(df, field, value, op, complement=False, show=0):
        """
        Filtra filas aplicando una función u operación lógica personalizada sobre una columna.

        Parámetros:
        - df (pd.DataFrame): DataFrame base.
        - field (str): Nombre de la columna sobre la cual aplicar la operación.
        - value (Any): Valor de comparación.
        - op (Callable): Función que reciba (x, value) y devuelva True o False.
        - complement (bool): Si True, invierte el resultado del filtro.
        - show (int): Controla cuántas filas mostrar (0 = no mostrar, -1 = todas).

        Retorna:
        - pd.DataFrame: Subconjunto filtrado.

        Ejemplo:
        >>> DataSelect.filter_by_operation(df, 'edad', 30, lambda x,v: x > v)
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")
            if not callable(op):
                raise TypeError("op debe ser una función callable")

            mask = df[field].apply(lambda x: op(x, value))
            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_by_operation: {e}")
            raise

    @staticmethod
    def filter_equal(df, field, value, complement=False, show=0):
        """
        Filtra las filas donde el valor de una columna es igual al valor especificado.

        Parámetros:
        - field (str): Nombre de la columna.
        - value (Any): Valor exacto a buscar.
        - complement (bool): Si True, devuelve las filas que NO cumplen la condición.
        - show (int): Número de filas a mostrar (0 = no mostrar).

        Retorna:
        - pd.DataFrame: DataFrame filtrado con filas coincidentes.

        Ejemplo:
        >>> DataSelect.filter_equal(df, 'ciudad', 'Bogotá')
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")

            # --- CAMBIO CLAVE AQUÍ ---
            if isinstance(value, list):
                # Si es lista, usamos .isin()
                mask = df[field].isin(value)
            else:
                # Si es un valor único, usamos ==
                mask = df[field] == value
            # --------------------------

            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_equal: {e}")
            raise

    @staticmethod
    def filter_not_equal(df, field, value, complement=False, show=0):
        """
        Filtra filas donde el valor de una columna es diferente del valor indicado.
        Es el opuesto de filter_equal().

        Parámetros:
        - field (str): Columna a evaluar.
        - value (Any): Valor a excluir.
        - complement (bool): Si True, invierte la lógica del filtro.
        - show (int): Muestra resultados opcionalmente.

        Retorna:
        - pd.DataFrame: DataFrame filtrado.
        """
        try:
            return DataSelect.filter_equal(df, field, value, not complement, show)
        except Exception as e:
            print(f"Error en filter_not_equal: {e}")
            raise

    @staticmethod
    def filter_in_range(df, field, minv, maxv, complement=False, show=0):
        """
        Filtra filas donde los valores de una columna se encuentran dentro del rango [minv, maxv].

        Parámetros:
        - field (str): Columna numérica a evaluar.
        - minv (float/int): Valor mínimo del rango.
        - maxv (float/int): Valor máximo del rango.
        - complement (bool): Si True, invierte el filtro.
        - show (int): Control de visualización.

        Retorna:
        - pd.DataFrame: Filas dentro del rango especificado.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")
            if not (isinstance(minv, (int, float)) and isinstance(maxv, (int, float))):
                raise TypeError("minv y maxv deben ser numéricos")
            if minv > maxv:
                raise ValueError("minv no puede ser mayor que maxv")

            mask = (df[field] >= minv) & (df[field] <= maxv)
            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_in_range: {e}")
            raise

    @staticmethod
    def filter_contains(df, field, value, complement=False, show=0):
        """
        Filtra filas donde el valor del campo contiene una subcadena específica.

        Parámetros:
        - field (str): Columna a analizar (de tipo texto o convertible a string).
        - value (str): Subcadena a buscar.
        - complement (bool): Si True, devuelve las filas que NO contienen el valor.
        - show (int): Control de visualización.

        Retorna:
        - pd.DataFrame: Subconjunto filtrado.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")
            if not isinstance(value, str):
                raise TypeError("value debe ser un string")

            mask = df[field].astype(str).str.contains(value, na=False, regex=False)
            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_contains: {e}")
            raise

    @staticmethod
    def filter_in_list(df, field, values, complement=False, show=0):
        """
        Filtra filas donde el valor de una columna se encuentra dentro de una lista o conjunto dado.

        Parámetros:
        - field (str): Columna a verificar.
        - values (list | set | tuple): Colección de valores permitidos.
        - complement (bool): Si True, excluye los valores indicados.
        - show (int): Número de filas a mostrar.

        Retorna:
        - pd.DataFrame: DataFrame filtrado.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")
            if not isinstance(values, (list, set, tuple)):
                raise TypeError("values debe ser una lista, conjunto o tupla")

            mask = df[field].isin(values)
            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_in_list: {e}")
            raise

    @staticmethod
    def filter_is_null(df, field, complement=False, show=0):
        """
        Filtra filas donde el valor del campo es nulo (NaN o None).

        Parámetros:
        - field (str): Columna a verificar.
        - complement (bool): Si True, selecciona las filas no nulas.
        - show (int): Control de visualización.

        Retorna:
        - pd.DataFrame: Subconjunto filtrado.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")

            mask = df[field].isna()
            result = df[~mask] if complement else df[mask]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error en filter_is_null: {e}")
            raise

    # ======================================================
    #  SELECCIÓN Y VALORES ÚNICOS
    # ======================================================
    @staticmethod
    def unique_values(df, field, show=False):
        """
        Retorna los valores únicos presentes en una columna del DataFrame.

        Parámetros:
        - field (str): Columna de interés.
        - show (bool): Si True, muestra los valores únicos en formato tabular.

        Retorna:
        - list: Lista de valores únicos no nulos.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame")

            unique_vals = df[field].dropna().unique().tolist()

            if show:
                unique_df = pd.DataFrame({field: unique_vals})
                DataSelect.head(unique_df, len(unique_df))

            return unique_vals
        except Exception as e:
            print(f"Error al obtener valores únicos: {e}")
            raise

    @staticmethod
    def select_columns(df, *columns, complement=False, show=0):
        """
        Permite seleccionar o excluir columnas específicas del DataFrame.

        Parámetros:
        - columns: Nombres de las columnas a incluir o excluir.
        - complement (bool): Si True, devuelve todas las columnas excepto las indicadas.
        - show (int): Control de visualización.

        Retorna:
        - pd.DataFrame: DataFrame con las columnas seleccionadas.
        """
        try:
            if not isinstance(df, pd.DataFrame):
                raise TypeError("df debe ser un DataFrame de pandas")
            for col in columns:
                if col not in df.columns:
                    raise ValueError(f"La columna '{col}' no existe en el DataFrame")

            result = df.drop(columns=list(columns)) if complement else df[list(columns)]

            if show != 0:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result.copy()
        except Exception as e:
            print(f"Error al seleccionar columnas: {e}")
            raise

    @staticmethod
    def select_not_none(df, field, complement=False, show=0):
        """
        Filtra las filas donde el campo NO contiene valores nulos.
        Es el opuesto de filter_is_null().

        Parámetros:
        - field (str): Columna a evaluar.
        - complement (bool): Si True, devuelve las filas nulas.
        - show (int): Muestra resultados si es distinto de 0.

        Retorna:
        - pd.DataFrame: DataFrame con filas no nulas.
        """
        try:
            if field not in df.columns:
                raise ValueError(f"El campo '{field}' no existe en el DataFrame.")

            mask = df[field].notna()
            result = df[~mask] if complement else df[mask]

            if show:
                rows = show if show > 0 else len(result)
                DataSelect.head(result, rows)

            return result
        except Exception as e:
            print(f"Error en select_not_none: {e}")
            raise
