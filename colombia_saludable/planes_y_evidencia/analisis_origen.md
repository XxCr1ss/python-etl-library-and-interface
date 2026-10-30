# Diagnóstico del origen y de la bodega

Fecha de revisión: 22 de octubre de 2026, zona America/Bogota. La hora precisa y las versiones están en [ejecucion_diagnostico.json](diagnostico_pre_etl/ejecucion_diagnostico.json).

Este documento describe la fotografía **previa al ETL**. Sus CSV y manifiesto se preservaron en `diagnostico_pre_etl/`; el estado actual de la bodega está en [implementacion_etl_core.md](implementacion_etl_core.md).

## Alcance y método

Se ejecutó [etl_core.ipynb](../cuadernos/etl_core.ipynb) contra las dos bases locales usando `etl.DB_Extractor`, sin backend, agente, API ni interfaz gráfica del proyecto. Después de validar la conexión se configuraron las sesiones PostgreSQL en READ ONLY. Se realizaron consultas SELECT de catálogo y agregados, con timeout por sentencia de 30 segundos y de bloqueo de 5 segundos. No se invocaron loaders ni se ejecutó DDL, INSERT, UPDATE o DELETE.

Cada consulta tiene su propia transacción REPEATABLE READ; el diagnóstico completo no mantiene un único snapshot. Los CSV son evidencia de una ejecución, no datos vivos ni una copia de la base. Las futuras ejecuciones del cuaderno actualizan los CSV y el manifiesto; este documento y los planes deben revisarse si cambian los hallazgos.

## Conectividad comprobada

| Rol | Base real | Resultado | Versión | Esquema | Sesiones analíticas |
| --- | --- | --- | --- | --- | --- |
| Origen | colombia_saludable | OK | PostgreSQL 18.3 | public | READ ONLY |
| Bodega | colombia_saludable_dw_core | OK | PostgreSQL 18.3 | public | READ ONLY |

Ambas reportan America/Bogota. La bodega no tiene tablas ni vistas visibles en los esquemas no internos consultados. Los catálogos inicial y final coinciden. Esto no certifica permisos de escritura ni ausencia de actividad externa sobre los datos. Evidencia: [conexiones.csv](diagnostico_pre_etl/conexiones.csv), [catalogo_bodega_inicial.csv](diagnostico_pre_etl/catalogo_bodega_inicial.csv), [catalogo_bodega_final.csv](diagnostico_pre_etl/catalogo_bodega_final.csv), [comprobacion_final.csv](diagnostico_pre_etl/comprobacion_final.csv).

## Estructura y volumen

Se encontraron 18 tablas, 65.793 filas en total y 16 FK declaradas. El diccionario conserva nombres reales, tipos, nulabilidad, longitudes y valores predeterminados: [diccionario_origen.csv](diagnostico_pre_etl/diccionario_origen.csv).

| Tabla | Filas | Uso previsto |
| --- | ---: | --- |
| cotizante | 1.100 | Perfil del titular y afiliación |
| beneficiario | 3.316 | Perfil del beneficiario |
| cotizante_beneficiario | 3.316 | Familia del beneficiario |
| empresa | 21 | Empleador |
| empresa_cotizante | 925 | Relación laboral actual |
| ips | 86 | Prestador y ubicación |
| medico | 720 | Profesional y prestador asociado |
| drogueria | 35 | Entidades dispensadoras, sin entregas registradas |
| ips_drogueria | 73 | Red contratada, con duplicados |
| servicios_pos | 67 | Catálogo de servicios y tarifas |
| citas_generales | 3.013 | Solicitud y atención general |
| urgencias | 559 | Solicitud y atención de urgencias |
| hospitalizaciones | 893 | Atención y duración informada |
| remisiones | 16.742 | Servicio POS, remisión y atención |
| formulas_medicas | 7.484 | Cabecera de receta y lista de códigos |
| pagos | 22.938 | Aportes recibidos de cotizantes |
| retiros | 89 | Salida y eventual EPS de destino |
| preexistencias | 4.416 | Antecedente de un familiar del afiliado |

