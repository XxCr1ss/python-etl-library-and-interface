# Importación de librerías necesarias
import os
import pandas as pd
import petl as etl
from tabulate import tabulate


class XLSXExtractor:
    """
    Clase especializada en la extracción, visualización y escritura
    de archivos Excel (.xlsx).
    Permite leer hojas individuales o múltiples, previsualizar datos
    y exportar información.
    """

    def __init__(self, file_path):
        """
        Inicializa el extractor validando que el archivo exista.

        :param file_path: Ruta del archivo Excel.
        :raises FileNotFoundError: Si el archivo no existe.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"El archivo {file_path} no existe.")
        self.file_path = file_path


    def read_sheet(self, sheet_name=None, **kwargs):
        """
        Lee una hoja específica o todas las hojas del archivo Excel.

        :param sheet_name: Nombre de la hoja a leer. Si es None, lee todas.
        :param kwargs: Argumentos adicionales compatibles con pandas.read_excel().
        :return: DataFrame (una hoja) o dict de DataFrames (todas las hojas).
        """
        try:
            if sheet_name:
                data = pd.read_excel(self.file_path, sheet_name=sheet_name, **kwargs)
                print(f"Hoja '{sheet_name}' leída exitosamente.")
                return data
            else:
                all_sheets = pd.read_excel(self.file_path, sheet_name=None, **kwargs)
                print("Archivo leído exitosamente con todas las hojas.")
                return all_sheets
        except Exception as e:
            print(f"Error al leer el archivo Excel: {e}")
            raise


    def get_sheet_names(self):
        """
        Obtiene los nombres de todas las hojas del archivo Excel.

        :return: Lista con los nombres de las hojas.
        """
        try:
            xls = pd.ExcelFile(self.file_path)
            return xls.sheet_names
        except Exception as e:
            print(f"Error al obtener los nombres de las hojas: {e}")
            raise


    def preview_data(self, sheet_name=None, n=5, **kwargs):
        """
        Muestra una vista previa formateada de una hoja o de todas las hojas.

        :param sheet_name: Nombre de la hoja a visualizar. Si es None, muestra todas.
        :param n: Número de filas a mostrar por hoja.
        :param kwargs: Argumentos adicionales para read_sheet().
        """
        try:
            data = self.read_sheet(sheet_name, **kwargs)

            if sheet_name:
                print(f"\n Hoja: {sheet_name}")
                print(
                    tabulate(
                        data.head(n),
                        headers="keys",
                        tablefmt="fancy_grid",
                        showindex=False
                    )
                )
            else:
                for name, df in data.items():
                    print(f"\n Hoja: {name}")
                    print(
                        tabulate(
                            df.head(n),
                            headers="keys",
                            tablefmt="fancy_grid",
                            showindex=False
                        )
                    )
                    print("-" * 50)

        except Exception as e:
            print(f"Error al previsualizar los datos: {e}")
            raise


    def toxlsx(self, df, filename=None, sheet_name="Sheet1",
               write_header=True, mode="replace"):
        """
        Exporta un DataFrame a un archivo Excel.

        :param df: DataFrame a guardar.
        :param filename: Ruta destino del archivo. Si es None, sobrescribe el original.
        :param sheet_name: Nombre de la hoja donde se guardarán los datos.
        :param write_header: Indica si se escribe la cabecera.
        :param mode: Modo de escritura (replace o append según petl).
        :raises Exception: Si ocurre un error durante la exportación.
        """
        if filename is None:
            filename = self.file_path

        if isinstance(df, pd.DataFrame):
            if df.columns.str.contains("Unnamed").any():
                df.columns = df.iloc[0]
                df = df[1:]
                df = df.reset_index(drop=True)

        table = etl.fromdataframe(df)

        try:
            etl.toxlsx(table, filename, sheet=sheet_name,
                       write_header=write_header, mode=mode)
            print(f"Datos guardados en el archivo '{filename}', hoja '{sheet_name}'.")
        except Exception as e:
            print(f"Error al guardar los datos en el archivo Excel: {e}")
            raise
