"""
Componente de interfaz para CSVExtractor.
Usa directamente la clase CSVExtractor del módulo etl.
"""
import io
import sys
import tempfile
import os
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Resolución de ruta al paquete etl ─────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[3]   # components → interface → raíz del proyecto
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from etl.extractors.csv_extractor import CSVExtractor

from .styles import page_header, section_header, metric_card, divider


# ── Helper ────────────────────────────────────────────────────────────────────

def _save_upload_to_temp(uploaded_file) -> str:
    """Persiste el UploadedFile en disco y devuelve la ruta temporal."""
    suffix = os.path.splitext(uploaded_file.name)[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded_file.getvalue())
        return tmp.name


# ── Secciones ─────────────────────────────────────────────────────────────────

def _render_upload_section():
    """
    Zona de carga del archivo.
    Devuelve (extractor, df, original_name) o (None, None, None).
    """
    st.markdown(
        '<div class="upload-hint">Arrastra tu archivo CSV aqui o haz clic para buscarlo</div>',
        unsafe_allow_html=True,
    )

    uploaded = st.file_uploader(
        label="Seleccionar archivo CSV",
        type=["csv"],
        label_visibility="collapsed",
    )

    if uploaded is None:
        return None, None, None

    with st.spinner("Leyendo archivo..."):
        try:
            temp_path = _save_upload_to_temp(uploaded)
            extractor = CSVExtractor(temp_path)           # <-- usa el modulo etl
            df = extractor.read_csv()                     # <-- CSVExtractor.read_csv()
            st.success(
                f"Archivo **{uploaded.name}** cargado correctamente — "
                f"{len(df):,} filas x {len(df.columns)} columnas."
            )
            return extractor, df, uploaded.name
        except Exception as exc:
            st.error(f"Error al leer el archivo: {exc}")
            return None, None, None


def _render_metrics(extractor: CSVExtractor) -> None:
    """
    Muestra métricas usando CSVExtractor.get_basic_stats().
    """
    section_header("Estadisticas del archivo")

    try:
        stats = extractor.get_basic_stats()           # <-- CSVExtractor.get_basic_stats()
    except Exception as exc:
        st.error(f"No se pudieron obtener estadisticas: {exc}")
        return

    c1, c2, c3, c4 = st.columns(4)
    metric_card("Filas",        f"{stats['rows']:,}",                        c1)
    metric_card("Columnas",     stats["columns"],                             c2)
    metric_card("Tamano (KB)",  round(stats["file_size_bytes"] / 1024, 1),   c3)
    metric_card("Memoria (MB)", stats["memory_usage_mb"],                     c4)


def _render_preview(df: pd.DataFrame) -> None:
    """Vista previa interactiva con control de filas y columnas."""
    section_header("Vista previa")

    col_n, col_cols = st.columns([1, 3])
    n_rows = col_n.slider(
        "Filas a mostrar",
        min_value=5,
        max_value=min(100, len(df)),
        value=10,
        step=5,
        key="csv_rows_slider",
    )

    selected_cols = col_cols.multiselect(
        "Columnas a mostrar (vacio = todas)",
        options=df.columns.tolist(),
        default=[],
        placeholder="Todas las columnas",
        key="csv_cols_multiselect",
    )

    display_df = df[selected_cols] if selected_cols else df
    st.dataframe(display_df.head(n_rows), use_container_width=True, height=350)


def _render_dtypes(extractor: CSVExtractor) -> None:
    """
    Tabla de tipos de datos construida con get_basic_stats() y read_csv().
    """
    section_header("Tipos de datos")

    try:
        stats = extractor.get_basic_stats()           # <-- CSVExtractor.get_basic_stats()
        df    = extractor.read_csv()                  # <-- CSVExtractor.read_csv()

        dtype_df = pd.DataFrame({
            "Columna":  stats["column_names"],
            "Tipo":     [stats["data_types"][c] for c in stats["column_names"]],
            "No nulos": df.count().values,
            "Nulos":    df.isnull().sum().values,
            "% Nulos":  (df.isnull().mean() * 100).round(2).astype(str) + " %",
        })
        st.dataframe(dtype_df, use_container_width=True, hide_index=True)

    except Exception as exc:
        st.error(f"Error al obtener tipos de datos: {exc}")


def _render_validation(extractor: CSVExtractor) -> None:
    """
    Valida la estructura del CSV usando CSVExtractor.validate_csv_structure().
    """
    section_header("Validar estructura")

    with st.expander("Configurar validacion", expanded=False):
        required_input = st.text_input(
            "Columnas requeridas (separadas por coma)",
            placeholder="columna1, columna2, ...",
            key="csv_required_cols",
        )
        min_rows = st.number_input(
            "Minimo de filas requeridas",
            min_value=1,
            value=1,
            step=1,
            key="csv_min_rows",
        )

        if st.button("Ejecutar validacion", use_container_width=True, key="csv_validate_btn"):
            required_cols = (
                [c.strip() for c in required_input.split(",") if c.strip()]
                or None
            )
            try:
                is_valid, message = extractor.validate_csv_structure(  # <-- CSVExtractor.validate_csv_structure()
                    required_columns=required_cols,
                    min_rows=int(min_rows),
                )
                if is_valid:
                    st.success(message)
                else:
                    st.error(message)
            except Exception as exc:
                st.error(f"Error durante la validacion: {exc}")


def _render_export(extractor: CSVExtractor, df: pd.DataFrame, original_name: str) -> None:
    """
    Exporta datos usando CSVExtractor.tocsv() para CSV
    y pandas ExcelWriter para XLSX.
    """
    section_header("Exportar datos")

    col_fmt, col_btn = st.columns([1, 2])
    export_fmt = col_fmt.selectbox(
        "Formato",
        ["CSV", "Excel"],
        label_visibility="collapsed",
        key="csv_export_fmt",
    )
    stem = os.path.splitext(original_name)[0]

    if export_fmt == "CSV":
        # tocsv() escribe en disco; lo leemos para el botón de descarga
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp_out = tmp.name
        try:
            extractor.tocsv(df, filename=tmp_out, mode="replace")  # <-- CSVExtractor.tocsv()
            with open(tmp_out, "rb") as f:
                data_bytes = f.read()
        finally:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)

        mime  = "text/csv"
        fname = f"{stem}_export.csv"

    else:
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        data_bytes = buf.getvalue()
        mime  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fname = f"{stem}_export.xlsx"

    col_btn.download_button(
        label=f"Descargar como {export_fmt}",
        data=data_bytes,
        file_name=fname,
        mime=mime,
        use_container_width=True,
        key="csv_download_btn",
    )


# ── Entrada pública ───────────────────────────────────────────────────────────

def render_csv_extractor() -> None:
    """Renderiza la pagina completa del extractor CSV."""
    page_header(
        "CSV Extractor",
        "Carga, explora y valida archivos CSV de forma interactiva.",
    )
    divider()

    extractor, df, original_name = _render_upload_section()

    if extractor is None:
        st.info("Sube un archivo CSV para comenzar.")
        return

    st.session_state["csv_extractor"] = extractor
    st.session_state["csv_df"]        = df
    st.session_state["csv_name"]      = original_name

    divider()
    _render_metrics(extractor)
    divider()
    _render_preview(df)
    divider()
    _render_dtypes(extractor)
    divider()
    _render_validation(extractor)
    divider()
    _render_export(extractor, df, original_name)