from etl import XLSXExtractor  # Ajusta si la clase está en otro archivo
import pandas as pd

# Ruta del archivo en Windows
file_path = r"C:\Users\rodri\Desktop\DATOS\archivo_prueba_excel.xlsx"

# Crear instancia
excel = XLSXExtractor(file_path)

# Obtener nombres de hojas
print("\nHojas disponibles en el archivo:")
print(excel.get_sheet_names())

# Leer hoja específica
ventas_df = excel.read_sheet("Ventas")

print("\nDataFrame Ventas:")
print(ventas_df.head())

# 4Previsualizar todas las hojas formateadas
print("\nVista previa formateada:")
excel.preview_data()

# Modificar datos (ejemplo ETL simple)
ventas_df["Total"] = ventas_df["Cantidad"] * ventas_df["Precio"]

# Exportar nueva hoja con cálculo
excel.toxlsx(
    df=ventas_df,
    filename=r"C:\Users\rodri\Desktop\DATOS\Archivo_XLSX_MODIFICADO.xlsx",
    sheet_name="Ventas_Con_Total",
    write_header=True,
    mode="replace"
)

print("\nProceso de prueba finalizado correctamente.")
