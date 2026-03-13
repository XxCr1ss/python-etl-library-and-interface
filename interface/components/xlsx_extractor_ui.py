"""
Componente de interfaz para XLSXExtractor.
Usa directamente la clase XLSXExtractor del módulo etl.
"""
import io
import sys
import tempfile
import os
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Resolución de ruta al paquete etl ─────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[3]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from etl.extractors.xlsx_extractor import XLSXExtractor

from .styles import page_header, section_header, metric_card, divider


# ── Helper ────────────────────────────────────────────────────────────────────

def _save_upload_to_temp(uploaded_file) -> str:
    suffix = os.path.splitext(uploaded_file.name)[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded_file.getvalue())
        return tmp.name


# ── Secciones ─────────────────────────────────────────────────────────────────

def _render_upload_section():
    """
    Zona de carga del archivo.
    Devuelve (extractor, sheet_names, original_name) o (None, None, None).
    """
    st.markdown(
        '<div class="upload-hint">Arrastra tu archivo Excel aqui o haz clic para buscarlo</div>',
        unsafe_allow_html=True,
    )

    uploaded = st.file_uploader(
        label="Seleccionar archivo Excel",
        type=["xlsx", "xls"],
        label_visibility="collapsed",
    )

    if uploaded is None:
        return None, None, None

    with st.spinner("Leyendo archivo..."):
        try:
            temp_path   = _save_upload_to_temp(uploaded)
            extractor   = XLSXExtractor(temp_path)              # <-- XLSXExtractor.__init__()
            sheet_names = extractor.get_sheet_names()           # <-- XLSXExtractor.get_sheet_names()
            n = len(sheet_names)
            st.success(
                f"Archivo **{uploaded.name}** cargado correctamente — "
                f"{n} hoja{'s' if n != 1 else ''}: {sheet_names}"
            )
            return extractor, sheet_names, uploaded.name
        except Exception as exc:
            st.error(f"Error al leer el archivo: {exc}")
            return None, None, None


def _render_sheet_selector(sheet_names: list) -> str:
    """Selector de hoja de trabajo."""
    section_header("Seleccion de hoja")

    selected = st.selectbox(
        "Hoja de trabajo",
        options=sheet_names,
        label_visibility="collapsed",
        key="xlsx_sheet_select",
    )
    return selected


def _render_metrics(df: pd.DataFrame, sheet_name: str) -> None:
    """Metricas de la hoja seleccionada."""
    section_header(f"Estadisticas — hoja: {sheet_name}")

    mem_mb   = round(df.memory_usage(deep=True).sum() / (1024 ** 2), 4)
    null_pct = round(df.isnull().mean().mean() * 100, 1)

    c1, c2, c3, c4 = st.columns(4)
    metric_card("Filas",            f"{len(df):,}",    c1)
    metric_card("Columnas",         len(df.columns),   c2)
    metric_card("Memoria (MB)",     mem_mb,             c3)
    metric_card("% Nulos (prom.)",  f"{null_pct} %",   c4)


def _render_preview(df: pd.DataFrame) -> None:
    """Vista previa interactiva de la hoja."""
    section_header("Vista previa")

    col_n, col_cols = st.columns([1, 3])
    n_rows = col_n.slider(
        "Filas a mostrar",
        min_value=5,
        max_value=min(100, len(df)),
        value=10,
        step=5,
        key="xlsx_rows_slider",
    )

    selected_cols = col_cols.multiselect(
        "Columnas a mostrar (vacio = todas)",
        options=df.columns.tolist(),
        default=[],
        placeholder="Todas las columnas",
        key="xlsx_cols_multiselect",
    )

    display_df = df[selected_cols] if selected_cols else df
    st.dataframe(display_df.head(n_rows), use_container_width=True, height=360)


def _render_dtypes(df: pd.DataFrame) -> None:
    """Tabla de tipos de datos de la hoja activa."""
    section_header("Tipos de datos")

    dtype_df = pd.DataFrame({
        "Columna":  df.columns,
        "Tipo":     df.dtypes.astype(str).values,
        "No nulos": df.count().values,
        "Nulos":    df.isnull().sum().values,
        "% Nulos":  (df.isnull().mean() * 100).round(2).astype(str) + " %",
    })
    st.dataframe(dtype_df, use_container_width=True, hide_index=True)


