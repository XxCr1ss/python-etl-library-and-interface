import pandas as pd
import os
from pathlib import Path
import holidays
from tabulate import tabulate  # 📌 Para mostrar tablas bonitas en la consola

class DateTime:
    def __init__(self, start_year: int, end_year: int):
        self.start_date = f"{start_year}-01-01"
        self.end_date = f"{end_year}-12-31"

        self.holidays_colombia = holidays.CO(years=range(start_year, end_year + 1), language="es")
        self.df = self._generate_date_dimension()

    def _generate_date_dimension(self):
        date_range = pd.date_range(start=self.start_date, end=self.end_date)
        df = pd.DataFrame({"fecha": date_range})

        df["fecha"] = df["fecha"].dt.strftime("%Y-%m-%d")  # 📌 Formato sin hora
        df["año"] = pd.to_datetime(df["fecha"]).dt.year
        df["mes"] = pd.to_datetime(df["fecha"]).dt.month
        df["día"] = pd.to_datetime(df["fecha"]).dt.day
        df["semana_del_año"] = pd.to_datetime(df["fecha"]).dt.isocalendar().week
        df["día_de_la_semana"] = pd.to_datetime(df["fecha"]).dt.dayofweek + 1
        df["nombre_día"] = pd.to_datetime(df["fecha"]).dt.day_name(locale="es_ES")
        df["nombre_mes"] = pd.to_datetime(df["fecha"]).dt.month_name(locale="es_ES")
        df["trimestre"] = pd.to_datetime(df["fecha"]).dt.quarter
        df["es_fin_de_semana"] = df["día_de_la_semana"].apply(lambda x: 1 if x >= 6 else 0)
        df["es_festivo"] = df["fecha"].apply(lambda x: 1 if pd.to_datetime(x) in self.holidays_colombia else 0)
        df["nombre_festivo"] = df["fecha"].apply(lambda x: self.holidays_colombia.get(pd.to_datetime(x), ""))

        # Agregar ID autoincremental como primera columna
        df.insert(0, "id", range(1, len(df) + 1))

        return df

    def head(self, n=5):
        """ Devuelve las primeras n filas del DataFrame en formato tabla """
        try:
            if not isinstance(n, int) or n < 0:
                raise ValueError("n debe ser un entero positivo")
            return tabulate(self.df.head(n), headers='keys', tablefmt='fancy_grid', showindex=False)
        except Exception as e:
            print(f"Error al obtener las primeras {n} filas: {e}")
            raise

    def save_to_excel(self, filepath: str = None):

        try:
            # 📌 Si no se pasa ruta, crear nombre automático
            if not filepath:
                filepath = f"dim_fecha_{self.start_date}_to_{self.end_date}.xlsx"

            path = Path(filepath)

            # 📌 Validar extensión
            if path.suffix.lower() != ".xlsx":
                raise ValueError("El archivo debe tener extensión .xlsx")

            # 📌 Crear carpeta si no existe
            if not path.parent.exists():
                path.parent.mkdir(parents=True, exist_ok=True)

            # 📌 Guardar archivo
            self.df.to_excel(path, index=False, engine="openpyxl")

            print(f"✅ Archivo Excel creado correctamente en: {path.resolve()}")

        except ImportError:
            print("❌ openpyxl no está instalado. Ejecuta: pip install openpyxl")
            raise

        except Exception as e:
            print(f"❌ Error al guardar el archivo: {e}")
            raise


    def __str__(self):
        """ Muestra las primeras filas cuando se llama a la instancia """
        return self.head()


# 📌 Prueba del código
if __name__ == "__main__":
    date_dim = DateTime(2020, 2025)
    print(date_dim)  # 📌 Muestra las primeras filas como tabla
    date_dim.save_to_excel()  # Guarda el Excel
