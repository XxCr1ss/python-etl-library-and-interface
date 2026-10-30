"""Reparación acotada de dim_paciente creada por la carga inicial de esta tarea.

Conserva NULL en procedencia de otra EPS para beneficiarios. Usa solamente Core
para leer, transformar y reemplazar esta dimensión, sin tocar otros datos.
No es un mecanismo general de recarga: exige el defecto exacto y el manifiesto
de la carga de esta tarea. Una segunda ejecución se detiene sin escribir.
"""
from contextlib import redirect_stdout
from datetime import datetime
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
from etl import DB_Extractor, DB_Loader, BasicsTransformOperations as B, ConvertOperations as C, DataSelect as S


def main():
    salida = BASE / 'planes_y_evidencia/carga_core'
    pmanifest = salida / 'manifest_carga.json'
    manifest = json.loads(pmanifest.read_text(encoding='utf8'))
    assert manifest['run_id'] == '20261022T190155_3b5f5835', 'La reparación solo aplica a la carga identificada.'
    assert manifest['estado'] == 'exitoso' and not manifest.get('correcciones'), 'Reparación no aplicable o ya ejecutada.'
    cfg = dotenv_values(BASE / '.env')
    assert cfg['DB_NAME_SOURCE'] == 'colombia_saludable' and cfg['DB_NAME_WAREHOUSE'] == 'colombia_saludable_dw_core'
    conexiones = []
    def q(ex, sql):
        with redirect_stdout(io.StringIO()):
            return ex.execute_query(sql)
    def conectar(db, ro):
        ex=DB_Extractor(db_type=cfg['DB_TYPE'],host=cfg['DB_HOST'],port=int(cfg['DB_PORT']),user=cfg['DB_USER'],
                        password=cfg['DB_PASSWORD'],database=db,connect_timeout=5)
        conexiones.append(ex)
        with redirect_stdout(io.StringIO()): ex.connect()
        @event.listens_for(ex.engine,'connect')
        def sesion(dbapi,record): dbapi.set_session(readonly=ro)
        ex.engine.dispose()
        assert q(ex,'SELECT current_database()').iloc[0,0] == db
        return ex
    def huella(df):
        rows=sorted(json.dumps(r,default=str,sort_keys=True) for r in df.to_dict('records'))
        return hashlib.sha256('\n'.join(rows).encode()).hexdigest()
    try:
        source=conectar(cfg['DB_NAME_SOURCE'],True)
        dw=conectar(cfg['DB_NAME_WAREHOUSE'],False)
        dimension=q(dw,'SELECT * FROM public.dim_paciente')
        origen=q(source,'SELECT cedula,proviene_otra_eps FROM public.cotizante')
        procedencias={r['cedula']:r['proviene_otra_eps']=='1' for r in origen.to_dict('records')}
        assert len(dimension)==manifest['conteos']['dim_paciente']
        afectados=sum(r['tipo_registro']=='beneficiario' and r['proviene_otra_eps_propio'] is False for r in dimension.to_dict('records'))
        assert afectados==manifest['conteos']['dim_paciente']-manifest['conteos']['dim_familia'], 'El defecto observado cambió.'
        for r in dimension.to_dict('records'):
            if r['tipo_registro']=='cotizante':
                assert bool(r['proviene_otra_eps_propio'])==procedencias[r['usuario_origen']]
        otros=S.select_columns(dimension,'proviene_otra_eps_propio',complement=True,show=0)
        huella_antes=huella(otros)
        # Solo se deriva el campo defectuoso; los demás valores se conservan.
        dimension=B.add_new_column(dimension,'proviene_otra_eps_propio',
            lambda r:None if r['tipo_registro']=='beneficiario' else procedencias[r['usuario_origen']],show=0)
        dimension=C.convert_column_type(dimension,['proviene_otra_eps_propio'],{'proviene_otra_eps_propio':pd.BooleanDtype()},show=0)
        # Mantener el tipo BIGINT nullable que read_sql representa como float al leer nulos.
        dimension=C.convert_column_type(dimension,['salario_base_propio'],'Int64',show=0)
        assert int(dimension['proviene_otra_eps_propio'].isna().sum())==afectados
        manifest['estado']='correccion_en_curso'
        pmanifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
        # Excepción de reparación, explícita y limitada a la tabla creada por este run.
        with redirect_stdout(io.StringIO()):
            DB_Loader(dw.engine).load_dimension(dimension,'dim_paciente',if_exists='replace',index=False)
        actual=q(dw,'SELECT * FROM public.dim_paciente')
        assert huella(S.select_columns(actual,'proviene_otra_eps_propio',complement=True,show=0))==huella_antes
        assert int(actual['proviene_otra_eps_propio'].isna().sum())==afectados
        assert len(actual)==len(dimension)
        huerfanos=q(dw,"""SELECT COUNT(*) FROM public.fact_atencion a WHERE NOT EXISTS
                    (SELECT 1 FROM public.dim_paciente p WHERE p.paciente_id=a.paciente_id)""").iloc[0,0]
        assert int(huerfanos)==0
        # Actualizar el único contrato de nulos que cambia.
        nulos=pd.read_csv(salida/'nulos_carga.csv',keep_default_na=False)
        nulos=B.add_new_column(nulos,'nulos_esperados',lambda r:afectados if r['tabla']=='dim_paciente'
                    and r['columna']=='proviene_otra_eps_propio' else int(r['nulos_esperados']),show=0)
        nulos=B.add_new_column(nulos,'nulos_cargados',lambda r:afectados if r['tabla']=='dim_paciente'
                    and r['columna']=='proviene_otra_eps_propio' else int(r['nulos_cargados']),show=0)
        nulos.to_csv(salida/'nulos_carga.csv',index=False,encoding='utf-8-sig')
        correccion={'fecha_bogota':datetime.now(ZoneInfo('America/Bogota')).isoformat(),
            'tabla':'dim_paciente','columna':'proviene_otra_eps_propio','filas_corregidas':afectados,
            'defecto':'El alias boolean del Core convierte None en False.',
            'solucion':'Parámetro pd.BooleanDtype() en convert_column_type, conservando NULL.',
            'otros_valores_sin_cambios':True,'modo':'reemplazo_acotado_dimension_creada_en_este_run_via_Core',
            'core_modificado':False}
        (salida/'correccion_nullable.json').write_text(json.dumps(correccion,ensure_ascii=False,indent=2),encoding='utf8')
        manifest.update({'estado':'exitoso','correcciones':[correccion]})
        pmanifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
        print('Dimensión corregida y validada: NULL conservado en',afectados,'beneficiarios.')
    finally:
        for ex in conexiones:
            with redirect_stdout(io.StringIO()): ex.close_connection()


if __name__=='__main__':
    main()
