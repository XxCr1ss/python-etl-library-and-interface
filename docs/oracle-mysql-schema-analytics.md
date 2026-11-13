# Carga con esquema explícito y analítica en Oracle y MySQL

La aplicación usa MySQL 8.4 con tablas InnoDB y `PyMySQL`. El perfil de Oracle usa Oracle Free 23.26.3 y `python-oracledb` en modo Thin. El código usa tipos y expresiones disponibles en Oracle 19c, cuya validación requiere ejecutar la suite en una instancia 19c desechable.

## Carga y recuperación

1. En **Carga**, configura tipos y claves y aplica el esquema. Actualiza la vista previa de Transformación y comprueba el destino. **Revisar impacto sin escribir** indica las acciones previstas y los conteos. El backend vuelve a comprobar la estructura y los datos al ejecutar.
2. `fail` crea una tabla nueva. `append` agrega filas a una tabla compatible. `schema_only` prepara una tabla vacía o agrega estructura compatible a una existente. Para `reload`, aplica primero los cambios de estructura con `schema_only`; la recarga borra e inserta filas en una transacción que conserva el objeto.
3. En `replace`, la aplicación prepara una tabla auxiliar, escribe y comprueba su conteo antes de publicarla. MySQL publica con un único `RENAME TABLE`. Oracle publica con renombres consecutivos, durante los que el nombre de destino puede quedar temporalmente indisponible. Si falla el segundo renombre y el estado permite hacerlo, se restaura el nombre anterior. La operación rechaza dependencias y permisos detectados que podrían perderse. Usa `reload` para una tabla de estructura compatible que deba conservar su identidad. [MySQL](https://dev.mysql.com/doc/refman/8.4/en/rename-table.html) · [Oracle](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/RENAME.html)
4. Oracle y MySQL pueden confirmar cambios de estructura antes de que termine la carga. Ante un resultado que requiere conciliación, revisa el destino y sus restricciones antes de repetir. Para un reemplazo interrumpido, los nombres `etl_stg_*` y `etl_bak_*` identifican la tabla preparada y la copia anterior. Conserva la copia hasta confirmar qué tabla contiene los datos esperados y cuáles son sus permisos y dependencias. Si el nombre de destino está ausente y la copia anterior conserva los datos esperados, el responsable de la base puede restaurar ese nombre. Una nueva carga rechaza las tablas auxiliares pendientes.

Las cadenas indexadas en tablas nuevas se limitan a 191 caracteres. Normaliza cadenas vacías antes de cargar Oracle, donde se almacenan como `NULL`. Los booleanos estructurados usan una representación de 0/1 con comprobación de valores. Las marcas temporales con zona conservan el instante UTC. En MySQL se usa `TIMESTAMP(6)` y se aplica el rango de ese tipo. Para fechas fuera de ese rango, usa una fecha u hora local cuando el contrato del campo lo permita.

Para un destino local por agente, actualiza `etl_agent.py` y ejecuta con `--allow-load`. La negociación verifica la capacidad del motor. En Trabajos ETL, la reanudación requiere verificar estructura y contenido. Una coincidencia de conteo por sí sola es insuficiente.

## Bodega de datos

Conecta el destino y abre **Análisis avanzados y reportes**. Los percentiles continuos se calculan en SQL ordenando e interpolando valores decimales. Las semanas ISO comienzan el lunes. Las zonas con nombre en MySQL dependen de las tablas de zonas del servidor. UTC puede usarse con el desplazamiento `+00:00`. En MySQL se informa consistencia por sentencia porque el catálogo puede contener tablas no transaccionales.

## Ejecutar los perfiles de prueba

Configura `ETL_TEST_MYSQL_HOST`, `PORT`, `NAME`, `USER` y `PASSWORD` con el prefijo `ETL_TEST_MYSQL_`. Para Oracle usa `ETL_TEST_ORACLE_` y agrega `ETL_TEST_ORACLE_SERVICE_NAME`. La base lógica y el usuario de Oracle comienzan por `etl_test`. Usa instancias desechables. En CI, `ETL_REQUIRED_TEST_ENGINES=mysql,oracle` exige ambos perfiles.

```bash
python -m pytest -c backend/pytest.ini backend/tests/integration/test_load_other_engines.py backend/tests/integration/test_warehouse_other_engines.py -m integration
cd frontend
npm run test:e2e:real -- other-engines.spec.ts
```

Playwright usa además las variables PostgreSQL del perfil real para iniciar el entorno base. Los resultados públicos contienen el estado de las pruebas y excluyen capturas, trazas y errores crudos. [Configuración de cobertura](test-coverage.md)
