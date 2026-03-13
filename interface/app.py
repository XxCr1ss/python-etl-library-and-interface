"""
Aplicación principal de la interfaz ETL.

Ejecutar con:
    streamlit run interface/app.py
"""
import streamlit as st

from components.styles          import inject_global_css, page_header, divider, COLORS
from components.csv_extractor_ui  import render_csv_extractor
from components.xlsx_extractor_ui import render_xlsx_extractor
from components.db_extractor_ui   import render_db_extractor


# ── Configuración de página ───────────────────────────────────────────────────
st.set_page_config(
    page_title="ETL Tool",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_global_css()


# ── Navegación lateral ────────────────────────────────────────────────────────
PAGES = {
    "Inicio":          "home",
    "CSV Extractor":   "csv",
    "Excel Extractor": "xlsx",
    "DB Extractor":    "db",
}

with st.sidebar:
    st.markdown("## ETL Tool")
    st.markdown("---")
    selection = st.radio(
        "Navegacion",
        list(PAGES.keys()),
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.markdown(
        '<span style="font-size:0.78rem;color:#9CA3AF;">v1.0 · Extractors Module</span>',
        unsafe_allow_html=True,
    )

page = PAGES[selection]


# ── Página de inicio ──────────────────────────────────────────────────────────

def render_home() -> None:
    page_header(
        "ETL Tool",
        "Plataforma modular para extraccion, transformacion y carga de datos.",
    )
    divider()

    st.markdown("""
    Bienvenido a la interfaz grafica de la libreria **ETL**. Desde aqui puedes
    acceder a cada modulo para trabajar con tus datos de forma visual e interactiva.
    Utiliza el menu lateral para navegar entre las secciones.
    """)

    divider()

    st.markdown(f"""
    <p style="font-size:1.3rem;font-weight:700;color:{COLORS['text']};margin-bottom:0.25rem;">
        Extractors
    </p>
    <p style="color:{COLORS['text_muted']};margin-bottom:1.25rem;font-size:0.95rem;">
        Importa datos desde archivos o bases de datos relacionales.
    </p>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3, gap="medium")

    col1.markdown(f"""
    <div class="feature-card">
        <div class="fc-title">CSV Extractor</div>
        <div class="fc-desc">
            Carga archivos <code>.csv</code>, previsualiza su contenido,
            consulta estadisticas, valida columnas requeridas y exporta los datos.
        </div>
        <span class="fc-tag">Disponible</span>
    </div>
    """, unsafe_allow_html=True)

    col2.markdown(f"""
    <div class="feature-card">
        <div class="fc-title">Excel Extractor</div>
        <div class="fc-desc">
            Carga archivos <code>.xlsx / .xls</code>, navega entre hojas,
            inspecciona tipos de datos y descarga la hoja seleccionada.
        </div>
        <span class="fc-tag">Disponible</span>
    </div>
    """, unsafe_allow_html=True)

    col3.markdown(f"""
    <div class="feature-card">
        <div class="fc-title">DB Extractor</div>
        <div class="fc-desc">
            Conectate a PostgreSQL, MySQL u Oracle. Explora tablas, esquemas,
            ejecuta queries personalizadas y exporta los resultados.
        </div>
        <span class="fc-tag">Disponible</span>
    </div>
    """, unsafe_allow_html=True)

    divider()

    st.markdown(f"""
    <p style="font-size:1.1rem;font-weight:700;color:{COLORS['text']};margin-bottom:0.75rem;">
        Roadmap de modulos
    </p>
    """, unsafe_allow_html=True)

    roadmap = {
        "Extractors":   ("CSV, Excel, DB (Postgres / MySQL / Oracle)", "—"),
        "Transformers": ("—", "Limpieza, joins, conversiones, fechas"),
        "Loaders":      ("—", "CSV, Excel, DB (dimensiones y hechos)"),
    }

    for module, (done, pending) in roadmap.items():
        with st.expander(module, expanded=False):
            c1, c2 = st.columns(2)
            c1.markdown(f"**Disponible:** {done if done != '—' else '*Ninguno aun*'}")
            c2.markdown(f"**Proximamente:** {pending if pending != '—' else '*Completado*'}")


# ── Router ────────────────────────────────────────────────────────────────────

if page == "home":
    render_home()
elif page == "csv":
    render_csv_extractor()
elif page == "xlsx":
    render_xlsx_extractor()
elif page == "db":
    render_db_extractor()