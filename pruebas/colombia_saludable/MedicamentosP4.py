from etl import BasicsTransformOperations, DB_Extractor, DB_Loader, TransformOperations
import pandas as pd
from itertools import combinations
from collections import Counter


def create_db_connection():
    """Crea y retorna la conexión a la base de datos principal"""
    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",           
        "database": "colombia_saludable"   
    }
    return DB_Extractor(**db_params)

def db_connection_loader():
    """Crea y retorna una conexión a la base de datos de carga"""
    db_params = {
        "db_type": "postgresql",
        "user": "postgres",
        "password": "admin",           
        "database": "carga_colombia"   
    }
    return DB_Extractor(**db_params)

# Establecer conexiones a bases de datos
db_connected = create_db_connection()
db_loader = db_connection_loader()
db_connected.connect()
db_loader.connect()
loader_carga_colombia = DB_Loader(engine=db_loader.engine)

formulas = db_connected.get_table("formulas_medicas")

# Convertir columna de string a lista de medicamentos
df_formulas = BasicsTransformOperations.convert_column_to_list(
    formulas, 
    'medicamentos_recetados', 
    nueva_columna="medicamentos_lista", 
    show=5
)
# Actualizar la columna original con la lista normalizada
df_formulas["medicamentos_recetados"] = df_formulas["medicamentos_lista"]

# Expandir la lista en filas individuales
df_formulas_normalizado = BasicsTransformOperations.explode_column_list(
    df_formulas, 
    'medicamentos_lista', 
    show=5
)
# Crear columna limpia con códigos de medicamentos
df_formulas_normalizado['codigo_medicamento'] = df_formulas_normalizado['medicamentos_lista'].str.strip()

# Eliminar columnas temporales que ya no son necesarias
df_formulas_normalizado = df_formulas_normalizado.drop(['medicamentos_lista'], axis=1)

# Resetear índice para crear un ID único para cada detalle
df_formulas_normalizado = df_formulas_normalizado.reset_index(drop=True)
df_formulas_normalizado.index.name = 'id_detalle'
df_formulas_normalizado = df_formulas_normalizado.reset_index()


top_medicamentos = TransformOperations.filter_by_list_length(
    df_formulas_normalizado, 
    "medicamentos_recetados", 
    True, 
    show=0
)

top_medicamentos = df_formulas_normalizado['codigo_medicamento'].value_counts().reset_index()
top_medicamentos.columns = ['codigo_medicamento', 'frecuencia']
top_medicamentos = top_medicamentos.reset_index(drop=True)
top_medicamentos.index.name = 'id_detalle'
top_medicamentos = top_medicamentos.reset_index()

formulas_agrupadas = df_formulas_normalizado.groupby('codigo_formula')['codigo_medicamento'].apply(list)

# Contar combinaciones de pares de medicamentos
contador_combinaciones = Counter()

for medicamentos in formulas_agrupadas:
    if len(medicamentos) >= 2:
        # Generar todas las combinaciones posibles de pares
        for combo in combinations(medicamentos, 2):
            # Ordenar para que (A,B) sea igual a (B,A)
            combo_ordenado = tuple(sorted(combo))
            contador_combinaciones[combo_ordenado] += 1

# Convertir contador a DataFrame para mejor visualización
combinaciones_frecuentes = []
for combo, freq in contador_combinaciones.items():
    combinaciones_frecuentes.append({
        'medicamento_a': combo[0],
        'medicamento_b': combo[1],
        'frecuencia_conjunta': freq
    })

df_combinaciones = pd.DataFrame(combinaciones_frecuentes)
df_combinaciones = df_combinaciones.sort_values('frecuencia_conjunta', ascending=False)
df_combinaciones = df_combinaciones.reset_index(drop=True)
df_combinaciones.index.name = 'id_detalle'


print("=== COMBINACIONES MÁS FRECUENTES ===")
print(BasicsTransformOperations.show_head(df_combinaciones, 10))
print("\n")
    

# Cargamos las dimensines y hechos en la base de datos de carga
loader_carga_colombia.load_dimension(df_formulas_normalizado,'dim_formulas')

#llaves foranes para realcionar hechos con dimensiones
foreign_keys={
                            "medicamento_a": ("dim_formulas", "codigo_medicamento")
                            }

foreign_keys2={
                            "codigo_medicamento": ("dim_formulas", "codigo_medicamento")
                            }


# Cargar hechos en la base de datos de carga
loader_carga_colombia.load_fact(df_combinaciones, 'fact_combinaciones', foreign_keys)
loader_carga_colombia.load_fact(top_medicamentos, 'fact_medicamentos', foreign_keys2)









# ======================
# 8. ANÁLISIS DE TAMAÑO DE FÓRMULAS
# ======================

print("=== DISTRIBUCIÓN DE TAMAÑO DE FÓRMULAS ===")
tamaño_formulas = df_formulas_normalizado.groupby('codigo_formula').size().value_counts().sort_index()
print(tamaño_formulas)
print("\n")

# ======================
# 9. ESTADÍSTICAS GENERALES
# ======================

print("=== ESTADÍSTICAS GENERALES ===")
print(f"Total de fórmulas: {df_formulas_normalizado['codigo_formula'].nunique()}")
print(f"Total de medicamentos únicos: {df_formulas_normalizado['codigo_medicamento'].nunique()}")
print(f"Promedio de medicamentos por fórmula: {df_formulas_normalizado.groupby('codigo_formula').size().mean():.2f}")