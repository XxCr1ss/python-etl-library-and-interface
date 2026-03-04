from etl.extractors.xlsx_extractor import XLSXExtractor
import pandas as pd

# Crear un objeto del extractor
extractor = XLSXExtractor("C:/Users/User/Escritorio/Archivos Luis bodega/CUADRE LOCALES.xlsx")

todas_las_hojas = extractor.read_sheet()

clientes_df = extractor.read_sheet(sheet_name="SEPTIEMBRE2")

hojas = extractor.get_sheet_names()
print(hojas)

extractor.preview_data(sheet_name="SEPTIEMBRE2")

extractor.toxlsx(clientes_df, sheet_name="Clientes Procesados")

print("Datos guardados exitosamente.")
