"""
Componente de interfaz para DB_Extractor.
Usa directamente la clase DB_Extractor del módulo etl.

Flujo de uso:
    1. Configurar credenciales de conexion
    2. Conectar a la base de datos
    3. Explorar tablas, esquemas e informacion general
    4. Ejecutar queries personalizadas o extraer tablas completas
    5. Visualizar y exportar los resultados
"""
import io
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# ── Resolución de ruta al paquete etl ─────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[3]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from etl.extractors.db_extractor import DB_Extractor

from .styles import page_header, section_header, metric_card, divider, COLORS


# ── Constantes ────────────────────────────────────────────────────────────────

DB_TYPES      = ["postgresql", "mysql", "oracle"]
DEFAULT_PORTS = {"postgresql": 5432, "mysql": 3306, "oracle": 1521}

SESSION_EXTRACTOR = "db_extractor_instance"
SESSION_CONNECTED = "db_connected"
SESSION_DB_INFO   = "db_info"
SESSION_RESULT    = "db_query_result"


# ── Helpers de sesión ─────────────────────────────────────────────────────────

def _get_extractor() -> "DB_Extractor | None":
    return st.session_state.get(SESSION_EXTRACTOR)

def _is_connected() -> bool:
    return st.session_state.get(SESSION_CONNECTED, False)

def _set_connected(extractor: DB_Extractor) -> None:
    st.session_state[SESSION_EXTRACTOR] = extractor
    st.session_state[SESSION_CONNECTED] = True

def _disconnect() -> None:
    extractor = _get_extractor()
    if extractor:
        try:
            extractor.close_connection()          # <-- DB_Extractor.close_connection()
        except Exception:
            pass
    st.session_state[SESSION_EXTRACTOR] = None
    st.session_state[SESSION_CONNECTED] = False
    st.session_state[SESSION_DB_INFO]   = None
    st.session_state[SESSION_RESULT]    = None


# ── Secciones ─────────────────────────────────────────────────────────────────

def _render_connection_form() -> None:
    """
    Formulario de credenciales y botón de conexión/desconexión.
    Usa DB_Extractor.__init__() y connect().
    """
    section_header("Configuracion de conexion")

    # ── Estado de conexión actual ──
    if _is_connected():
        extractor = _get_extractor()
        st.markdown(f"""
        <div style="
            background:{COLORS['success_lt']};
            border:1px solid {COLORS['success']};
            border-radius:8px;
            padding:0.75rem 1rem;
            color:{COLORS['success']};
            font-weight:600;
            margin-bottom:1rem;
        ">
            Conectado a {extractor.db_type.upper()} &mdash;
            {extractor.database} en {extractor.host}:{extractor.port}
        </div>
        """, unsafe_allow_html=True)

        if st.button("Desconectar", use_container_width=False, key="db_disconnect_btn"):
            _disconnect()
            st.rerun()
        return

    # ── Formulario ──
    with st.form("db_connection_form"):
        col_type, col_host, col_port = st.columns([1, 2, 1])

        db_type = col_type.selectbox(
            "Motor",
            options=DB_TYPES,
            key="db_form_type",
        )
        host = col_host.text_input(
            "Host",
            value="localhost",
            key="db_form_host",
        )
        port = col_port.number_input(
            "Puerto",
            min_value=1,
            max_value=65535,
            value=DEFAULT_PORTS[db_type],
            key="db_form_port",
        )

        col_user, col_pass, col_db = st.columns(3)
        user     = col_user.text_input("Usuario",        value="root",  key="db_form_user")
        password = col_pass.text_input("Contrasena",     type="password", key="db_form_pass")
        database = col_db.text_input("Base de datos",    key="db_form_db")

        # Oracle requiere service_name
        service_name = None
        if db_type == "oracle":
            service_name = st.text_input(
                "Service Name (Oracle)",
                placeholder="orcl",
                key="db_form_service",
            )

        submitted = st.form_submit_button("Conectar", use_container_width=True)

    if submitted:
        if not database:
            st.error("El campo 'Base de datos' es obligatorio.")
            return
        if db_type == "oracle" and not service_name:
            st.error("El campo 'Service Name' es obligatorio para Oracle.")
            return

        with st.spinner(f"Conectando a {db_type.upper()}..."):
            try:
                extractor = DB_Extractor(          # <-- DB_Extractor.__init__()
                    db_type=db_type,
                    host=host,
                    user=user,
                    password=password,
                    database=database,
                    port=int(port),
                    service_name=service_name or None,
                )
                extractor.connect()                # <-- DB_Extractor.connect()
                _set_connected(extractor)
                st.success(f"Conexion exitosa a {db_type.upper()} — '{database}'.")
                st.rerun()
            except Exception as exc:
                st.error(f"Error al conectar: {exc}")


