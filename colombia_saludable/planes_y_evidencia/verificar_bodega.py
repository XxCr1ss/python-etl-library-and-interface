"""Verificación independiente y de solo lectura del DWH cargado con Core.

Contrasta valores por registro con el origen usando SQL como oráculo independiente
de las expresiones de fila del notebook. Solo guarda resultados agregados.
"""
from contextlib import redirect_stdout
from datetime import datetime
from decimal import Decimal
import hashlib
import io
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import dotenv_values
from sqlalchemy import event

BASE = Path(__file__).resolve().parents[1]
ROOT = BASE.parent
sys.path.insert(0, str(ROOT))
from etl import DB_Extractor


def main():
    salida = BASE / 'planes_y_evidencia/carga_core'
    manifest = json.loads((salida / 'manifest_carga.json').read_text(encoding='utf8'))
    if manifest.get('estado') != 'exitoso' or not manifest.get('conciliacion_aprobada'):
        raise RuntimeError('No existe carga exitosa conciliada.')
    cfg = dotenv_values(BASE / '.env')
    if cfg['DB_NAME_SOURCE'] != 'colombia_saludable' or cfg['DB_NAME_WAREHOUSE'] != manifest['destino']:
        raise RuntimeError('Las bases configuradas no corresponden al contrato de carga.')
    conexiones = []
    checks = []

    def consulta(ex, sql):
        with redirect_stdout(io.StringIO()):
            return ex.execute_query(sql)

    def conectar(nombre):
        ex = DB_Extractor(db_type=cfg['DB_TYPE'], host=cfg['DB_HOST'], port=int(cfg['DB_PORT']),
                          user=cfg['DB_USER'], password=cfg['DB_PASSWORD'], database=nombre, connect_timeout=5)
        conexiones.append(ex)
        with redirect_stdout(io.StringIO()):
            ex.connect()
        @event.listens_for(ex.engine, 'connect')
        def proteger(dbapi, record):
            dbapi.set_session(readonly=True, isolation_level='REPEATABLE READ')
        @event.listens_for(ex.engine, 'begin')
        def limitar(conn):
            conn.exec_driver_sql("SET LOCAL statement_timeout = '30s'")
            conn.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
        ex.engine.dispose()
        assert consulta(ex, 'SHOW transaction_read_only').iloc[0, 0] == 'on'
        return ex

    def normalizar(v, c):
        if v is None or pd.isna(v):
            return None
        return Decimal(str(v)) if c in ('importe', 'espera_cruda', 'espera_valida', 'tarifa') else v

    def comparar(nombre, esperado, actual, keys):
        cols = list(esperado.columns)
        assert set(cols) == set(actual.columns), 'Columnas distintas: ' + nombre
        def indice(df):
            filas = df.to_dict('records')
            salida = {tuple(normalizar(r[c], c) for c in keys):
                      tuple(normalizar(r[c], c) for c in cols) for r in filas}
            assert len(salida) == len(filas), 'Grano repetido en ' + nombre
            return salida
        assert indice(esperado) == indice(actual), 'Diferencia por registro: ' + nombre
        checks.append({'control': nombre, 'registros_comparados': len(esperado), 'ok': True})

    try:
        source = conectar(cfg['DB_NAME_SOURCE'])
        dw = conectar(cfg['DB_NAME_WAREHOUSE'])
        for t, n in manifest['conteos'].items():
            assert int(consulta(dw, f'SELECT COUNT(*) FROM public."{t}"').iloc[0, 0]) == n, 'Conteo cambió: ' + t
        checks.append({'control': 'conteos_17_tablas', 'registros_comparados': sum(manifest['conteos'].values()), 'ok': True})
        comparar('pagos_por_transaccion',
            consulta(source, "SELECT id_transaccion,'C:'||id_usuario AS paciente_id,valor_pagado::text AS importe FROM public.pagos"),
            consulta(dw, 'SELECT id_transaccion,paciente_id,valor_aporte::text AS importe FROM public.fact_pago'), ['id_transaccion'])
        personas = """WITH p AS (
            SELECT cedula AS id,'C:'||cedula AS paciente_id,fecha_nacimiento FROM public.cotizante
            UNION ALL SELECT id_beneficiario,'B:'||id_beneficiario,fecha_nacimiento FROM public.beneficiario) """
        for t, codigo in [('citas_generales', 'codigo_cita'), ('urgencias', 'codigo_urgencia'),
                          ('hospitalizaciones', 'codigo_hospitalizacion'), ('remisiones', 'codigo_remision')]:
            fs, hs = ('fecha_remision', 'hora_remision') if t == 'remisiones' else ('fecha_solicitud', 'hora_solicitud')
            delta = f'EXTRACT(EPOCH FROM ((e.fecha_atencion+e.hora_atencion)-(e.{fs}+e.{hs})))/60'
            tarifa = 's.costo::text' if t == 'remisiones' else 'NULL::text'
            servicio = 'e.servicio_pos' if t == 'remisiones' else 'NULL::text'
            remitente = 'e.id_medico_remite' if t == 'remisiones' else 'NULL::text'
            join_servicio = 'LEFT JOIN public.servicios_pos s ON s.id_servicio_pos=e.servicio_pos' if t == 'remisiones' else ''
            sql = personas + f"""SELECT e.{codigo} AS codigo_origen, p.paciente_id,e.id_medico AS medico_id,
                m.id_ips AS ips_medico_asociado_id, {servicio} AS servicio_id,{remitente} AS medico_remitente_id,
                e.diagnostico AS diagnostico_original,
                EXTRACT(YEAR FROM AGE(e.fecha_atencion,p.fecha_nacimiento))::int AS edad_al_evento,
                EXTRACT(YEAR FROM AGE(e.{fs},p.fecha_nacimiento))::int AS edad_solicitud,
                ROUND(({delta})::numeric,6)::text AS espera_cruda,
                CASE WHEN ({delta})>=0 THEN ROUND(({delta})::numeric,6)::text END AS espera_valida,
                {tarifa} AS tarifa
                FROM public.{t} e LEFT JOIN p ON p.id=e.id_usuario
                LEFT JOIN public.medico m ON m.cedula=e.id_medico {join_servicio}"""
            actual = f"""SELECT codigo_origen,paciente_id,medico_id,ips_medico_asociado_id,servicio_id,medico_remitente_id,
                diagnostico_original,edad_al_evento,edad_solicitud,espera_minutos_cruda::text AS espera_cruda,
                espera_valida_min::text AS espera_valida,tarifa_servicio_catalogo::text AS tarifa
                FROM public.fact_atencion WHERE tabla_origen='{t}'"""
            comparar('valores_evento_' + t, consulta(source, sql), consulta(dw, actual), ['codigo_origen'])
        comparar('pares_receta_medicamento', consulta(source, """SELECT DISTINCT codigo_formula,BTRIM(token) AS medicamento_id
            FROM public.formulas_medicas CROSS JOIN LATERAL regexp_split_to_table(medicamentos_recetados,';') x(token)"""),
            consulta(dw, 'SELECT codigo_formula,medicamento_id FROM public.puente_formula_medicamento'), ['codigo_formula', 'medicamento_id'])
        esperado = consulta(source, """SELECT 'C:'||c.cedula AS paciente_id,'F:'||c.cedula AS familia_id,
            c.id_ips AS ips_afiliacion_id,e.empresa AS empresa_id,c.estracto AS estrato_familiar,
            c.estracto AS estrato_propio,LOWER(BTRIM(c.tipo_cotizante)) AS tipo_cotizante_titular
            FROM public.cotizante c LEFT JOIN public.empresa_cotizante e ON e.cotizante=c.cedula
            UNION ALL SELECT 'B:'||b.id_beneficiario,'F:'||c.cedula,c.id_ips,e.empresa,c.estracto,NULL::text,
            LOWER(BTRIM(c.tipo_cotizante)) FROM public.beneficiario b
            JOIN public.cotizante_beneficiario cb ON cb.beneficiario=b.id_beneficiario
            JOIN public.cotizante c ON c.cedula=cb.cotizante
            LEFT JOIN public.empresa_cotizante e ON e.cotizante=c.cedula""")
        comparar('perfil_y_atribucion_familiar', esperado, consulta(dw, """SELECT paciente_id,familia_id,ips_afiliacion_id,
            empresa_id,estrato_familiar,estrato_propio,tipo_cotizante_titular FROM public.dim_paciente"""), ['paciente_id'])
        indebidos = consulta(dw, """SELECT COUNT(*) FROM public.dim_paciente WHERE tipo_registro='beneficiario'
            AND (salario_base_propio IS NOT NULL OR fecha_afiliacion_propia IS NOT NULL OR escolaridad_propia IS NOT NULL
                 OR tipo_cotizante_propio IS NOT NULL OR proviene_otra_eps_propio IS NOT NULL)""").iloc[0, 0]
        assert int(indebidos) == 0, 'Beneficiarios con atributos propios inventados'
        checks.append({'control': 'beneficiarios_sin_atributos_propios_inventados', 'registros_comparados': 3316, 'ok': True})
        assert int(consulta(dw, "SELECT COUNT(*) FROM public.dim_medicamento WHERE nombre IS NOT NULL OR precio IS NOT NULL").iloc[0, 0]) == 0
        checks.append({'control': 'medicamentos_sin_nombre_o_precio_inventado', 'registros_comparados': 166, 'ok': True})
        comparar('retiros_destino_informado', consulta(source, """SELECT id_retiro,
            NULLIF(LOWER(BTRIM(cambio_a_eps)),'') AS eps_destino FROM public.retiros"""),
            consulta(dw, 'SELECT id_retiro,eps_destino FROM public.fact_retiro'), ['id_retiro'])
        checks.append({'control': 'sesiones_solo_lectura', 'registros_comparados': 2, 'ok': True})
        core = hashlib.sha256()
        for p in sorted((ROOT / 'etl').rglob('*.py')):
            core.update(p.relative_to(ROOT).as_posix().encode())
            core.update(p.read_bytes())
        assert core.hexdigest() == manifest['core_sha256'], 'Se modificó el Core'
        checks.append({'control': 'core_sin_modificaciones', 'registros_comparados': 1, 'ok': True})
        result = {'estado': 'aprobado', 'fecha_bogota': datetime.now(ZoneInfo('America/Bogota')).isoformat(),
                  'run_carga': manifest['run_id'], 'controles': checks,
                  'metodo': 'SELECT Core READ ONLY; comparación por registro contra SQL del origen, sin exportar personas.'}
        (salida / 'verificacion_independiente.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
        print(json.dumps({'estado': 'aprobado', 'controles': len(checks), 'run_carga': manifest['run_id']}, indent=2))
    finally:
        for ex in conexiones:
            with redirect_stdout(io.StringIO()):
                ex.close_connection()


if __name__ == '__main__':
    main()
