"""Contrasta las exportaciones principales contra cálculos independientes del DWH.

Solo lectura mediante Core. No consulta el origen ni exporta personas.
El oráculo de recetas y pagos usa Python para contrastar las agregaciones SQL.
"""
from collections import Counter, defaultdict
from contextlib import redirect_stdout
from datetime import datetime
from decimal import Decimal
import io
from itertools import combinations
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import dotenv_values
from sqlalchemy import event

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE.parent))
from etl import DB_Extractor


def main():
    carpeta=BASE/'planes_y_evidencia/respuestas'
    m=json.loads((carpeta/'manifest_respuestas.json').read_text(encoding='utf8'))
    assert m['estado']=='exitoso'
    p=m['parametros']
    assert p['FECHA_INICIO']=='2006-01-01' and p['FECHA_FIN']=='2008-12-31'
    assert not any(p[k] for k in ['TIPOS_ATENCION','IPS','DEPARTAMENTOS','SEXOS','GRUPOS_EDAD']), 'Validar la selección principal completa.'
    d=carpeta/m['directorio']
    c=dotenv_values(BASE/'.env')
    carga=json.loads((BASE/'planes_y_evidencia/carga_core/manifest_carga.json').read_text(encoding='utf8'))
    assert c['DB_NAME_WAREHOUSE']==carga['destino'], 'Destino distinto de la carga verificada.'
    assert m['run_carga']==carga['run_id'], 'Respuestas de otra carga.'
    e=DB_Extractor(db_type=c['DB_TYPE'],host=c['DB_HOST'],port=int(c['DB_PORT']),user=c['DB_USER'],
                   password=c['DB_PASSWORD'],database=c['DB_NAME_WAREHOUSE'],connect_timeout=5)
    checks=[]
    def q(sql):
        with redirect_stdout(io.StringIO()):return e.execute_query(sql)
    def csv(nombre):return pd.read_csv(d/(nombre+'.csv'),dtype=str,keep_default_na=False)
    def ok(nombre,condicion):
        assert condicion,nombre
        checks.append({'control':nombre,'ok':True})
    try:
        with redirect_stdout(io.StringIO()):e.connect()
        @event.listens_for(e.engine,'connect')
        def lectura(dbapi,record):dbapi.set_session(readonly=True)
        e.engine.dispose()
        ok('conexion_read_only',q('SHOW transaction_read_only').iloc[0,0]=='on')
        # Recetas: cálculo independiente de frecuencia y pares desde el texto original en DWH.
        codigos=Counter();pares=Counter()
        formulas=q('SELECT medicamentos_recetados_original FROM public.fact_formula')
        for valor in formulas.medicamentos_recetados_original:
            s=sorted(set(x.strip() for x in valor.split(';') if x.strip()))
            codigos.update(s);pares.update(combinations(s,2))
        f=csv('p03_frecuencia_medicamentos')
        actual={r.codigo:int(r.recetas) for r in f.itertuples()}
        ok('frecuencias_recetas_vs_counter_independiente',actual==dict(codigos))
        pp=csv('p04_coformulacion')
        actual_pares={(r.codigo_a,r.codigo_b):int(r.recetas_juntas) for r in pp.itertuples()}
        ok('pares_recetas_vs_combinations_independiente',actual_pares==dict(pares))
        ok('soportes_de_pares',all(abs(Decimal(r.soporte_pct)-Decimal(100)*int(r.recetas_juntas)/len(formulas))<=Decimal('.0051') for r in pp.itertuples()))
        # Aportes: agrupar transacciones en Python; no depender del SELECT de respuestas.
        aportes=defaultdict(lambda:[Decimal(0),0])
        for r in q('SELECT paciente_id,valor_aporte::text AS importe FROM public.fact_pago').itertuples():
            aportes[r.paciente_id][0]+=Decimal(r.importe);aportes[r.paciente_id][1]+=1
        esperado=Counter((v[0],v[1]) for v in aportes.values())
        fa=csv('p02_aportes_afiliado_anonimo')
        actual=Counter((Decimal(r.aporte_total),int(r.transacciones)) for r in fa.itertuples())
        ok('aportes_por_afiliado_sin_multiplicacion',actual==esperado)
        # Eventos y pacientes: conteos directos independientes de BASE_SQL.
        hechos=q('SELECT paciente_id,fecha_atencion,fecha_solicitud,tarifa_servicio_catalogo::text AS tarifa FROM public.fact_atencion')
        glob=csv('p05_utilizacion_global').iloc[0]
        n=len(hechos);personas=len(set(hechos.paciente_id))
        ok('denominador_atendidos_distintos',int(glob.eventos)==n and int(glob.pacientes_atendidos)==personas)
        ok('media_global_no_promedio_de_medias',abs(Decimal(glob.eventos_por_atendido)-Decimal(n)/personas)<=Decimal('.000051'))
        at=Counter(str(x)[:7] for x in hechos.fecha_atencion);sol=Counter(str(x)[:7] for x in hechos.fecha_solicitud)
        meses=csv('p07_series_mensuales')
        ok('series_por_rol_de_fecha',all(int(r.atenciones)==at.get(r.mes,0) and int(r.solicitudes)==sol.get(r.mes,0) for r in meses.itertuples()))
        pagos_total=sum((v[0] for v in aportes.values()),Decimal(0))
        ok('suma_aportes_exacta',pagos_total==Decimal('8548421149.00'))
        tarifas_total=sum((Decimal(r.tarifa) for r in hechos.itertuples() if pd.notna(r.tarifa)),Decimal(0))
        p08=csv('p08_estimacion_tarifa').iloc[0]
        ok('estimacion_tarifas_exacta',Decimal(p08.tarifa_total)==tarifas_total==Decimal('4380604114.00'))
        # Cohortes: formar conjuntos de pacientes, después sumar sus remisiones.
        dx=q("""SELECT a.paciente_id,d.grupo_textual FROM public.fact_atencion a
                  JOIN public.dim_diagnostico d USING(diagnostico_id)
                  WHERE d.clase_texto='diagnostico_observado'""")
        cohortes=defaultdict(set)
        for r in dx.itertuples():cohortes[r.grupo_textual].add(r.paciente_id)
        p09=csv('p09_cohortes_diagnosticas')
        for r in p09.itertuples():
            grupo=cohortes[r.grupo]
            total=sum((Decimal(v.tarifa) for v in hechos.itertuples() if v.paciente_id in grupo and pd.notna(v.tarifa)),Decimal(0))
            ok('cohorte_'+r.grupo,int(r.pacientes_cohorte)==len(grupo) and Decimal(r.tarifa_cohorte)==total)
        ok('sin_costo_recetas_inventado',json.loads((d/'respuestas.json').read_text(encoding='utf8'))['P11']['estado']=='no_calculable')
        p14=csv('p14_resumen_retiros')
        retiros={r.grupo_retiro:int(r.retiros) for r in p14.itertuples()}
        ok('retiros_desconocidos_no_son_mora',retiros=={'Cambio informado':48,'Destino desconocido':41})
        # También comprobar las ejecuciones de prueba guardadas, sin sustituir la principal.
        pruebas=[]
        for folder in sorted((carpeta/'ejecuciones').iterdir()):
            file=folder/'manifest_respuestas.json'
            if not file.exists():continue
            test=json.loads(file.read_text(encoding='utf8'))
            if test.get('run_carga')!=m['run_carga']:continue
            params=test['parametros']
            if params['SEXOS']==['f'] and params['DEPARTAMENTOS']==['valle del cauca'] and params['GRUPOS_EDAD']==['45-64']:
                calidad=pd.read_csv(folder/'calidad_seleccion.csv')
                ok('filtros_aplicados_a_subconjunto',0<int(calidad.iloc[0].eventos)<n and test['bodega_sin_cambios'])
                pruebas.append({'tipo':'seleccion_filtrada','run':test['run_respuestas'],'eventos':int(calidad.iloc[0].eventos)})
            if params['FECHA_INICIO']=='2004-01-01':
                calidad=pd.read_csv(folder/'calidad_seleccion.csv')
                ok('seleccion_vacia_sin_graficas_ficticias',int(calidad.iloc[0].eventos)==0 and len(test['figuras'])==0 and test['bodega_sin_cambios'])
                pruebas.append({'tipo':'seleccion_vacia','run':test['run_respuestas'],'eventos':0})
        ok('ambas_pruebas_de_parametros_ejecutadas',{r['tipo'] for r in pruebas}=={'seleccion_filtrada','seleccion_vacia'})
        result={'estado':'aprobado','fecha_bogota':datetime.now(ZoneInfo('America/Bogota')).isoformat(),
                'run_respuestas':m['run_respuestas'],'controles':checks,'pruebas_parametros':pruebas,
                'solo_bodega':True,'datos_personales_exportados':False,
                'metodo':'Core READ ONLY; contadores y conjuntos Python independientes de las agregaciones SQL.'}
        (carpeta/'verificacion_respuestas.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
        print(json.dumps({'estado':'aprobado','controles':len(checks),'pruebas_parametros':len(pruebas)},indent=2))
    finally:
        with redirect_stdout(io.StringIO()):e.close_connection()


if __name__=='__main__':main()