def _render_db_overview() -> None:
    """
    Informacion general de la base de datos.
    Usa DB_Extractor.get_database_info().
    """
    section_header("Informacion de la base de datos")

    extractor = _get_extractor()

    # Cachear en sesión para no repetir consulta
    if not st.session_state.get(SESSION_DB_INFO):
        with st.spinner("Obteniendo informacion..."):
            try:
                info = extractor.get_database_info()   # <-- DB_Extractor.get_database_info()
                st.session_state[SESSION_DB_INFO] = info
            except Exception as exc:
                st.error(f"Error al obtener informacion de la BD: {exc}")
                return

    info = st.session_state[SESSION_DB_INFO]

    c1, c2, c3, c4 = st.columns(4)
    metric_card("Base de datos", info["database_name"], c1)
    metric_card("Motor",         info["db_type"],        c2)
    metric_card("Tablas",        info["tables_count"],   c3)
    metric_card("Puerto",        info["port"],           c4)


def _render_table_explorer() -> None:
    """
    Explorador de tablas: lista, esquema y muestra de datos.
    Usa get_table_names(), get_table_schema(), sample_data() y get_table().
    """
    section_header("Explorador de tablas")

    extractor = _get_extractor()
    info      = st.session_state.get(SESSION_DB_INFO)

    if not info:
        st.info("Carga primero la informacion de la base de datos.")
        return

    table_names = info.get("tables", [])
    if not table_names:
        st.warning("No se encontraron tablas en la base de datos.")
        return

    col_sel, col_act = st.columns([2, 1])
    selected_table = col_sel.selectbox(
        "Seleccionar tabla",
        options=table_names,
        label_visibility="collapsed",
        key="db_table_select",
    )
    action = col_act.radio(
        "Accion",
        ["Ver esquema", "Muestra de datos", "Tabla completa"],
        horizontal=False,
        key="db_table_action",
    )

    if st.button("Ejecutar", use_container_width=False, key="db_table_exec_btn"):
        with st.spinner(f"Consultando '{selected_table}'..."):
            try:
                if action == "Ver esquema":
                    schema = extractor.get_table_schema(selected_table)  # <-- DB_Extractor.get_table_schema()
                    _render_schema(schema, selected_table)

                elif action == "Muestra de datos":
                    n = st.session_state.get("db_sample_n", 10)
                    df = extractor.sample_data(selected_table, n=n)       # <-- DB_Extractor.sample_data()
                    st.session_state[SESSION_RESULT] = df
                    _render_dataframe_result(df, f"Muestra de '{selected_table}' ({n} registros)")

                elif action == "Tabla completa":
                    df = extractor.get_table(selected_table)              # <-- DB_Extractor.get_table()
                    st.session_state[SESSION_RESULT] = df
                    _render_dataframe_result(df, f"Tabla '{selected_table}' completa — {len(df):,} registros")

            except Exception as exc:
                st.error(f"Error al consultar '{selected_table}': {exc}")

    # Control de n para muestra
    if action == "Muestra de datos":
        st.session_state["db_sample_n"] = st.slider(
            "Numero de registros de muestra",
            min_value=5, max_value=100, value=10, step=5,
            key="db_sample_slider",
        )


def _render_schema(schema: dict, table_name: str) -> None:
    """Renderiza el esquema de una tabla."""
    st.markdown(f"**Esquema de la tabla:** `{table_name}`")

    schema_df = pd.DataFrame({
        "Columna": schema["columns"],
        "Tipo":    [str(t) for t in schema["types"]],
        "PK":      ["Si" if col in schema["primary_keys"] else "—"
                    for col in schema["columns"]],
    })
    st.dataframe(schema_df, use_container_width=True, hide_index=True)

    if schema["foreign_keys"]:
        st.markdown("**Claves foraneas:**")
        fk_rows = []
        for fk in schema["foreign_keys"]:
            fk_rows.append({
                "Columna local":     ", ".join(fk.get("constrained_columns", [])),
                "Tabla referenciada": fk.get("referred_table", "—"),
                "Columna referenciada": ", ".join(fk.get("referred_columns", [])),
            })
        st.dataframe(pd.DataFrame(fk_rows), use_container_width=True, hide_index=True)


