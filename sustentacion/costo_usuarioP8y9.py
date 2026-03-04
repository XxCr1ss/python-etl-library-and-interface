from etl import (
    DB_Loader,
    DB_Extractor,
    TransformOperations,
    DataSelect,
    ConvertOperations,
    BasicsTransformOperations,
    HeaderOperations
)

import pandas as pd


# ==========================================================
# 1. INICIO DEL PROCESO
# ==========================================================

print("\nINICIANDO PROCESO ETL DE COSTOS POR ENFERMEDAD (MODO LINEAL)")


# ==========================================================
# 2. CONFIGURACIÓN DE CONEXIONES
# ==========================================================

DB_PARAMS_ORIGEN = {
    "db_type": "postgresql",
    "user": "postgres",
    "password": "admin",
    "database": "colombia_saludable"
}

DB_PARAMS_CARGA = {
    "db_type": "postgresql",
    "user": "postgres",
    "password": "admin",
    "database": "carga_colombia"
}

db_origen = DB_Extractor(**DB_PARAMS_ORIGEN)
db_destino = DB_Extractor(**DB_PARAMS_CARGA)

db_origen.connect()
db_destino.connect()

loader = DB_Loader(engine=db_destino.engine)


# ==========================================================
# 3. EXTRACCIÓN
# ==========================================================

print("\nExtrayendo tabla REMISIONES...")
remisiones = db_origen.get_table("remisiones")

print("Extrayendo tabla SERVICIOS_POS...")
servicios_pos = db_origen.get_table("servicios_pos")

print("Extracción completada correctamente")


# ==========================================================
# 4. TRANSFORMACIÓN
# ==========================================================

print("\nUnión de remisiones con servicios_pos")

costo_servicio = TransformOperations.left_join(
    remisiones,
    servicios_pos,
    ("servicio_pos", "id_servicio_pos"),
    show=0
)

print("Seleccionando columnas relevantes")

df_costo = DataSelect.select_columns(
    costo_servicio,
    "codigo_remision",
    "id_usuario",
    "servicio_pos",
    "diagnostico",
    "costo",
    show=5
)


# -----------------------------
# 4.1 MÉTRICAS GENERALES
# -----------------------------

print("\nCalculando métricas generales de costo")

prom, tot, cant = BasicsTransformOperations.get_column_metrics(
    df_costo,
    "costo"
)

df_fact_general = BasicsTransformOperations.create_fact_dataframe(
    "general",
    prom,
    tot,
    cant
)

print("\nTabla de hechos - Costo Promedio General")
BasicsTransformOperations.show_head(df_fact_general)


# -----------------------------
# 4.2 ANÁLISIS POR ENFERMEDAD
# -----------------------------

enfermedades = [
    "Deficiencia Renal",
    "Deficiencia Renal Severa",
    "Diabetes",
    "SIDA",
    "Control Deficiencia Renal",
    "Cancer laringe",
    "Cancer glótico",
    "Control Diabetes"
]

print("\nFiltrando enfermedades de interés")

tabla_enfermedades = DataSelect.filter_equal(
    df_costo,
    "diagnostico",
    enfermedades,
    show=5
)

costo_enfermedad = TransformOperations.group_by_sum(
    tabla_enfermedades,
    "diagnostico",
    "costo",
    6
)


resultados_enfermedades = []

for enfermedad in enfermedades:

    servicios_filtrados = df_costo[
        df_costo["diagnostico"].str.contains(
            enfermedad,
            case=False,
            na=False
        )
    ]

    if len(servicios_filtrados) > 0:
        resultados_enfermedades.append({
            "enfermedad": enfermedad.upper(),
            "cantidad_servicios": len(servicios_filtrados),
            "costo_total": servicios_filtrados["costo"].sum(),
            "costo_promedio": servicios_filtrados["costo"].mean()
        })

df_fact_enfermedades = pd.DataFrame(resultados_enfermedades)


# ==========================================================
# 5. CARGA
# ==========================================================

print("\nCargando datos en la base destino")

# Dimensión de detalle
loader.load_dimension(df_costo, "dim_servicios_costos")

# Tabla de hechos por enfermedad
loader.load_fact(
    df_fact_enfermedades,
    "fact_costos_por_enfermedad",
    validate_foreign_keys=None
)


# ==========================================================
# 6. RESUMEN FINAL
# ==========================================================

print("\n" + "=" * 60)
print("RESUMEN EJECUTIVO")
print("=" * 60)
print(f"Costo promedio general: ${prom:,.0f}")
print(f"Total servicios analizados: {cant:,}")
print(f"Análisis de {len(df_fact_enfermedades)} enfermedades completado")
print("=" * 60)


# ==========================================================
# 7. CIERRE
# ==========================================================

db_origen.close_connection()
db_destino.close_connection()

print("\nPROCESO FINALIZADO CORRECTAMENTE")