def _render_all_sheets_summary(extractor: XLSXExtractor, sheet_names: list) -> None:
    """
    Resumen de todas las hojas usando XLSXExtractor.read_sheet().
    """
    section_header("Resumen de todas las hojas")

    with st.spinner("Leyendo todas las hojas..."):
        rows = []
        for name in sheet_names:
            try:
                df_s = extractor.read_sheet(sheet_name=name)   # <-- XLSXExtractor.read_sheet()
                rows.append({
                    "Hoja":                name,
                    "Filas":               len(df_s),
                    "Columnas":            len(df_s.columns),
                    "Columnas disponibles": ", ".join(df_s.columns.astype(str).tolist()[:6])
                                           + ("..." if len(df_s.columns) > 6 else ""),
                })
            except Exception:
                rows.append({
                    "Hoja": name, "Filas": "-", "Columnas": "-",
                    "Columnas disponibles": "Error al leer",
                })

    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


def _render_export(extractor: XLSXExtractor, df: pd.DataFrame,
                   original_name: str, sheet_name: str) -> None:
    """
    Exporta usando XLSXExtractor.toxlsx() para Excel
    y pandas para CSV.
    """
    section_header("Exportar hoja seleccionada")

    col_fmt, col_btn = st.columns([1, 2])
    export_fmt = col_fmt.selectbox(
        "Formato",
        ["Excel", "CSV"],
        label_visibility="collapsed",
        key="xlsx_export_fmt",
    )
    stem = os.path.splitext(original_name)[0]

    if export_fmt == "Excel":
        # toxlsx() escribe en disco; lo leemos para el botón de descarga
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp_out = tmp.name
        try:
            extractor.toxlsx(                               # <-- XLSXExtractor.toxlsx()
                df,
                filename=tmp_out,
                sheet_name=sheet_name,
                mode="replace",
            )
            with open(tmp_out, "rb") as f:
                data_bytes = f.read()
        finally:
            if os.path.exists(tmp_out):
                os.remove(tmp_out)

        mime  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fname = f"{stem}_{sheet_name}_export.xlsx"

    else:
        data_bytes = df.to_csv(index=False).encode("utf-8")
        mime  = "text/csv"
        fname = f"{stem}_{sheet_name}_export.csv"

    col_btn.download_button(
        label=f"Descargar como {export_fmt}",
        data=data_bytes,
        file_name=fname,
        mime=mime,
        use_container_width=True,
        key="xlsx_download_btn",
    )


# ── Entrada pública ───────────────────────────────────────────────────────────

def render_xlsx_extractor() -> None:
    """Renderiza la pagina completa del extractor XLSX."""
    page_header(
        "Excel Extractor",
        "Carga archivos .xlsx / .xls, explora sus hojas y exporta los datos.",
    )
    divider()

    extractor, sheet_names, original_name = _render_upload_section()

    if extractor is None:
        st.info("Sube un archivo Excel para comenzar.")
        return

    st.session_state["xlsx_extractor"]   = extractor
    st.session_state["xlsx_sheet_names"] = sheet_names
    st.session_state["xlsx_name"]        = original_name

    divider()
    selected_sheet = _render_sheet_selector(sheet_names)

    with st.spinner(f"Cargando hoja '{selected_sheet}'..."):
        try:
            df = extractor.read_sheet(sheet_name=selected_sheet)  # <-- XLSXExtractor.read_sheet()
        except Exception as exc:
            st.error(f"No se pudo leer la hoja '{selected_sheet}': {exc}")
            return

    divider()
    _render_metrics(df, selected_sheet)
    divider()
    _render_preview(df)
    divider()
    _render_dtypes(df)

    if len(sheet_names) > 1:
        divider()
        _render_all_sheets_summary(extractor, sheet_names)   # <-- usa read_sheet() internamente

    divider()
    _render_export(extractor, df, original_name, selected_sheet)