Hay 4.416 personas entre ambos tipos de registro, sin colisiones de identificador observadas. Los 21.207 registros de citas, urgencias, hospitalizaciones y remisiones son **eventos de tablas distintas**: no equivalen a 21.207 episodios clínicos independientes. No existe una llave común de episodio que permita deduplicarlos como una sola atención. Evidencia: [volumen_origen.csv](diagnostico_pre_etl/volumen_origen.csv).

## Relaciones y grano

Las 16 FK declaradas no tienen huérfanos. Sin embargo, varias relaciones esenciales no están declaradas: `id_usuario` en hechos asistenciales y fórmulas; `medico.id_ips`; y la persona en preexistencias. Todas las correspondencias evaluadas resultaron válidas.

| Tabla | Eventos de cotizantes | Eventos de beneficiarios | Sin correspondencia o ambiguos |
| --- | ---: | ---: | ---: |
| citas_generales | 1.353 | 1.660 | 0 |
| urgencias | 256 | 303 | 0 |
| hospitalizaciones | 389 | 504 | 0 |
| remisiones | 7.281 | 9.461 | 0 |
| formulas_medicas | 3.327 | 4.157 | 0 |

Cada beneficiario tiene un único titular observado; no hay beneficiarios sin familia. No se detectaron cotizantes con varias empresas. Hay 175 cotizantes sin relación empresarial: deben conservarse y clasificarse como sin empresa registrada, sin presumir un error ni asignarles una empresa artificial.

Las tablas `cotizante_beneficiario`, `ips_drogueria` y `preexistencias` no tienen PK. Solo `ips_drogueria` tiene registros exactamente repetidos: cuatro copias adicionales; su grano lógico único produce 69 pares IPS–droguería. No se deben expandir hechos por este puente. La relación laboral y la familiar no tienen vigencia histórica.

Evidencia: [integridad_fk_declaradas.csv](diagnostico_pre_etl/integridad_fk_declaradas.csv), [correspondencia_usuarios.csv](diagnostico_pre_etl/correspondencia_usuarios.csv), [controles_negocio.csv](diagnostico_pre_etl/controles_negocio.csv), [duplicados.csv](diagnostico_pre_etl/duplicados.csv).

## Calidad y calendario

El perfil por columna no encontró nulos SQL; esto no implica completitud semántica. Se observaron:

- `ips.nivel`: 59 textos vacíos; valorar si el nivel solo aplica a hospitales antes de marcarlo como error.
- `medico.subespecialidad`: 627 textos vacíos; no todos los médicos requieren subespecialidad.
- `medico.direccion_consultorio`: 696 textos vacíos; no es un atributo necesario para las preguntas analíticas.
- `retiros.cambio_a_eps`: 41 textos vacíos, sin causa de retiro explícita.
- `cotizante.nivel_escolaridad`: 276 valores literales `N/A`, distintos de un nulo SQL.
- Variantes de mayúsculas y espacios, por ejemplo `Clinica`, `clinica ` y `Clinica `, además de etiquetas diagnósticas con diferencias de escritura. Debe conservarse el original junto al valor normalizado.
- El campo de estrato se llama `estracto` y presenta categorías 1 a 5. El tipo de cotizante usa `Empleado`, `Jubilado` e `Independiente`; no usa los códigos numéricos del relato del PDF. Escolaridad también difiere del relato.

Los eventos y pagos pertenecen a 2006–2008; las atenciones llegan al 9 de diciembre de 2008. Afiliaciones de cotizantes: 1 de enero de 2006 a 25 de noviembre de 2007. No debe usarse el salario mínimo, calendario de vacaciones ni la edad de 2026 para evaluar hechos históricos. No se verificaron reglas legales externas porque esta tarea analiza el conjunto académico, no determina cumplimiento legal.

| Evento | Esperas incompletas | Esperas negativas | Tratamiento propuesto |
| --- | ---: | ---: | --- |
| Cita general | 0 | 0 | Solicitud a atención |
| Urgencia | 0 | 0 | Solicitud a atención |
| Hospitalización | 0 | 0 | Solicitud a atención; no confundir con estancia |
| Remisión | 0 | 497 | Conservar registro; excluir diferencia negativa del promedio |

