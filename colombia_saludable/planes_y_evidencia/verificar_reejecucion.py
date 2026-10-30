"""Comprueba el bloqueo de recarga y publica huellas de la carga actual.

Las lecturas usan el Core en READ ONLY. El lanzador debe bloquear --cargar
antes de escribir cuando el destino ya contiene las tablas conciliadas.
"""
from contextlib import redirect_stdout
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
from zoneinfo import ZoneInfo

from dotenv import dotenv_values
from sqlalchemy import event

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE.parent))
from etl import DB_Extractor


def main():
    carpeta = BASE / 'planes_y_evidencia/carga_core'
    manifiesto_path = carpeta / 'manifest_carga.json'
    manifiesto_bytes = manifiesto_path.read_bytes()
    carga = json.loads(manifiesto_bytes)
    independiente = json.loads((carpeta / 'verificacion_independiente.json').read_text(encoding='utf8'))
    assert carga['estado'] == 'exitoso' and carga['conciliacion_aprobada']
    assert independiente['estado'] == 'aprobado' and independiente['run_carga'] == carga['run_id']
    cfg = dotenv_values(BASE / '.env')
    assert cfg['DB_NAME_WAREHOUSE'] == carga['destino']
    assert cfg['DB_NAME_SOURCE'] != cfg['DB_NAME_WAREHOUSE']
    conexiones = []

    def conectar(database):
        ex = DB_Extractor(
            db_type=cfg['DB_TYPE'], host=cfg['DB_HOST'], port=int(cfg['DB_PORT']),
            user=cfg['DB_USER'], password=cfg['DB_PASSWORD'], database=database,
            connect_timeout=5,
        )
        conexiones.append(ex)
        with redirect_stdout(io.StringIO()):
            ex.connect()

        @event.listens_for(ex.engine, 'connect')
        def proteger(dbapi, registro):
            dbapi.set_session(readonly=True, isolation_level='REPEATABLE READ', autocommit=False)

        @event.listens_for(ex.engine, 'begin')
        def limitar(conn):
            conn.exec_driver_sql("SET LOCAL statement_timeout = '30s'")
            conn.exec_driver_sql("SET LOCAL lock_timeout = '5s'")

        ex.engine.dispose()
        return ex

    def huellas(ex, tablas):
        resultado = {}
        for tabla in sorted(tablas):
            identificador = '"' + tabla.replace('"', '""') + '"'
            with redirect_stdout(io.StringIO()):
                frame = ex.execute_query('SELECT * FROM public.' + identificador)
            filas = sorted(
                json.dumps(r, sort_keys=True, default=str, ensure_ascii=False)
                for r in frame.to_dict('records')
            )
            resultado[tabla] = hashlib.sha256('\n'.join(filas).encode('utf8')).hexdigest()
        return resultado

    try:
        dw = conectar(cfg['DB_NAME_WAREHOUSE'])
        source = conectar(cfg['DB_NAME_SOURCE'])
        antes = huellas(dw, carga['conteos'])
        cuaderno = BASE / 'cuadernos/etl_core.ipynb'
        notebook_bytes = cuaderno.read_bytes()

        # Esta prueba solo se hace sobre una carga existente y verificada.
        proceso = subprocess.run(
            [sys.executable, str(BASE / 'planes_y_evidencia/ejecutar_etl.py'), '--cargar'],
            capture_output=True, text=True, encoding='utf8', errors='replace',
            timeout=300,
        )
        assert proceso.returncode == 1, 'La carga repetida no se bloqueó como se esperaba.'
        intentos = sorted((carpeta / 'intentos').glob('*.json'), key=lambda p: p.stat().st_mtime_ns)
        ultimo = json.loads(intentos[-1].read_text(encoding='utf8'))
        assert ultimo['estado'] == 'bloqueado_prevalidacion' and ultimo['motivo'] == 'destino_no_vacio'
        assert not ultimo['tablas_cargadas'] and ultimo['destino'] == carga['destino']
        assert cuaderno.read_bytes() == notebook_bytes, 'Se sustituyó el cuaderno exitoso.'
        assert manifiesto_path.read_bytes() == manifiesto_bytes, 'Cambió el manifiesto de carga.'
        assert huellas(dw, carga['conteos']) == antes, 'La bodega cambió durante la prueba.'
        assert huellas(source, carga['huellas_origen_sha256']) == carga['huellas_origen_sha256'], 'Cambió el origen.'

        resultado = {
            'estado': 'aprobado',
            'fecha_bogota': datetime.now(ZoneInfo('America/Bogota')).isoformat(),
            'run_carga': carga['run_id'],
            'destino': carga['destino'],
            'carga_repetida_bloqueada': True,
            'codigo_salida_esperado': proceso.returncode,
            'cuaderno_preservado_ante_bloqueo': True,
            'evidencia_publicada_sin_cambios': True,
            'tablas_bodega_sin_cambios': len(antes),
            'origen_sin_cambios': True,
            'huellas_bodega_sha256': antes,
        }
        (carpeta / 'prueba_reejecucion.json').write_text(
            json.dumps(resultado, ensure_ascii=False, indent=2), encoding='utf8',
        )
        print(json.dumps({k: resultado[k] for k in ['estado', 'run_carga', 'destino', 'carga_repetida_bloqueada', 'tablas_bodega_sin_cambios']}, indent=2))
    finally:
        for ex in conexiones:
            with redirect_stdout(io.StringIO()):
                ex.close_connection()


if __name__ == '__main__':
    main()