def _render_query_editor() -> None:
    """
    Editor SQL con ejecucion libre.
    Usa DB_Extractor.execute_query().
    """
    section_header("Editor SQL")

    extractor = _get_extractor()

    query = st.text_area(
        "Consulta SQL",
        placeholder="SELECT * FROM mi_tabla LIMIT 100",
        height=140,
        label_visibility="collapsed",
        key="db_query_input",
    )

    col_btn, col_status = st.columns([1, 3])
    run = col_btn.button("Ejecutar consulta", use_container_width=True, key="db_run_query_btn")

    if run:
        if not query.strip():
            st.warning("Escribe una consulta antes de ejecutar.")
            return
        with st.spinner("Ejecutando consulta..."):
            try:
                df = extractor.execute_query(query)    # <-- DB_Extractor.execute_query()
                st.session_state[SESSION_RESULT] = df
                col_status.success(f"Consulta ejecutada — {len(df):,} registros devueltos.")
                _render_dataframe_result(df, "Resultado de la consulta")
            except Exception as exc:
                st.error(f"Error al ejecutar la consulta: {exc}")


def _render_dataframe_result(df: pd.DataFrame, title: str) -> None:
    """Renderiza un DataFrame resultado con controles de visualizacion y exportacion."""
    st.markdown(f"**{title}**")

    if df.empty:
        st.info("La consulta no devolvio registros.")
        return

    # Controles de visualizacion
    col_n, col_cols = st.columns([1, 3])
    n_rows = col_n.slider(
        "Filas a mostrar",
        min_value=5,
        max_value=min(500, len(df)),
        value=min(25, len(df)),
        step=5,
        key="db_result_rows_slider",
    )
    selected_cols = col_cols.multiselect(
        "Columnas (vacio = todas)",
        options=df.columns.tolist(),
        default=[],
        placeholder="Todas las columnas",
        key="db_result_cols_select",
    )

    display_df = df[selected_cols] if selected_cols else df
    st.dataframe(display_df.head(n_rows), use_container_width=True, height=360)

    # Metricas del resultado
    c1, c2, c3 = st.columns(3)
    mem_mb = round(df.memory_usage(deep=True).sum() / (1024 ** 2), 4)
    metric_card("Registros",    f"{len(df):,}",        c1)
    metric_card("Columnas",     len(df.columns),        c2)
    metric_card("Memoria (MB)", mem_mb,                 c3)

    _render_result_export(df)


def _render_result_export(df: pd.DataFrame) -> None:
    """Exportacion del resultado activo."""
    section_header("Exportar resultado")

    col_fmt, col_btn = st.columns([1, 2])
    export_fmt = col_fmt.selectbox(
        "Formato",
        ["CSV", "Excel"],
        label_visibility="collapsed",
        key="db_export_fmt",
    )

    if export_fmt == "CSV":
        data_bytes = df.to_csv(index=False).encode("utf-8")
        mime  = "text/csv"
        fname = "resultado_consulta.csv"
    else:
        buf = io.BytesIO()
        df.to_excel(buf, index=False)
        data_bytes = buf.getvalue()
        mime  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fname = "resultado_consulta.xlsx"

    col_btn.download_button(
        label=f"Descargar como {export_fmt}",
        data=data_bytes,
        file_name=fname,
        mime=mime,
        use_container_width=True,
        key="db_download_btn",
    )


def _render_connection_check() -> None:
    """
    Verifica el estado de la conexion en tiempo real.
    Usa DB_Extractor.check_connection_status().
    """
    extractor = _get_extractor()
    if extractor is None:
        return

    section_header("Estado de la conexion")

    col_btn, col_res = st.columns([1, 3])
    if col_btn.button("Verificar conexion", key="db_check_conn_btn"):
        with st.spinner("Verificando..."):
            is_alive = extractor.check_connection_status()   # <-- DB_Extractor.check_connection_status()
        if is_alive:
            col_res.success("La conexion esta activa.")
        else:
            col_res.error("La conexion se ha perdido. Reconecta para continuar.")
            _disconnect()
            st.rerun()


# ── Entrada pública ───────────────────────────────────────────────────────────

def render_db_extractor() -> None:
    """Renderiza la pagina completa del extractor de base de datos."""
    page_header(
        "DB Extractor",
        "Conectate a PostgreSQL, MySQL u Oracle para explorar y extraer datos.",
    )
    divider()

    # ── Conexion ──
    _render_connection_form()

    if not _is_connected():
        return

    # ── Contenido solo si hay conexion activa ──
    divider()
    _render_db_overview()
    divider()
    _render_table_explorer()
    divider()
    _render_query_editor()
    divider()
    _render_connection_check()