Las 497 esperas negativas representan aproximadamente el 2,97 % de las remisiones. Las diferencias van desde -120 hasta 86.400 minutos. Deben exponerse el número válido y el excluido con cada indicador; nunca corregir con valor absoluto o cero. No se observaron eventos anteriores al nacimiento ni edades superiores a 120 años en los cuatro tipos evaluados.

`fecha_solicitud` no certifica la fecha de asignación de una cita. El indicador disponible es solicitud a atención. `duracion_hospitalizacion` va de 1 a 10, pero su unidad no está declarada en el esquema ni en el taller; queda por confirmar antes de expresarla en días o estimar camas ocupadas.

Evidencia: [perfil_columnas.csv](diagnostico_pre_etl/perfil_columnas.csv), [distribuciones_catalogos.csv](diagnostico_pre_etl/distribuciones_catalogos.csv), [tiempos_eventos.csv](diagnostico_pre_etl/tiempos_eventos.csv), [edades_eventos.csv](diagnostico_pre_etl/edades_eventos.csv).

## Medicamentos y costos

Las 7.484 fórmulas contienen 15.770 tokens separados por `;`, con 166 códigos distintos. No hay tokens vacíos ni códigos repetidos dentro de una misma fórmula. **Ninguno de los 15.770 tokens tiene correspondencia en `servicios_pos`.** No existe otra tabla de medicamentos, precios o entregas en el catálogo observado.

Por tanto, se pueden estudiar frecuencia y coformulación por código. No se pueden asignar nombres, condición genérico/comercial, dosis, cantidades, precio ni costo de receta. El conteo de tokens mide presencia en recetas, no unidades dispensadas.

Las 16.742 remisiones sí enlazan a `servicios_pos`, todas con tarifa informada. La búsqueda textual de `cirug` encuentra 960 remisiones; es una clasificación provisional que requiere un mapeo explícito de los 67 servicios, conservado como evidencia antes de cargar. Una tarifa por remisión permite estimaciones parciales; no informa costo real facturado ni vigencia del precio.

Los valores de `pagos.valor_pagado` son aportes. No son costo de atención, de familia ni gasto de la EPS. No hay detalle de factura o costo asociado a citas, urgencias y hospitalizaciones. No se deben inventar tarifas para esas tablas ni equiparar aportes con gasto asistencial.

Evidencia: [calidad_medicamentos.csv](diagnostico_pre_etl/calidad_medicamentos.csv), [catalogo_medicamentos_observados.csv](diagnostico_pre_etl/catalogo_medicamentos_observados.csv), [catalogo_servicios.csv](diagnostico_pre_etl/catalogo_servicios.csv), [cobertura_tarifas.csv](diagnostico_pre_etl/cobertura_tarifas.csv).

## Interpretación de perfiles y cobertura

`preexistencias.familiar` contiene Mama, Papa, Tia, Tio, Hermano y Hermana. Describe antecedentes familiares y no una enfermedad confirmada del usuario. Los diagnósticos de hechos son texto libre: incluyen enfermedades, controles y frases como “Sin novedad”. Las agrupaciones clínicas requieren un catálogo explícito y no se inferirán diagnósticos desde medicamentos.

Municipio y departamento son atributos de la IPS; el cotizante tiene una IPS asignada, pero no un municipio residencial estructurado. El médico está asociado actualmente a una IPS; no existe una IPS registrada por cada hecho. Las consultas geográficas deben distinguir **IPS asociada al médico** e **IPS de afiliación**, sin presentar la primera como lugar de atención históricamente certificado. No hay catálogo de regionales administrativas.

Faltan vencimiento, período de aporte, obligación esperada y motivo de retiro: no se identifican mora ni retiros por mora. Hay 48 retiros con EPS de destino y 41 sin destino informado; estos últimos no se clasificarán como morosos. No hay camas, turnos o agenda para medir ocupación real. No existe fecha de afiliación propia del beneficiario ni historia de cambios de perfil.

El [plan de respuestas](plan_answers.md) cubre todos los puntos del taller y distingue respuesta disponible, aproximación y dato ausente. Se puede planificar `answers.ipynb` desde ahora; los resultados deberán calcularse después de cargar y validar la bodega.
