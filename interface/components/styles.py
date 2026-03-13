"""
Estilos globales y helpers de UI para la interfaz ETL.
"""
import streamlit as st


# ── Paleta de colores ──────────────────────────────────────────────────────────
COLORS = {
    "primary":     "#4F46E5",
    "primary_lt":  "#EEF2FF",
    "success":     "#10B981",
    "success_lt":  "#ECFDF5",
    "warning":     "#F59E0B",
    "warning_lt":  "#FFFBEB",
    "danger":      "#EF4444",
    "danger_lt":   "#FEF2F2",
    "neutral":     "#6B7280",
    "neutral_lt":  "#F9FAFB",
    "border":      "#E5E7EB",
    "text":        "#111827",
    "text_muted":  "#6B7280",
}


def inject_global_css() -> None:
    st.markdown(f"""
    <style>
        .main .block-container {{
            padding-top: 2rem;
            padding-bottom: 3rem;
            max-width: 1100px;
        }}

        [data-testid="stSidebar"] {{
            background: {COLORS["text"]} !important;
        }}
        [data-testid="stSidebar"] * {{
            color: #F9FAFB !important;
        }}
        [data-testid="stSidebar"] .stRadio label {{
            font-size: 0.95rem;
            padding: 0.3rem 0;
        }}

        .etl-page-title {{
            font-size: 1.9rem;
            font-weight: 700;
            color: {COLORS["text"]};
            margin-bottom: 0.25rem;
        }}
        .etl-page-subtitle {{
            color: {COLORS["text_muted"]};
            font-size: 1rem;
            margin-bottom: 1.5rem;
        }}

        .metric-card {{
            background: {COLORS["neutral_lt"]};
            border: 1px solid {COLORS["border"]};
            border-radius: 10px;
            padding: 1rem 1.25rem;
            text-align: center;
        }}
        .metric-card .metric-value {{
            font-size: 1.6rem;
            font-weight: 700;
            color: {COLORS["primary"]};
        }}
        .metric-card .metric-label {{
            font-size: 0.8rem;
            color: {COLORS["text_muted"]};
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}

        .section-header {{
            font-size: 1.1rem;
            font-weight: 600;
            color: {COLORS["text"]};
            border-left: 4px solid {COLORS["primary"]};
            padding-left: 0.75rem;
            margin: 1.5rem 0 0.75rem 0;
        }}

        .feature-card {{
            border: 1px solid {COLORS["border"]};
            border-radius: 12px;
            padding: 1.5rem;
            background: white;
            height: 100%;
        }}
        .feature-card .fc-title {{
            font-size: 1.1rem;
            font-weight: 700;
            color: {COLORS["text"]};
            margin-bottom: 0.3rem;
        }}
        .feature-card .fc-desc {{
            font-size: 0.88rem;
            color: {COLORS["text_muted"]};
            line-height: 1.5;
        }}
        .feature-card .fc-tag {{
            display: inline-block;
            margin-top: 0.75rem;
            background: {COLORS["primary_lt"]};
            color: {COLORS["primary"]};
            border-radius: 6px;
            padding: 0.15rem 0.6rem;
            font-size: 0.78rem;
            font-weight: 600;
        }}

        .etl-divider {{
            border: none;
            border-top: 1px solid {COLORS["border"]};
            margin: 1.5rem 0;
        }}

        .upload-hint {{
            background: {COLORS["primary_lt"]};
            border: 1.5px dashed {COLORS["primary"]};
            border-radius: 10px;
            padding: 1rem 1.25rem;
            color: {COLORS["primary"]};
            font-size: 0.9rem;
            margin-bottom: 1rem;
            text-align: center;
        }}
    </style>
    """, unsafe_allow_html=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def page_header(title: str, subtitle: str = "", icon: str = "") -> None:
    prefix = f"{icon} " if icon else ""
    st.markdown(f'<p class="etl-page-title">{prefix}{title}</p>', unsafe_allow_html=True)
    if subtitle:
        st.markdown(f'<p class="etl-page-subtitle">{subtitle}</p>', unsafe_allow_html=True)


def section_header(text: str) -> None:
    st.markdown(f'<p class="section-header">{text}</p>', unsafe_allow_html=True)


def metric_card(label: str, value, col) -> None:
    col.markdown(f"""
    <div class="metric-card">
        <div class="metric-value">{value}</div>
        <div class="metric-label">{label}</div>
    </div>
    """, unsafe_allow_html=True)


def divider() -> None:
    st.markdown('<hr class="etl-divider">', unsafe_allow_html=True)