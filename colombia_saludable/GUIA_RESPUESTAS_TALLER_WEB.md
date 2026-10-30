# Guía de respuestas del taller en la interfaz web desplegada

Actualizada el 30 de octubre de 2026.

Esta guía configura P01–P14 desde **Bodega de datos → Análisis avanzados y reportes**. Usa la aplicación ya desplegada con tu sesión habitual. Los pasos de extracción, carga y preparación de claves están en [GUIA_ETL_WEB.md](GUIA_ETL_WEB.md); la finalidad de cada tabla está en [DICCIONARIO_Y_PROPOSITO_TABLAS.md](DICCIONARIO_Y_PROPOSITO_TABLAS.md).

## 1. Elegir la ruta que corresponde a tus tablas

| Tablas del catálogo | Ruta de esta guía | Procedencia |
| --- | --- | --- |
| `web_fact_atencion`, `web_dim_paciente`, `web_dim_ips` | [2. Respuestas con tablas web](#2-respuestas-con-tablas-web) | ETL realizado desde la interfaz |
| `fact_atencion`, `dim_paciente`, `dim_ips` | [3. Respuestas con la bodega del cuaderno](#3-respuestas-con-la-bodega-del-cuaderno) | Carga de `etl_core.ipynb` |

Las dos rutas están escritas por completo para que cada panel pueda seguirse sin volver a una sección de acciones comunes. No necesitas crear `web_*` si vas a consultar la bodega del cuaderno, ni ejecutar otra vez el ETL para consultar tablas ya cargadas.

Las diferencias no son únicamente el prefijo: en `web_dim_ips` el nombre es `ips_nombre`, en `dim_ips` es `nombre`; en `web_dim_empresa` es `empresa_nombre`, en `dim_empresa` es `nombre`. La temporada es `temporada` en web y `temporada_convencional` en el cuaderno. Web guarda `grupo_textual`/`clase_texto` en atención; el cuaderno los obtiene de `dim_diagnostico`. Cada ruta usa los nombres correspondientes.

Los paneles consultan la base `colombia_saludable_dw_core`, esquema `public`. Usa las credenciales y el host de tu propia bodega. En conexión directa `localhost` identifica al backend remoto; con el agente local identifica el equipo del agente. La consulta es de lectura. Si falta una PK/UNIQUE de relación, la preparación estructural se documenta aparte en la guía ETL.

El período de comparación es **2006-01-01 a 2008-12-31**, zona **America/Bogota**; los perfiles usan corte **2008-12-09**. Los conteos de referencia proceden de la fotografía documentada del 22 de octubre, no son valores que debas introducir ni garantía del estado actual de tus datos. La cobertura de los últimos meses es incompleta.

Los identificadores de personas, familias y médicos de la bodega no se convierten automáticamente en los alias anónimos del cuaderno. Las medidas de conteo usan unidad `count`, las esperas `minutes`, las tarifas/aportes `origen_money`; esta última no certifica que la moneda sea COP.

| Pregunta | Tema y salida disponible |
| --- | --- |
| P01 | Esperas desde solicitud/remisión; medias, tendencia y distribución |
| P02 | Prestadores, filtros geográficos, aportes y tarifa parcial familiar |
| P03 | Tarifas parciales por segmento y frecuencia de medicamentos |
| P04 | Pares/coocurrencia y frecuencia individual |
| P05 | Utilización sobre atendidos y sobre registrados |
| P06 | Actividad por temporada; ocupación real no disponible |
| P07 | Atención, solicitud, espera y diagnóstico por período |
| P08 | Tarifa por remisión/persona y cobertura, sin costo real completo |
| P09 | Cohortes diagnósticas y sus tarifas parciales |
| P10 | Demanda geográfica y retiros, sin atribución a mora |
| P11 | Cobertura de recetas; costo no calculable |
| P12 | Procedencia y perfiles propios de cotizantes; pagos tardíos no identificables |
| P13 | Clasificación textual por sexo, edad y estrato |
| P14 | EPS destino y perfil de retiros |

## 2. Respuestas con tablas web

**Ir a un panel de esta ruta:**

- [P01A: Espera de citas generales, solicitud a atención](#web-p01a)
- [P01A-mes: Tendencia mensual de espera de citas generales](#web-p01a-mes)
- [P01B: Espera de cirugías, solicitud a atención](#web-p01b)
- [P01B-mes: Tendencia mensual de espera de cirugías](#web-p01b-mes)
- [P01C: Distribución de esperas de citas generales](#web-p01c)
- [P01D: Distribución de esperas de cirugías](#web-p01d)
- [P02-valores: Departamentos y municipios disponibles de las IPS](#web-p02-valores)
- [P02A: Prestadores con más pacientes atendidos](#web-p02a)
- [P02A-departamento: Prestadores de un departamento](#web-p02a-departamento)
- [P02A-ganadora: IPS con más personas atendidas en un departamento](#web-p02a-ganadora)
- [P02A-municipio: Prestadores de un municipio y departamento](#web-p02a-municipio)
- [P02A-todas: IPS de todas las regiones con actividad](#web-p02a-todas)
- [P02B: Aportes por cotizante](#web-p02b)
- [P02C: Aportes por familia](#web-p02c)
- [P02D: Aportes por empresa](#web-p02d)
- [P02E: Aportes por municipio de IPS de afiliación](#web-p02e)
- [P02F: Aportes por departamento de IPS de afiliación](#web-p02f)
- [P02G: Tarifas de remisiones por familia](#web-p02g)
- [P03A: Tarifas de remisiones por estrato familiar](#web-p03a)
- [P03B: Tarifas de remisiones por tipo de cotizante titular](#web-p03b)
- [P03C: Tarifas de remisiones por grupo de edad](#web-p03c)
- [P03D: Frecuencia individual de medicamentos por período](#web-p03d)
- [P04A: Medicamentos formulados juntos](#web-p04a)
- [P04B: Frecuencia individual de medicamentos por período](#web-p04b)
- [P05A: Utilización por persona atendida](#web-p05a)
- [P05A-edad: Utilización por edad](#web-p05a-edad)
- [P05A-sexo: Utilización por sexo](#web-p05a-sexo)
- [P05A-sexo-edad: Utilización por sexo y edad](#web-p05a-sexo-edad)
- [P05B: Eventos por persona registrada, incluyendo ceros](#web-p05b)
- [P06A: Actividad por temporada](#web-p06a)
- [P06B: Eventos por día calendario y temporada](#web-p06b)
- [P06C: Actividad de hospitales por temporada](#web-p06c)
- [P06D: Actividad de médicos por temporada](#web-p06d)
- [P07A: Atenciones mensuales](#web-p07a)
- [P07B: Solicitudes mensuales](#web-p07b)
- [P07C: Espera mensual por fecha de atención](#web-p07c)
- [P07D: Demanda por día de semana de solicitud](#web-p07d)
- [P07D-matriz: Demanda por mes y día de semana](#web-p07d-matriz)
- [P07E: Personas con diagnóstico textual observado por mes](#web-p07e)
- [P08A: Tarifa de remisiones por persona atendida y por remisión](#web-p08a)
- [P08A-mes: Tarifa media mensual de remisiones](#web-p08a-mes)
- [P08B: Cobertura de tarifas sobre toda la atención](#web-p08b)
- [P09-tamano-renal: Personas con diagnóstico textual de deficiencia renal](#web-p09-tamano-renal)
- [P09-tamano-vih: Personas con diagnóstico textual de VIH/SIDA](#web-p09-tamano-vih)
- [P09A-renal: Tarifa de toda la atención tarifada de la cohorte deficiencia renal](#web-p09a-renal)
- [P09A-vih: Tarifa de toda la atención tarifada de la cohorte VIH/SIDA](#web-p09a-vih)
- [P09B-renal: Tarifas de eventos con diagnóstico textual de deficiencia renal](#web-p09b-renal)
- [P09B-vih: Tarifas de eventos con diagnóstico textual de VIH/SIDA](#web-p09b-vih)
- [P10A: Solicitudes por departamento de IPS asociada al médico](#web-p10a)
- [P10B: Retiros observados por mes](#web-p10b)
- [P10C: Retiros con destino informado y desconocido](#web-p10c)
- [P11A: Cobertura de cabeceras de recetas](#web-p11a)
- [P11B: Cobertura de presencias y códigos de medicamentos](#web-p11b)
- [P12-no-edad: Perfil por edad al corte de cotizantes que no provienen de otra EPS](#web-p12-no-edad)
- [P12-no-escolaridad: Perfil por escolaridad propia de cotizantes que no provienen de otra EPS](#web-p12-no-escolaridad)
- [P12-no-estrato: Perfil por estrato propio de cotizantes que no provienen de otra EPS](#web-p12-no-estrato)
- [P12-no-sexo: Perfil por sexo de cotizantes que no provienen de otra EPS](#web-p12-no-sexo)
- [P12-no-tipo: Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS](#web-p12-no-tipo)
- [P12-si-edad: Perfil por edad al corte de cotizantes que sí provienen de otra EPS](#web-p12-si-edad)
- [P12-si-escolaridad: Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS](#web-p12-si-escolaridad)
- [P12-si-estrato: Perfil por estrato propio de cotizantes que sí provienen de otra EPS](#web-p12-si-estrato)
- [P12-si-sexo: Perfil por sexo de cotizantes que sí provienen de otra EPS](#web-p12-si-sexo)
- [P12-si-tipo: Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS](#web-p12-si-tipo)
- [P12A: Procedencia de otras EPS de los cotizantes al corte](#web-p12a)
- [P13A: Diagnósticos textuales observados por sexo](#web-p13a)
- [P13B: Diagnósticos textuales observados por grupo de edad](#web-p13b)
- [P13C: Diagnósticos textuales observados por estrato familiar](#web-p13c)
- [P13D: Enfermedad, sexo y edad dentro de un estrato familiar](#web-p13d)
- [P13E: Cobertura de clasificación de textos diagnósticos](#web-p13e)
- [P13F: Grupos textuales de enfermedad más frecuentes](#web-p13f)
- [P14-desconocidos: Perfil de retiros con EPS destino desconocida](#web-p14-desconocidos)
- [P14-edad: Perfil de retiros informados por edad al retiro](#web-p14-edad)
- [P14-estrato: Perfil de retiros informados por estrato propio](#web-p14-estrato)
- [P14-sexo: Perfil de retiros informados por sexo](#web-p14-sexo)
- [P14-tipo: Perfil de retiros informados por tipo de cotizante propio](#web-p14-tipo)
- [P14A: EPS destino de retiros informados](#web-p14a)

Selecciona únicamente las tablas `web_*` indicadas en esta ruta. Deben haber sido creadas y verificadas mediante la guía ETL de la interfaz.

<a id="web-p01a"></a>

### P01A. Espera de citas generales, solicitud a atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01A — Espera de citas generales, solicitud a atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La duración resta solicitud/remisión a atención. Las negativas se excluyen de la duración, conservando los eventos para mostrar cobertura. No hay fecha certificada de asignación. Referencias: citas 3.013 válidas; cirugías 948 válidas y 12 excluidas de 960. Minutos a horas exige convertir el cálculo, no solo cambiar la etiqueta.

<a id="web-p01a-mes"></a>

### P01A-mes. Tendencia mensual de espera de citas generales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01A-mes — Tendencia mensual de espera de citas generales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Tendencia es una agrupación mensual, no una medida adicional. No se promedian las medias mensuales para obtener el promedio global.

<a id="web-p01b"></a>

### P01B. Espera de cirugías, solicitud a atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01B — Espera de cirugías, solicitud a atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La duración resta solicitud/remisión a atención. Las negativas se excluyen de la duración, conservando los eventos para mostrar cobertura. No hay fecha certificada de asignación. Referencias: citas 3.013 válidas; cirugías 948 válidas y 12 excluidas de 960. Minutos a horas exige convertir el cálculo, no solo cambiar la etiqueta.

<a id="web-p01b-mes"></a>

### P01B-mes. Tendencia mensual de espera de cirugías

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01B-mes — Tendencia mensual de espera de cirugías |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Tendencia es una agrupación mensual, no una medida adicional. No se promedian las medias mensuales para obtener el promedio global.

<a id="web-p01c"></a>

### P01C. Distribución de esperas de citas generales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Distribución por intervalos** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01C — Distribución de esperas de citas generales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar distribución por intervalos**

En **Valor de distribución**, completa:

| Campo | Valor |
| --- | --- |
| Valor de distribución | `Base · web_fact_atencion.timestamp_solicitud_local` |
| Multiplicar valor de distribución por | Sin configurar |
| Fecha final de valor de distribución | `Base · web_fact_atencion.timestamp_atencion_local` |
| Unidad de duración | `minutes` |
| Excluir duraciones negativas | Marcado |
| Límites de intervalos | `0,60,1440,10080,43200,86400` |

No agregues agrupaciones, componentes ni indicadores manuales: el patrón genera `interval` y `frequency`.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los límites son minutos: [0,60), [60,1440), [1440,10080), [10080,43200), [43200,86400]. Fuera de rango / sin valor puede reunir esperas superiores a 60 días, ausentes y negativas excluidas; no equivale exclusivamente a esperas negativas.

<a id="web-p01d"></a>

### P01D. Distribución de esperas de cirugías

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Distribución por intervalos** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01D — Distribución de esperas de cirugías |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar distribución por intervalos**

En **Valor de distribución**, completa:

| Campo | Valor |
| --- | --- |
| Valor de distribución | `Base · web_fact_atencion.timestamp_solicitud_local` |
| Multiplicar valor de distribución por | Sin configurar |
| Fecha final de valor de distribución | `Base · web_fact_atencion.timestamp_atencion_local` |
| Unidad de duración | `minutes` |
| Excluir duraciones negativas | Marcado |
| Límites de intervalos | `0,60,1440,10080,43200,86400` |

No agregues agrupaciones, componentes ni indicadores manuales: el patrón genera `interval` y `frequency`.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los límites son minutos: [0,60), [60,1440), [1440,10080), [10080,43200), [43200,86400]. Fuera de rango / sin valor puede reunir esperas superiores a 60 días, ausentes y negativas excluidas; no equivale exclusivamente a esperas negativas.

<a id="web-p02-valores"></a>

### P02-valores. Departamentos y municipios disponibles de las IPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_ips`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_ips`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02-valores — Departamentos y municipios disponibles de las IPS |
| Qué representa una fila | Una IPS |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `departamento` |
| Nombre de agrupación | Departamento |
| Campo de agrupación | `Base · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `municipio` |
| Nombre de agrupación | Municipio |
| Campo de agrupación | `Base · web_dim_ips.municipio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `ips` | Cantidad de IPS | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Haz esta consulta antes de construir el ranking o exporta la definición que quieras conservar: Nuevo análisis avanzado reemplaza el formulario. Copia los valores exactamente como aparecen, sin comillas; no presupongas mayúsculas, tildes o un departamento concreto. Si hay truncamiento, esta salida no acredita que se mostraron todos los valores.

<a id="web-p02a"></a>

### P02A. Prestadores con más pacientes atendidos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A — Prestadores con más pacientes atendidos |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. La tabla muestra código, nombre y región. El gráfico de una sola categoría se consigue dejando solo la agrupación `ips`, calculando de nuevo y eligiendo Barras agrupadas, medida `personas`; las otras dos agrupaciones son atributos de identificación, no métricas.

<a id="web-p02a-departamento"></a>

### P02A-departamento. Prestadores de un departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-departamento — Prestadores de un departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · web_dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Los filtros se combinan con AND: departamento, municipio y hospital deben cumplirse simultáneamente. Sustituye los valores entre < > por datos existentes; esos marcadores no se escriben literalmente.

<a id="web-p02a-ganadora"></a>

### P02A-ganadora. IPS con más personas atendidas en un departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-ganadora — IPS con más personas atendidas en un departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · web_dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Grupos a mostrar = 1 elige una sola IPS de la selección filtrada. Guarda su fila/CSV, cambia el valor del departamento, calcula y guarda la fila siguiente para reunir una ganadora por región. El reporte conserva paneles separados, no fusiona sus filas. La interfaz no resuelve automáticamente un Top 1 por departamento ni un desempate por varios criterios; si hay empate, declara el empate antes de elegir una ganadora.

<a id="web-p02a-municipio"></a>

### P02A-municipio. Prestadores de un municipio y departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-municipio — Prestadores de un municipio y departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · web_dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |
| `Relación 1 · web_dim_ips.municipio` | EQ | `<municipio copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Los filtros se combinan con AND: departamento, municipio y hospital deben cumplirse simultáneamente. Sustituye los valores entre < > por datos existentes; esos marcadores no se escriben literalmente.

<a id="web-p02a-todas"></a>

### P02A-todas. IPS de todas las regiones con actividad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-todas — IPS de todas las regiones con actividad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.ips_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. No agregues filtros de departamento o municipio. Las regiones se repetirán porque cada fila es una IPS. Agrupar solo por departamento devuelve totales regionales y pierde la IPS ganadora. Aumentar el límite no produce una ganadora por región.

<a id="web-p02b"></a>

### P02B. Aportes por cotizante

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02B — Aportes por cotizante |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | cotizante |
| Campo de agrupación | `Base · web_fact_pago.paciente_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="web-p02c"></a>

### P02C. Aportes por familia

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02C — Aportes por familia |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | familia |
| Campo de agrupación | `Base · web_fact_pago.familia_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="web-p02d"></a>

### P02D. Aportes por empresa

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02D — Aportes por empresa |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_empresa` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `empresa_id` |
| Columna para `empresa_id` | `empresa_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | empresa |
| Campo de agrupación | `Relación 1 · web_dim_empresa.empresa_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_empresa` |
| Nombre de agrupación | Nombre de empresa |
| Campo de agrupación | `Relación 1 · web_dim_empresa.empresa_nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="web-p02e"></a>

### P02E. Aportes por municipio de IPS de afiliación

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02E — Aportes por municipio de IPS de afiliación |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_afiliacion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | municipio de IPS de afiliación |
| Campo de agrupación | `Relación 1 · web_dim_ips.municipio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="web-p02f"></a>

### P02F. Aportes por departamento de IPS de afiliación

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02F — Aportes por departamento de IPS de afiliación |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_afiliacion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | departamento de IPS de afiliación |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="web-p02g"></a>

### P02G. Tarifas de remisiones por familia

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02G — Tarifas de remisiones por familia |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `familia` |
| Nombre de agrupación | Familia |
| Campo de agrupación | `Base · web_fact_atencion.familia_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Titular y beneficiarios comparten familia_id. Se suman tarifas disponibles de sus remisiones; el resultado es una estimación parcial y no el costo real familiar completo.

<a id="web-p03a"></a>

### P03A. Tarifas de remisiones por estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03A — Tarifas de remisiones por estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `estrato` |
| Nombre de agrupación | Estrato familiar |
| Campo de agrupación | `Relación 1 · web_dim_paciente.estrato_familiar` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="web-p03b"></a>

### P03B. Tarifas de remisiones por tipo de cotizante titular

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03B — Tarifas de remisiones por tipo de cotizante titular |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `tipo` |
| Nombre de agrupación | Tipo de cotizante titular |
| Campo de agrupación | `Relación 1 · web_dim_paciente.tipo_cotizante_titular` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="web-p03c"></a>

### P03C. Tarifas de remisiones por grupo de edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03C — Tarifas de remisiones por grupo de edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="web-p03d"></a>

### P03D. Frecuencia individual de medicamentos por período

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03D — Frecuencia individual de medicamentos por período |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · web_fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medicamento` |
| Nombre de agrupación | Código de medicamento |
| Campo de agrupación | `Base · web_puente_formula_medicamento.medicamento_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas con el medicamento | `COUNT_DISTINCT` | `Base · web_puente_formula_medicamento.codigo_formula` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`recetas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`recetas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta recetas distintas con el código, no dosis, unidades ni dispensaciones. No se necesita dim_medicamento para contar. Referencia histórica: código 2349 en 895 recetas.

<a id="web-p04a"></a>

### P04A. Medicamentos formulados juntos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Pares y coocurrencia** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P04A — Medicamentos formulados juntos |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · web_fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar pares y coocurrencia**

Después del bloque **Eventos a medir**, debajo de sus relaciones y filtros, completa estos campos; no existe una sección denominada “Configura”:

| Campo | Opción |
| --- | --- |
| Clave de canasta o documento | `Base · web_puente_formula_medicamento.codigo_formula` |
| Código de elemento | `Base · web_puente_formula_medicamento.medicamento_id` |

Este patrón genera las agrupaciones y medidas automáticamente. No agregues componentes manuales ni indicadores calculados. Si falta `frequency` en Orden del análisis, vuelve a comprobar que el patrón siga siendo **Pares y coocurrencia** después de seleccionar la tabla.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`frequency`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** `frequency` se genera automáticamente al seleccionar Pares y coocurrencia; no es columna de la bodega ni componente que debas crear. Su escritura es frequency. Cuenta fórmulas distintas con ambos códigos. `support` = frequency / baskets, proporción 0–1; 0.10 es 10 %. `baskets` incluye canastas elegibles con un solo elemento; no las filtres. `item_a` y `item_b` identifican el par, sin orden ni parejas de un código consigo mismo. Referencia: 1047–2356 en 280 recetas. No interpretes un par como recomendación clínica.

<a id="web-p04b"></a>

### P04B. Frecuencia individual de medicamentos por período

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P04B — Frecuencia individual de medicamentos por período |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · web_fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medicamento` |
| Nombre de agrupación | Código de medicamento |
| Campo de agrupación | `Base · web_puente_formula_medicamento.medicamento_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas con el medicamento | `COUNT_DISTINCT` | `Base · web_puente_formula_medicamento.codigo_formula` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`recetas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`recetas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta recetas distintas con el código, no dosis, unidades ni dispensaciones. No se necesita dim_medicamento para contar. Referencia histórica: código 2349 en 895 recetas.

<a id="web-p05a"></a>

### P05A. Utilización por persona atendida

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A — Utilización por persona atendida |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="web-p05a-edad"></a>

### P05A-edad. Utilización por edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-edad — Utilización por edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="web-p05a-sexo"></a>

### P05A-sexo. Utilización por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-sexo — Utilización por sexo |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="web-p05a-sexo-edad"></a>

### P05A-sexo-edad. Utilización por sexo y edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-sexo-edad — Utilización por sexo y edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="web-p05b"></a>

### P05B. Eventos por persona registrada, incluyendo ceros

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05B — Eventos por persona registrada, incluyendo ceros |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población de referencia y denominadores**

1. Abre **Población de referencia y denominadores** y pulsa **Agregar población de referencia**.
2. En **Tabla de población**, selecciona **`public.web_dim_paciente`**. Deja sus relaciones vacías.
3. Configura:

| Campo | Valor |
| --- | --- |
| Clave de entidad en población | `Base · web_dim_paciente.paciente_id` del bloque Población |
| Clave de entidad en eventos | `Base · web_fact_atencion.paciente_id` del bloque Eventos a medir |

Deja **Filtros** sin condiciones.

Deja las agrupaciones de Población vacías, porque este panel no agrupa los eventos.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `registrados` | Personas registradas | `COUNT_DISTINCT` | `Base · web_dim_paciente.paciente_id` del bloque Población | `count` | Población de referencia total |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion_registrada` | Eventos por persona registrada | `eventos / registrados` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No apliques filtros de edad/geografía a esta comparación global sin justificar una población histórica equivalente. Referencia: 4.416 registrados, incluidos los que no tienen eventos, y ≈4,80 eventos por registrado. El registro no acredita afiliación activa durante todo el intervalo.

<a id="web-p06a"></a>

### P06A. Actividad por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06A — Actividad por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · web_dim_fecha.temporada` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Actividad observada, no ocupación. Navidad = 24–31 de diciembre; Semana Santa = lunes a domingo de la semana del jueves santo, 2006–2008; los demás días son ordinario. No hay definición de vacaciones, camas, capacidad ni agendas para calcular ocupación.

<a id="web-p06b"></a>

### P06B. Eventos por día calendario y temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06B — Eventos por día calendario y temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población de referencia y denominadores**

1. Abre **Población de referencia y denominadores** y pulsa **Agregar población de referencia**.
2. En **Tabla de población**, selecciona **`public.web_dim_fecha`**. Deja sus relaciones vacías.
3. Configura:

| Campo | Valor |
| --- | --- |
| Clave de entidad en población | `Base · web_dim_fecha.fecha_id` del bloque Población |
| Clave de entidad en eventos | `Base · web_fact_atencion.fecha_atencion_id` del bloque Eventos a medir |

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_fecha.fecha` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

Después de crear las agrupaciones de eventos del paso siguiente, configura las del bloque Población con **los mismos IDs y en el mismo orden**:

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Base · web_dim_fecha.temporada` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · web_dim_fecha.temporada` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `dias` | Días calendario | `COUNT_DISTINCT` | `Base · web_dim_fecha.fecha_id` del bloque Población | `days` | Población de referencia por grupo |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `actividad_diaria` | Eventos por día calendario | `eventos / dias` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`actividad_diaria`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`actividad_diaria`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El denominador cuenta días calendario de cada temporada, incluidos días sin eventos, no días operativos ni capacidad. La media no mide ocupación hospitalaria.

<a id="web-p06c"></a>

### P06C. Actividad de hospitales por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06C — Actividad de hospitales por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 2:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 2 · web_dim_ips.tipo_ips` | EQ | `hospital` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 2 · web_dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · web_dim_fecha.temporada` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No agregues una población calendario con un atributo hospital inexistente. La tabla/matriz cuenta actividad por hospital y temporada hasta el límite de grupos; no ocupación. Las IPS asociadas a médicos no tienen vigencias históricas.

<a id="web-p06d"></a>

### P06D. Actividad de médicos por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06D — Actividad de médicos por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medico` |
| Nombre de agrupación | Código de médico |
| Campo de agrupación | `Base · web_fact_atencion.medico_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · web_dim_fecha.temporada` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta registros por médico y temporada. No mide disponibilidad de agenda ni ocupación; los códigos no son alias anónimos.

<a id="web-p07a"></a>

### P07A. Atenciones mensuales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07A — Atenciones mensuales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_atencion. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="web-p07b"></a>

### P07B. Solicitudes mensuales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07B — Solicitudes mensuales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · web_fact_atencion.fecha_solicitud` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_solicitud. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="web-p07c"></a>

### P07C. Espera mensual por fecha de atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07C — Espera mensual por fecha de atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · web_fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · web_fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_atencion. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="web-p07d"></a>

### P07D. Demanda por día de semana de solicitud

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07D — Demanda por día de semana de solicitud |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_solicitud_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `dia` |
| Nombre de agrupación | Día de semana |
| Campo de agrupación | `Relación 1 · web_dim_fecha.dia_semana` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`7`**. En **Orden del análisis**, selecciona **`dia`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** 1 lunes, 2 martes, 3 miércoles, 4 jueves, 5 viernes, 6 sábado, 7 domingo. La fecha es solicitud, no atención.

<a id="web-p07d-matriz"></a>

### P07D-matriz. Demanda por mes y día de semana

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07D-matriz — Demanda por mes y día de semana |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_solicitud_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de solicitud |
| Campo de agrupación | `Base · web_fact_atencion.fecha_solicitud` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `dia` |
| Nombre de agrupación | Día de semana |
| Campo de agrupación | `Relación 1 · web_dim_fecha.dia_semana` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`300`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Hasta 36 × 7 combinaciones. Con dos dimensiones no actives Completar calendario. Las combinaciones ausentes o truncadas no acreditan cero.

<a id="web-p07e"></a>

### P07E. Personas con diagnóstico textual observado por mes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07E — Personas con diagnóstico textual observado por mes |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`personas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación textual es parcial. No representa todos los enfermos de la población; controles, seguimientos y Sin novedad no son automáticamente enfermedad.

<a id="web-p08a"></a>

### P08A. Tarifa de remisiones por persona atendida y por remisión

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08A — Tarifa de remisiones por persona atendida y por remisión |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `media_remision` | Tarifa media por remisión | `AVG` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con remisión tarifada | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Distingue AVG por remisión de SUM por persona con remisión tarifada. No se calcula costo asistencial completo. Referencia histórica de SUM: 4.380.604.114,00 unidades monetarias del origen.

<a id="web-p08a-mes"></a>

### P08A-mes. Tarifa media mensual de remisiones

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08A-mes — Tarifa media mensual de remisiones |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · web_fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `media_remision` | Tarifa media por remisión | `AVG` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con remisión tarifada | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`media_persona`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No promedies las medias mensuales para calcular el indicador global. El costo real completo sigue sin estar disponible.

<a id="web-p08b"></a>

### P08B. Cobertura de tarifas sobre toda la atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08B — Cobertura de tarifas sobre toda la atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `tarifados` | Eventos con tarifa | `COUNT` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `cobertura` | Porcentaje de eventos con tarifa | `100 * tarifados / eventos` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tipo_atencion ni IS_NOT_NULL: la cobertura necesita todos los eventos en el denominador. Referencia: 16.742 tarifas de remisión / 21.207 eventos ≈ 78,95 %; las otras modalidades carecen de costo enlazado.

<a id="web-p09-tamano-renal"></a>

### P09-tamano-renal. Personas con diagnóstico textual de deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09-tamano-renal — Personas con diagnóstico textual de deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tarifa ni tipo de atención: este control cuenta todas las personas seleccionables por ese diagnóstico. No uses antecedentes familiares o medicamentos para inferirlo. Las cohortes pueden solaparse y sus tamaños no son sumables.

<a id="web-p09-tamano-vih"></a>

### P09-tamano-vih. Personas con diagnóstico textual de VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09-tamano-vih — Personas con diagnóstico textual de VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tarifa ni tipo de atención: este control cuenta todas las personas seleccionables por ese diagnóstico. No uses antecedentes familiares o medicamentos para inferirlo. Las cohortes pueden solaparse y sus tamaños no son sumables.

<a id="web-p09a-renal"></a>

### P09A-renal. Tarifa de toda la atención tarifada de la cohorte deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09A-renal — Tarifa de toda la atención tarifada de la cohorte deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Cohorte: seleccionar personas antes de medir**

1. Abre **Cohortes: seleccionar entidades antes de medir** y pulsa **Agregar cohorte**.
2. En **Cohorte 1 → Tabla de cohorte 1**, selecciona **`public.web_fact_atencion`**.

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

3. Completa los dos selectores situados debajo de la selección de Cohorte 1:

| Campo | Opción exacta |
| --- | --- |
| Entidad de cohorte 1 | `Base · web_fact_atencion.paciente_id` |
| Entidad de eventos para cohorte 1 | `Base · web_fact_atencion.paciente_id` |

Ambos muestran **Base** y es correcto: el primero identifica personas en la base del bloque Cohorte; el segundo busca sus eventos en la base de Eventos a medir. No esperes una opción llamada “Cohorte” en el desplegable. Conserva una sola cohorte y **Combinar cohortes = Intersección: todas**. Escribe la fecha inicial completa `2006-01-01`; `2006-01-0` es inválida.

Deja **Población de referencia y denominadores** sin configurar.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona atendida de la cohorte | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La cohorte selecciona personas con ese diagnóstico textual y mide todas sus atenciones tarifadas del período, aunque tengan otro diagnóstico. No pongas grupo/clase diagnóstica en Eventos a medir en este panel. El denominador es personas de la cohorte con atención tarifada; no es el tamaño completo de la cohorte. La tarifa es parcial.

<a id="web-p09a-vih"></a>

### P09A-vih. Tarifa de toda la atención tarifada de la cohorte VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09A-vih — Tarifa de toda la atención tarifada de la cohorte VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Cohorte: seleccionar personas antes de medir**

1. Abre **Cohortes: seleccionar entidades antes de medir** y pulsa **Agregar cohorte**.
2. En **Cohorte 1 → Tabla de cohorte 1**, selecciona **`public.web_fact_atencion`**.

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

3. Completa los dos selectores situados debajo de la selección de Cohorte 1:

| Campo | Opción exacta |
| --- | --- |
| Entidad de cohorte 1 | `Base · web_fact_atencion.paciente_id` |
| Entidad de eventos para cohorte 1 | `Base · web_fact_atencion.paciente_id` |

Ambos muestran **Base** y es correcto: el primero identifica personas en la base del bloque Cohorte; el segundo busca sus eventos en la base de Eventos a medir. No esperes una opción llamada “Cohorte” en el desplegable. Conserva una sola cohorte y **Combinar cohortes = Intersección: todas**. Escribe la fecha inicial completa `2006-01-01`; `2006-01-0` es inválida.

Deja **Población de referencia y denominadores** sin configurar.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona atendida de la cohorte | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La cohorte selecciona personas con ese diagnóstico textual y mide todas sus atenciones tarifadas del período, aunque tengan otro diagnóstico. No pongas grupo/clase diagnóstica en Eventos a medir en este panel. El denominador es personas de la cohorte con atención tarifada; no es el tamaño completo de la cohorte. La tarifa es parcial.

<a id="web-p09b-renal"></a>

### P09B-renal. Tarifas de eventos con diagnóstico textual de deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09B-renal — Tarifas de eventos con diagnóstico textual de deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con evento tarifado de ese diagnóstico | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Deja Cohortes vacío. Aquí se miden solo remisiones tarifadas con ese diagnóstico; difiere de toda la atención de personas de una cohorte. El mapeo es textual, no diagnóstico clínico certificado.

<a id="web-p09b-vih"></a>

### P09B-vih. Tarifas de eventos con diagnóstico textual de VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09B-vih — Tarifas de eventos con diagnóstico textual de VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · web_fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Base · web_fact_atencion.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · web_fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con evento tarifado de ese diagnóstico | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Deja Cohortes vacío. Aquí se miden solo remisiones tarifadas con ese diagnóstico; difiere de toda la atención de personas de una cohorte. El mapeo es textual, no diagnóstico clínico certificado.

<a id="web-p10a"></a>

### P10A. Solicitudes por departamento de IPS asociada al médico

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10A — Solicitudes por departamento de IPS asociada al médico |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `departamento` |
| Nombre de agrupación | Departamento |
| Campo de agrupación | `Relación 1 · web_dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |
| `total` | Solicitudes totales filtradas | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de solicitudes | `100 * eventos / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El denominador incluye departamentos fuera del Top 10. La zona es la de IPS asociada al médico, no residencia ni regional administrativa.

<a id="web-p10b"></a>

### P10B. Retiros observados por mes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10B — Retiros observados por mes |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de retiro |
| Campo de agrupación | `Base · web_fact_retiro.fecha_retiro` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_retiro.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Este conteo no identifica desvinculación por mora: faltan causa, obligación, período y vencimiento. Los destinos vacíos no significan falta de pago.

<a id="web-p10c"></a>

### P10C. Retiros con destino informado y desconocido

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10C — Retiros con destino informado y desconocido |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `destino` |
| Nombre de agrupación | Destino informado |
| Campo de agrupación | `Base · web_fact_retiro.destino_informado` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_retiro.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 48 con destino informado y 41 desconocidos. Ninguno de esos grupos demuestra mora; no existe promedio de desvinculación por mora calculable con estos datos.

<a id="web-p11a"></a>

### P11A. Cobertura de cabeceras de recetas

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_formula`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_formula`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P11A — Cobertura de cabeceras de recetas |
| Qué representa una fila | Una fórmula médica |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 7.484 recetas. No hay total facturado por receta ni detalle con cantidad/precio vigente; costo promedio de recetas no calculable. Exporta la cobertura y deja explícitos los datos faltantes. No presentes costo cero.

<a id="web-p11b"></a>

### P11B. Cobertura de presencias y códigos de medicamentos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P11B — Cobertura de presencias y códigos de medicamentos |
| Qué representa una fila | Una presencia fórmula–medicamento |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · web_fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `presencias` | Presencias | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `codigos` | Códigos distintos | `COUNT_DISTINCT` | `Base · web_puente_formula_medicamento.medicamento_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: 15.770 presencias y 166 códigos. No hay unidades prescritas/dispensadas ni precios. Para un costo futuro harían falta cantidades × precios o valores facturados, sumar por receta y después promediar recetas. No uses aportes ni tarifas POS como sustitutos.

<a id="web-p12-no-edad"></a>

### P12-no-edad. Perfil por edad al corte de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-edad — Perfil por edad al corte de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Edad al corte |
| Campo de agrupación | `Base · web_dim_paciente.fecha_nacimiento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | `2008-12-09` |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo es nacimiento: la edad se calcula al corte histórico indicado.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-no-escolaridad"></a>

### P12-no-escolaridad. Perfil por escolaridad propia de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-escolaridad — Perfil por escolaridad propia de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Escolaridad propia |
| Campo de agrupación | `Base · web_dim_paciente.escolaridad_propia` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-no-estrato"></a>

### P12-no-estrato. Perfil por estrato propio de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-estrato — Perfil por estrato propio de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Base · web_dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-no-sexo"></a>

### P12-no-sexo. Perfil por sexo de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-sexo — Perfil por sexo de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Base · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-no-tipo"></a>

### P12-no-tipo. Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-tipo — Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Base · web_dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-si-edad"></a>

### P12-si-edad. Perfil por edad al corte de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-edad — Perfil por edad al corte de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Edad al corte |
| Campo de agrupación | `Base · web_dim_paciente.fecha_nacimiento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | `2008-12-09` |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo es nacimiento: la edad se calcula al corte histórico indicado.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-si-escolaridad"></a>

### P12-si-escolaridad. Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-escolaridad — Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Escolaridad propia |
| Campo de agrupación | `Base · web_dim_paciente.escolaridad_propia` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-si-estrato"></a>

### P12-si-estrato. Perfil por estrato propio de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-estrato — Perfil por estrato propio de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Base · web_dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-si-sexo"></a>

### P12-si-sexo. Perfil por sexo de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-sexo — Perfil por sexo de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Base · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12-si-tipo"></a>

### P12-si-tipo. Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-tipo — Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Base · web_dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="web-p12a"></a>

### P12A. Procedencia de otras EPS de los cotizantes al corte

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12A — Procedencia de otras EPS de los cotizantes al corte |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.fecha_afiliacion_titular` | LTE | `2008-12-09` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `procedencia` |
| Nombre de agrupación | Proviene de otra EPS |
| Campo de agrupación | `Base · web_dim_paciente.proviene_otra_eps_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`personas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** True = sí, False = no, nulo = desconocido. Beneficiarios no tienen un dato propio equivalente y quedan fuera. Corte histórico 2008-12-09; no uses fecha actual. Una fecha de pago aislada no permite identificar pagos tardíos.

<a id="web-p13a"></a>

### P13A. Diagnósticos textuales observados por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13A — Diagnósticos textuales observados por sexo |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Base · web_fact_atencion.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="web-p13b"></a>

### P13B. Diagnósticos textuales observados por grupo de edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13B — Diagnósticos textuales observados por grupo de edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Base · web_fact_atencion.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="web-p13c"></a>

### P13C. Diagnósticos textuales observados por estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13C — Diagnósticos textuales observados por estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Base · web_fact_atencion.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `estrato` |
| Nombre de agrupación | Estrato familiar |
| Campo de agrupación | `Relación 1 · web_dim_paciente.estrato_familiar` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="web-p13d"></a>

### P13D. Enfermedad, sexo y edad dentro de un estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13D — Enfermedad, sexo y edad dentro de un estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · web_dim_paciente.estrato_familiar` | EQ | `<estrato existente>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Base · web_fact_atencion.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Sustituye el marcador por un estrato existente. El constructor tiene tres dimensiones predeterminadas; el estrato queda como filtro. Para una matriz usa solo dos dimensiones y fija otro atributo como filtro. La tabla conserva el cruce hasta el límite de grupos.

<a id="web-p13e"></a>

### P13E. Cobertura de clasificación de textos diagnósticos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13E — Cobertura de clasificación de textos diagnósticos |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `clase` |
| Nombre de agrupación | Clase de texto |
| Campo de agrupación | `Base · web_fact_atencion.clase_texto` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Sin filtro de clase. Permite ver controles, seguimientos, no clasificados y nulos. Referencia: 1.972 eventos clasificados como diagnóstico observado de 21.207; no todas las atenciones son enfermedades confirmadas.

<a id="web-p13f"></a>

### P13F. Grupos textuales de enfermedad más frecuentes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13F — Grupos textuales de enfermedad más frecuentes |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_atencion.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Base · web_fact_atencion.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Este Top ordena enfermedades globalmente, sin fragmentarlas por sexo/edad/estrato. El conteo sigue limitado por la clasificación textual disponible.

<a id="web-p14-desconocidos"></a>

### P14-desconocidos. Perfil de retiros con EPS destino desconocida

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-desconocidos — Perfil de retiros con EPS destino desconocida |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros con destino desconocido | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro desconocidos | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 41 retiros. Destino desconocido no significa mora ni certifica ausencia de cambio de EPS. El denominador pertenece a este grupo, no a los 48 destinos informados.

<a id="web-p14-edad"></a>

### P14-edad. Perfil de retiros informados por edad al retiro

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-edad — Perfil de retiros informados por edad al retiro |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · web_fact_retiro.edad_al_retiro` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="web-p14-estrato"></a>

### P14-estrato. Perfil de retiros informados por estrato propio

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-estrato — Perfil de retiros informados por estrato propio |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Relación 1 · web_dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="web-p14-sexo"></a>

### P14-sexo. Perfil de retiros informados por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-sexo — Perfil de retiros informados por sexo |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Relación 1 · web_dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="web-p14-tipo"></a>

### P14-tipo. Perfil de retiros informados por tipo de cotizante propio

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-tipo — Perfil de retiros informados por tipo de cotizante propio |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `web_dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Relación 1 · web_dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="web-p14a"></a>

### P14A. EPS destino de retiros informados

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14A — EPS destino de retiros informados |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · web_fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `eps` |
| Nombre de agrupación | EPS destino |
| Campo de agrupación | `Base · web_fact_retiro.eps_destino` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · web_fact_retiro.paciente_id` | `count` | Grupo actual |
| `edad_media` | Edad media al retiro | `AVG` | `Base · web_fact_retiro.edad_al_retiro` | `years` | Grupo actual |
| `dias_media` | Días medios de afiliación al retiro | `AVG` | `Base · web_fact_retiro.dias_afiliacion_al_retiro` | `days` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`retiros`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 48 retiros de 48 pacientes, Cafesalud en 16. Cambia el selector de unidad para ver edad y días por separado; no mezcles unidades en un eje. La edad corresponde al retiro; la duración usa la afiliación del titular disponible.

## 3. Respuestas con la bodega del cuaderno

**Ir a un panel de esta ruta:**

- [P01A: Espera de citas generales, solicitud a atención](#core-p01a)
- [P01A-mes: Tendencia mensual de espera de citas generales](#core-p01a-mes)
- [P01B: Espera de cirugías, solicitud a atención](#core-p01b)
- [P01B-mes: Tendencia mensual de espera de cirugías](#core-p01b-mes)
- [P01C: Distribución de esperas de citas generales](#core-p01c)
- [P01D: Distribución de esperas de cirugías](#core-p01d)
- [P02-valores: Departamentos y municipios disponibles de las IPS](#core-p02-valores)
- [P02A: Prestadores con más pacientes atendidos](#core-p02a)
- [P02A-departamento: Prestadores de un departamento](#core-p02a-departamento)
- [P02A-ganadora: IPS con más personas atendidas en un departamento](#core-p02a-ganadora)
- [P02A-municipio: Prestadores de un municipio y departamento](#core-p02a-municipio)
- [P02A-todas: IPS de todas las regiones con actividad](#core-p02a-todas)
- [P02B: Aportes por cotizante](#core-p02b)
- [P02C: Aportes por familia](#core-p02c)
- [P02D: Aportes por empresa](#core-p02d)
- [P02E: Aportes por municipio de IPS de afiliación](#core-p02e)
- [P02F: Aportes por departamento de IPS de afiliación](#core-p02f)
- [P02G: Tarifas de remisiones por familia](#core-p02g)
- [P03A: Tarifas de remisiones por estrato familiar](#core-p03a)
- [P03B: Tarifas de remisiones por tipo de cotizante titular](#core-p03b)
- [P03C: Tarifas de remisiones por grupo de edad](#core-p03c)
- [P03D: Frecuencia individual de medicamentos por período](#core-p03d)
- [P04A: Medicamentos formulados juntos](#core-p04a)
- [P04B: Frecuencia individual de medicamentos por período](#core-p04b)
- [P05A: Utilización por persona atendida](#core-p05a)
- [P05A-edad: Utilización por edad](#core-p05a-edad)
- [P05A-sexo: Utilización por sexo](#core-p05a-sexo)
- [P05A-sexo-edad: Utilización por sexo y edad](#core-p05a-sexo-edad)
- [P05B: Eventos por persona registrada, incluyendo ceros](#core-p05b)
- [P06A: Actividad por temporada](#core-p06a)
- [P06B: Eventos por día calendario y temporada](#core-p06b)
- [P06C: Actividad de hospitales por temporada](#core-p06c)
- [P06D: Actividad de médicos por temporada](#core-p06d)
- [P07A: Atenciones mensuales](#core-p07a)
- [P07B: Solicitudes mensuales](#core-p07b)
- [P07C: Espera mensual por fecha de atención](#core-p07c)
- [P07D: Demanda por día de semana de solicitud](#core-p07d)
- [P07D-matriz: Demanda por mes y día de semana](#core-p07d-matriz)
- [P07E: Personas con diagnóstico textual observado por mes](#core-p07e)
- [P08A: Tarifa de remisiones por persona atendida y por remisión](#core-p08a)
- [P08A-mes: Tarifa media mensual de remisiones](#core-p08a-mes)
- [P08B: Cobertura de tarifas sobre toda la atención](#core-p08b)
- [P09-tamano-renal: Personas con diagnóstico textual de deficiencia renal](#core-p09-tamano-renal)
- [P09-tamano-vih: Personas con diagnóstico textual de VIH/SIDA](#core-p09-tamano-vih)
- [P09A-renal: Tarifa de toda la atención tarifada de la cohorte deficiencia renal](#core-p09a-renal)
- [P09A-vih: Tarifa de toda la atención tarifada de la cohorte VIH/SIDA](#core-p09a-vih)
- [P09B-renal: Tarifas de eventos con diagnóstico textual de deficiencia renal](#core-p09b-renal)
- [P09B-vih: Tarifas de eventos con diagnóstico textual de VIH/SIDA](#core-p09b-vih)
- [P10A: Solicitudes por departamento de IPS asociada al médico](#core-p10a)
- [P10B: Retiros observados por mes](#core-p10b)
- [P10C: Retiros con destino informado y desconocido](#core-p10c)
- [P11A: Cobertura de cabeceras de recetas](#core-p11a)
- [P11B: Cobertura de presencias y códigos de medicamentos](#core-p11b)
- [P12-no-edad: Perfil por edad al corte de cotizantes que no provienen de otra EPS](#core-p12-no-edad)
- [P12-no-escolaridad: Perfil por escolaridad propia de cotizantes que no provienen de otra EPS](#core-p12-no-escolaridad)
- [P12-no-estrato: Perfil por estrato propio de cotizantes que no provienen de otra EPS](#core-p12-no-estrato)
- [P12-no-sexo: Perfil por sexo de cotizantes que no provienen de otra EPS](#core-p12-no-sexo)
- [P12-no-tipo: Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS](#core-p12-no-tipo)
- [P12-si-edad: Perfil por edad al corte de cotizantes que sí provienen de otra EPS](#core-p12-si-edad)
- [P12-si-escolaridad: Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS](#core-p12-si-escolaridad)
- [P12-si-estrato: Perfil por estrato propio de cotizantes que sí provienen de otra EPS](#core-p12-si-estrato)
- [P12-si-sexo: Perfil por sexo de cotizantes que sí provienen de otra EPS](#core-p12-si-sexo)
- [P12-si-tipo: Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS](#core-p12-si-tipo)
- [P12A: Procedencia de otras EPS de los cotizantes al corte](#core-p12a)
- [P13A: Diagnósticos textuales observados por sexo](#core-p13a)
- [P13B: Diagnósticos textuales observados por grupo de edad](#core-p13b)
- [P13C: Diagnósticos textuales observados por estrato familiar](#core-p13c)
- [P13D: Enfermedad, sexo y edad dentro de un estrato familiar](#core-p13d)
- [P13E: Cobertura de clasificación de textos diagnósticos](#core-p13e)
- [P13F: Grupos textuales de enfermedad más frecuentes](#core-p13f)
- [P14-desconocidos: Perfil de retiros con EPS destino desconocida](#core-p14-desconocidos)
- [P14-edad: Perfil de retiros informados por edad al retiro](#core-p14-edad)
- [P14-estrato: Perfil de retiros informados por estrato propio](#core-p14-estrato)
- [P14-sexo: Perfil de retiros informados por sexo](#core-p14-sexo)
- [P14-tipo: Perfil de retiros informados por tipo de cotizante propio](#core-p14-tipo)
- [P14A: EPS destino de retiros informados](#core-p14a)

Selecciona las tablas sin prefijo `web_`. La carga histórica del cuaderno no creó claves físicas: revisa el catálogo actual antes de utilizar relaciones. Si faltan, prepara solo las tablas necesarias mediante [el apartado 6 de la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas).

<a id="core-p01a"></a>

### P01A. Espera de citas generales, solicitud a atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01A — Espera de citas generales, solicitud a atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La duración resta solicitud/remisión a atención. Las negativas se excluyen de la duración, conservando los eventos para mostrar cobertura. No hay fecha certificada de asignación. Referencias: citas 3.013 válidas; cirugías 948 válidas y 12 excluidas de 960. Minutos a horas exige convertir el cálculo, no solo cambiar la etiqueta.

<a id="core-p01a-mes"></a>

### P01A-mes. Tendencia mensual de espera de citas generales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01A-mes — Tendencia mensual de espera de citas generales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Tendencia es una agrupación mensual, no una medida adicional. No se promedian las medias mensuales para obtener el promedio global.

<a id="core-p01b"></a>

### P01B. Espera de cirugías, solicitud a atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01B — Espera de cirugías, solicitud a atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La duración resta solicitud/remisión a atención. Las negativas se excluyen de la duración, conservando los eventos para mostrar cobertura. No hay fecha certificada de asignación. Referencias: citas 3.013 válidas; cirugías 948 válidas y 12 excluidas de 960. Minutos a horas exige convertir el cálculo, no solo cambiar la etiqueta.

<a id="core-p01b-mes"></a>

### P01B-mes. Tendencia mensual de espera de cirugías

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01B-mes — Tendencia mensual de espera de cirugías |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `mediana` | Mediana | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `p90` | Percentil 90 | `PERCENTILE` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |
| `mediana` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.5 |
| `p90` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | 0.9 |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Tendencia es una agrupación mensual, no una medida adicional. No se promedian las medias mensuales para obtener el promedio global.

<a id="core-p01c"></a>

### P01C. Distribución de esperas de citas generales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Distribución por intervalos** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01C — Distribución de esperas de citas generales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `cita_general` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar distribución por intervalos**

En **Valor de distribución**, completa:

| Campo | Valor |
| --- | --- |
| Valor de distribución | `Base · fact_atencion.timestamp_solicitud_local` |
| Multiplicar valor de distribución por | Sin configurar |
| Fecha final de valor de distribución | `Base · fact_atencion.timestamp_atencion_local` |
| Unidad de duración | `minutes` |
| Excluir duraciones negativas | Marcado |
| Límites de intervalos | `0,60,1440,10080,43200,86400` |

No agregues agrupaciones, componentes ni indicadores manuales: el patrón genera `interval` y `frequency`.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los límites son minutos: [0,60), [60,1440), [1440,10080), [10080,43200), [43200,86400]. Fuera de rango / sin valor puede reunir esperas superiores a 60 días, ausentes y negativas excluidas; no equivale exclusivamente a esperas negativas.

<a id="core-p01d"></a>

### P01D. Distribución de esperas de cirugías

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Distribución por intervalos** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P01D — Distribución de esperas de cirugías |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tipo_servicio` | EQ | `cirugia` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar distribución por intervalos**

En **Valor de distribución**, completa:

| Campo | Valor |
| --- | --- |
| Valor de distribución | `Base · fact_atencion.timestamp_solicitud_local` |
| Multiplicar valor de distribución por | Sin configurar |
| Fecha final de valor de distribución | `Base · fact_atencion.timestamp_atencion_local` |
| Unidad de duración | `minutes` |
| Excluir duraciones negativas | Marcado |
| Límites de intervalos | `0,60,1440,10080,43200,86400` |

No agregues agrupaciones, componentes ni indicadores manuales: el patrón genera `interval` y `frequency`.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los límites son minutos: [0,60), [60,1440), [1440,10080), [10080,43200), [43200,86400]. Fuera de rango / sin valor puede reunir esperas superiores a 60 días, ausentes y negativas excluidas; no equivale exclusivamente a esperas negativas.

<a id="core-p02-valores"></a>

### P02-valores. Departamentos y municipios disponibles de las IPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_ips`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_ips`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02-valores — Departamentos y municipios disponibles de las IPS |
| Qué representa una fila | Una IPS |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `departamento` |
| Nombre de agrupación | Departamento |
| Campo de agrupación | `Base · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `municipio` |
| Nombre de agrupación | Municipio |
| Campo de agrupación | `Base · dim_ips.municipio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `ips` | Cantidad de IPS | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Haz esta consulta antes de construir el ranking o exporta la definición que quieras conservar: Nuevo análisis avanzado reemplaza el formulario. Copia los valores exactamente como aparecen, sin comillas; no presupongas mayúsculas, tildes o un departamento concreto. Si hay truncamiento, esta salida no acredita que se mostraron todos los valores.

<a id="core-p02a"></a>

### P02A. Prestadores con más pacientes atendidos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A — Prestadores con más pacientes atendidos |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. La tabla muestra código, nombre y región. El gráfico de una sola categoría se consigue dejando solo la agrupación `ips`, calculando de nuevo y eligiendo Barras agrupadas, medida `personas`; las otras dos agrupaciones son atributos de identificación, no métricas.

<a id="core-p02a-departamento"></a>

### P02A-departamento. Prestadores de un departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-departamento — Prestadores de un departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Los filtros se combinan con AND: departamento, municipio y hospital deben cumplirse simultáneamente. Sustituye los valores entre < > por datos existentes; esos marcadores no se escriben literalmente.

<a id="core-p02a-ganadora"></a>

### P02A-ganadora. IPS con más personas atendidas en un departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-ganadora — IPS con más personas atendidas en un departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Grupos a mostrar = 1 elige una sola IPS de la selección filtrada. Guarda su fila/CSV, cambia el valor del departamento, calcula y guarda la fila siguiente para reunir una ganadora por región. El reporte conserva paneles separados, no fusiona sus filas. La interfaz no resuelve automáticamente un Top 1 por departamento ni un desempate por varios criterios; si hay empate, declara el empate antes de elegir una ganadora.

<a id="core-p02a-municipio"></a>

### P02A-municipio. Prestadores de un municipio y departamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-municipio — Prestadores de un municipio y departamento |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_ips.departamento` | EQ | `<departamento copiado de la bodega>` |
| `Relación 1 · dim_ips.municipio` | EQ | `<municipio copiado de la bodega>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. Los filtros se combinan con AND: departamento, municipio y hospital deben cumplirse simultáneamente. Sustituye los valores entre < > por datos existentes; esos marcadores no se escriben literalmente.

<a id="core-p02a-todas"></a>

### P02A-todas. IPS de todas las regiones con actividad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02A-todas — IPS de todas las regiones con actividad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_ips` |
| Nombre de agrupación | Nombre de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `region` |
| Nombre de agrupación | Región: departamento de IPS |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`personas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Región significa departamento de la IPS asociada al médico; no es residencia ni regional administrativa. Para limitar a hospitales agrega en Eventos a medir un filtro adicional: columna de la relación con IPS `tipo_ips`, operador `EQ`, valor `hospital`, sin comillas. Sin ese filtro se comparan todos los prestadores. No agregues filtros de departamento o municipio. Las regiones se repetirán porque cada fila es una IPS. Agrupar solo por departamento devuelve totales regionales y pierde la IPS ganadora. Aumentar el límite no produce una ganadora por región.

<a id="core-p02b"></a>

### P02B. Aportes por cotizante

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02B — Aportes por cotizante |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | cotizante |
| Campo de agrupación | `Base · fact_pago.paciente_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="core-p02c"></a>

### P02C. Aportes por familia

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02C — Aportes por familia |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | familia |
| Campo de agrupación | `Base · fact_pago.familia_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="core-p02d"></a>

### P02D. Aportes por empresa

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02D — Aportes por empresa |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_empresa` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `empresa_id` |
| Columna para `empresa_id` | `empresa_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | empresa |
| Campo de agrupación | `Relación 1 · dim_empresa.empresa_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `nombre_empresa` |
| Nombre de agrupación | Nombre de empresa |
| Campo de agrupación | `Relación 1 · dim_empresa.nombre` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="core-p02e"></a>

### P02E. Aportes por municipio de IPS de afiliación

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02E — Aportes por municipio de IPS de afiliación |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_afiliacion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | municipio de IPS de afiliación |
| Campo de agrupación | `Relación 1 · dim_ips.municipio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="core-p02f"></a>

### P02F. Aportes por departamento de IPS de afiliación

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02F — Aportes por departamento de IPS de afiliación |
| Qué representa una fila | Una transacción de aporte |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_afiliacion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_pago.fecha_pago` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `categoria` |
| Nombre de agrupación | departamento de IPS de afiliación |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `aportes` | Aportes | `SUM` | `Base · fact_pago.valor_aporte` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`aportes`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`aportes`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Los aportes son ingresos, no costos. Conserva la empresa desconocida cuando aparezca. Cada pago se suma una sola vez; no unas pagos a todos los beneficiarios ni a cada atención. La ciudad/departamento de afiliación corresponde a la IPS, no a residencia. Los códigos de personas/familias no se anonimizan automáticamente.

<a id="core-p02g"></a>

### P02G. Tarifas de remisiones por familia

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P02G — Tarifas de remisiones por familia |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `familia` |
| Nombre de agrupación | Familia |
| Campo de agrupación | `Base · fact_atencion.familia_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Titular y beneficiarios comparten familia_id. Se suman tarifas disponibles de sus remisiones; el resultado es una estimación parcial y no el costo real familiar completo.

<a id="core-p03a"></a>

### P03A. Tarifas de remisiones por estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03A — Tarifas de remisiones por estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `estrato` |
| Nombre de agrupación | Estrato familiar |
| Campo de agrupación | `Relación 1 · dim_paciente.estrato_familiar` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="core-p03b"></a>

### P03B. Tarifas de remisiones por tipo de cotizante titular

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03B — Tarifas de remisiones por tipo de cotizante titular |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `tipo` |
| Nombre de agrupación | Tipo de cotizante titular |
| Campo de agrupación | `Relación 1 · dim_paciente.tipo_cotizante_titular` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="core-p03c"></a>

### P03C. Tarifas de remisiones por grupo de edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03C — Tarifas de remisiones por grupo de edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`tarifa`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`tarifa`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Estimación tarifaria parcial. El tipo de cotizante no es una ocupación específica; estrato familiar puede provenir del titular y carece de historia. El grupo de edad se calcula a la atención, no a la fecha actual.

<a id="core-p03d"></a>

### P03D. Frecuencia individual de medicamentos por período

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P03D — Frecuencia individual de medicamentos por período |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medicamento` |
| Nombre de agrupación | Código de medicamento |
| Campo de agrupación | `Base · puente_formula_medicamento.medicamento_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas con el medicamento | `COUNT_DISTINCT` | `Base · puente_formula_medicamento.codigo_formula` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`recetas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`recetas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta recetas distintas con el código, no dosis, unidades ni dispensaciones. No se necesita dim_medicamento para contar. Referencia histórica: código 2349 en 895 recetas.

<a id="core-p04a"></a>

### P04A. Medicamentos formulados juntos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Pares y coocurrencia** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P04A — Medicamentos formulados juntos |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Configurar pares y coocurrencia**

Después del bloque **Eventos a medir**, debajo de sus relaciones y filtros, completa estos campos; no existe una sección denominada “Configura”:

| Campo | Opción |
| --- | --- |
| Clave de canasta o documento | `Base · puente_formula_medicamento.codigo_formula` |
| Código de elemento | `Base · puente_formula_medicamento.medicamento_id` |

Este patrón genera las agrupaciones y medidas automáticamente. No agregues componentes manuales ni indicadores calculados. Si falta `frequency` en Orden del análisis, vuelve a comprobar que el patrón siga siendo **Pares y coocurrencia** después de seleccionar la tabla.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`frequency`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`frequency`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** `frequency` se genera automáticamente al seleccionar Pares y coocurrencia; no es columna de la bodega ni componente que debas crear. Su escritura es frequency. Cuenta fórmulas distintas con ambos códigos. `support` = frequency / baskets, proporción 0–1; 0.10 es 10 %. `baskets` incluye canastas elegibles con un solo elemento; no las filtres. `item_a` y `item_b` identifican el par, sin orden ni parejas de un código consigo mismo. Referencia: 1047–2356 en 280 recetas. No interpretes un par como recomendación clínica.

<a id="core-p04b"></a>

### P04B. Frecuencia individual de medicamentos por período

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P04B — Frecuencia individual de medicamentos por período |
| Qué representa una fila | Una presencia de un medicamento en una fórmula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medicamento` |
| Nombre de agrupación | Código de medicamento |
| Campo de agrupación | `Base · puente_formula_medicamento.medicamento_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas con el medicamento | `COUNT_DISTINCT` | `Base · puente_formula_medicamento.codigo_formula` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`recetas`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`recetas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta recetas distintas con el código, no dosis, unidades ni dispensaciones. No se necesita dim_medicamento para contar. Referencia histórica: código 2349 en 895 recetas.

<a id="core-p05a"></a>

### P05A. Utilización por persona atendida

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A — Utilización por persona atendida |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="core-p05a-edad"></a>

### P05A-edad. Utilización por edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-edad — Utilización por edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="core-p05a-sexo"></a>

### P05A-sexo. Utilización por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-sexo — Utilización por sexo |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="core-p05a-sexo-edad"></a>

### P05A-sexo-edad. Utilización por sexo y edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05A-sexo-edad — Utilización por sexo y edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion` | Eventos por persona atendida | `eventos / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`100`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`utilizacion`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`utilizacion`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Personas atendidas = personas distintas con evento seleccionado. Referencia global: 21.207 / 504 ≈ 42,08. Los distintos no son sumables entre grupos; no representa episodios clínicos únicos ni afiliación activa histórica.

<a id="core-p05b"></a>

### P05B. Eventos por persona registrada, incluyendo ceros

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P05B — Eventos por persona registrada, incluyendo ceros |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población de referencia y denominadores**

1. Abre **Población de referencia y denominadores** y pulsa **Agregar población de referencia**.
2. En **Tabla de población**, selecciona **`public.dim_paciente`**. Deja sus relaciones vacías.
3. Configura:

| Campo | Valor |
| --- | --- |
| Clave de entidad en población | `Base · dim_paciente.paciente_id` del bloque Población |
| Clave de entidad en eventos | `Base · fact_atencion.paciente_id` del bloque Eventos a medir |

Deja **Filtros** sin condiciones.

Deja las agrupaciones de Población vacías, porque este panel no agrupa los eventos.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `registrados` | Personas registradas | `COUNT_DISTINCT` | `Base · dim_paciente.paciente_id` del bloque Población | `count` | Población de referencia total |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `utilizacion_registrada` | Eventos por persona registrada | `eventos / registrados` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No apliques filtros de edad/geografía a esta comparación global sin justificar una población histórica equivalente. Referencia: 4.416 registrados, incluidos los que no tienen eventos, y ≈4,80 eventos por registrado. El registro no acredita afiliación activa durante todo el intervalo.

<a id="core-p06a"></a>

### P06A. Actividad por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06A — Actividad por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · dim_fecha.temporada_convencional` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Actividad observada, no ocupación. Navidad = 24–31 de diciembre; Semana Santa = lunes a domingo de la semana del jueves santo, 2006–2008; los demás días son ordinario. No hay definición de vacaciones, camas, capacidad ni agendas para calcular ocupación.

<a id="core-p06b"></a>

### P06B. Eventos por día calendario y temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06B — Eventos por día calendario y temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población de referencia y denominadores**

1. Abre **Población de referencia y denominadores** y pulsa **Agregar población de referencia**.
2. En **Tabla de población**, selecciona **`public.dim_fecha`**. Deja sus relaciones vacías.
3. Configura:

| Campo | Valor |
| --- | --- |
| Clave de entidad en población | `Base · dim_fecha.fecha_id` del bloque Población |
| Clave de entidad en eventos | `Base · fact_atencion.fecha_atencion_id` del bloque Eventos a medir |

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_fecha.fecha` | GTE | `2006-01-01T00:00:00` |
| `Base · dim_fecha.fecha` | LT | `2009-01-01T00:00:00` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

Después de crear las agrupaciones de eventos del paso siguiente, configura las del bloque Población con **los mismos IDs y en el mismo orden**:

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Base · dim_fecha.temporada_convencional` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · dim_fecha.temporada_convencional` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `dias` | Días calendario | `COUNT_DISTINCT` | `Base · dim_fecha.fecha_id` del bloque Población | `days` | Población de referencia por grupo |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `actividad_diaria` | Eventos por día calendario | `eventos / dias` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`actividad_diaria`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`actividad_diaria`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El denominador cuenta días calendario de cada temporada, incluidos días sin eventos, no días operativos ni capacidad. La media no mide ocupación hospitalaria.

<a id="core-p06c"></a>

### P06C. Actividad de hospitales por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06C — Actividad de hospitales por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 2:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 2 · dim_ips.tipo_ips` | EQ | `hospital` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `ips` |
| Nombre de agrupación | Código de IPS |
| Campo de agrupación | `Relación 2 · dim_ips.ips_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · dim_fecha.temporada_convencional` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No agregues una población calendario con un atributo hospital inexistente. La tabla/matriz cuenta actividad por hospital y temporada hasta el límite de grupos; no ocupación. Las IPS asociadas a médicos no tienen vigencias históricas.

<a id="core-p06d"></a>

### P06D. Actividad de médicos por temporada

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P06D — Actividad de médicos por temporada |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_atencion_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `medico` |
| Nombre de agrupación | Código de médico |
| Campo de agrupación | `Base · fact_atencion.medico_id` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `temporada` |
| Nombre de agrupación | Temporada |
| Campo de agrupación | `Relación 1 · dim_fecha.temporada_convencional` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cuenta registros por médico y temporada. No mide disponibilidad de agenda ni ocupación; los códigos no son alias anónimos.

<a id="core-p07a"></a>

### P07A. Atenciones mensuales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07A — Atenciones mensuales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_atencion. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="core-p07b"></a>

### P07B. Solicitudes mensuales

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07B — Solicitudes mensuales |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · fact_atencion.fecha_solicitud` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_solicitud. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="core-p07c"></a>

### P07C. Espera mensual por fecha de atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07C — Espera mensual por fecha de atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Espera media | `AVG` | `Base · fact_atencion.timestamp_solicitud_local` | `minutes` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna. En los componentes de espera configura además:

| ID de medida | Multiplicar por | Fecha final | Unidad de duración | Excluir negativas | Percentil |
| --- | --- | --- | --- | --- | --- |
| `espera_media` | Sin configurar | `Base · fact_atencion.timestamp_atencion_local` | `minutes` | Marcado | No aplica |

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`espera_media`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El período y la agrupación corresponden a fecha_atencion. Los últimos meses tienen cobertura incompleta: conserva sin configurar Completar calendario salvo que tengas cobertura comprobada. Si utilizas una única dimensión temporal, pulsa Configurar calendario de observación, inicio 2006-01-01 y fin 2008-12-31; marca la confirmación de cobertura solo si la verificaste. La ausencia de un mes no demuestra cero actividad; una media desconocida no se rellena con cero.

<a id="core-p07d"></a>

### P07D. Demanda por día de semana de solicitud

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07D — Demanda por día de semana de solicitud |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_solicitud_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `dia` |
| Nombre de agrupación | Día de semana |
| Campo de agrupación | `Relación 1 · dim_fecha.dia_semana` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`7`**. En **Orden del análisis**, selecciona **`dia`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** 1 lunes, 2 martes, 3 miércoles, 4 jueves, 5 viernes, 6 sábado, 7 domingo. La fecha es solicitud, no atención.

<a id="core-p07d-matriz"></a>

### P07D-matriz. Demanda por mes y día de semana

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07D-matriz — Demanda por mes y día de semana |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_fecha` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `fecha_id` |
| Columna para `fecha_id` | `fecha_solicitud_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de solicitud |
| Campo de agrupación | `Base · fact_atencion.fecha_solicitud` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `dia` |
| Nombre de agrupación | Día de semana |
| Campo de agrupación | `Relación 1 · dim_fecha.dia_semana` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`300`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Hasta 36 × 7 combinaciones. Con dos dimensiones no actives Completar calendario. Las combinaciones ausentes o truncadas no acreditan cero.

<a id="core-p07e"></a>

### P07E. Personas con diagnóstico textual observado por mes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P07E — Personas con diagnóstico textual observado por mes |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`personas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación textual es parcial. No representa todos los enfermos de la población; controles, seguimientos y Sin novedad no son automáticamente enfermedad.

<a id="core-p08a"></a>

### P08A. Tarifa de remisiones por persona atendida y por remisión

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08A — Tarifa de remisiones por persona atendida y por remisión |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `media_remision` | Tarifa media por remisión | `AVG` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con remisión tarifada | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Distingue AVG por remisión de SUM por persona con remisión tarifada. No se calcula costo asistencial completo. Referencia histórica de SUM: 4.380.604.114,00 unidades monetarias del origen.

<a id="core-p08a-mes"></a>

### P08A-mes. Tarifa media mensual de remisiones

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08A-mes — Tarifa media mensual de remisiones |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de atención |
| Campo de agrupación | `Base · fact_atencion.fecha_atencion` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `media_remision` | Tarifa media por remisión | `AVG` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con remisión tarifada | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`media_persona`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No promedies las medias mensuales para calcular el indicador global. El costo real completo sigue sin estar disponible.

<a id="core-p08b"></a>

### P08B. Cobertura de tarifas sobre toda la atención

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P08B — Cobertura de tarifas sobre toda la atención |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `tarifados` | Eventos con tarifa | `COUNT` | `Base · fact_atencion.tarifa_servicio_catalogo` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `cobertura` | Porcentaje de eventos con tarifa | `100 * tarifados / eventos` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tipo_atencion ni IS_NOT_NULL: la cobertura necesita todos los eventos en el denominador. Referencia: 16.742 tarifas de remisión / 21.207 eventos ≈ 78,95 %; las otras modalidades carecen de costo enlazado.

<a id="core-p09-tamano-renal"></a>

### P09-tamano-renal. Personas con diagnóstico textual de deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09-tamano-renal — Personas con diagnóstico textual de deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tarifa ni tipo de atención: este control cuenta todas las personas seleccionables por ese diagnóstico. No uses antecedentes familiares o medicamentos para inferirlo. Las cohortes pueden solaparse y sus tamaños no son sumables.

<a id="core-p09-tamano-vih"></a>

### P09-tamano-vih. Personas con diagnóstico textual de VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09-tamano-vih — Personas con diagnóstico textual de VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** No filtres tarifa ni tipo de atención: este control cuenta todas las personas seleccionables por ese diagnóstico. No uses antecedentes familiares o medicamentos para inferirlo. Las cohortes pueden solaparse y sus tamaños no son sumables.

<a id="core-p09a-renal"></a>

### P09A-renal. Tarifa de toda la atención tarifada de la cohorte deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09A-renal — Tarifa de toda la atención tarifada de la cohorte deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Cohorte: seleccionar personas antes de medir**

1. Abre **Cohortes: seleccionar entidades antes de medir** y pulsa **Agregar cohorte**.
2. En **Cohorte 1 → Tabla de cohorte 1**, selecciona **`public.fact_atencion`**.

Pulsa **Agregar relación verificada** en **Cohorte 1** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

3. Completa los dos selectores situados debajo de la selección de Cohorte 1:

| Campo | Opción exacta |
| --- | --- |
| Entidad de cohorte 1 | `Base · fact_atencion.paciente_id` |
| Entidad de eventos para cohorte 1 | `Base · fact_atencion.paciente_id` |

Ambos muestran **Base** y es correcto: el primero identifica personas en la base del bloque Cohorte; el segundo busca sus eventos en la base de Eventos a medir. No esperes una opción llamada “Cohorte” en el desplegable. Conserva una sola cohorte y **Combinar cohortes = Intersección: todas**. Escribe la fecha inicial completa `2006-01-01`; `2006-01-0` es inválida.

Deja **Población de referencia y denominadores** sin configurar.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona atendida de la cohorte | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La cohorte selecciona personas con ese diagnóstico textual y mide todas sus atenciones tarifadas del período, aunque tengan otro diagnóstico. No pongas grupo/clase diagnóstica en Eventos a medir en este panel. El denominador es personas de la cohorte con atención tarifada; no es el tamaño completo de la cohorte. La tarifa es parcial.

<a id="core-p09a-vih"></a>

### P09A-vih. Tarifa de toda la atención tarifada de la cohorte VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09A-vih — Tarifa de toda la atención tarifada de la cohorte VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Cohorte: seleccionar personas antes de medir**

1. Abre **Cohortes: seleccionar entidades antes de medir** y pulsa **Agregar cohorte**.
2. En **Cohorte 1 → Tabla de cohorte 1**, selecciona **`public.fact_atencion`**.

Pulsa **Agregar relación verificada** en **Cohorte 1** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

3. Completa los dos selectores situados debajo de la selección de Cohorte 1:

| Campo | Opción exacta |
| --- | --- |
| Entidad de cohorte 1 | `Base · fact_atencion.paciente_id` |
| Entidad de eventos para cohorte 1 | `Base · fact_atencion.paciente_id` |

Ambos muestran **Base** y es correcto: el primero identifica personas en la base del bloque Cohorte; el segundo busca sus eventos en la base de Eventos a medir. No esperes una opción llamada “Cohorte” en el desplegable. Conserva una sola cohorte y **Combinar cohortes = Intersección: todas**. Escribe la fecha inicial completa `2006-01-01`; `2006-01-0` es inválida.

Deja **Población de referencia y denominadores** sin configurar.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona atendida de la cohorte | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La cohorte selecciona personas con ese diagnóstico textual y mide todas sus atenciones tarifadas del período, aunque tengan otro diagnóstico. No pongas grupo/clase diagnóstica en Eventos a medir en este panel. El denominador es personas de la cohorte con atención tarifada; no es el tamaño completo de la cohorte. La tarifa es parcial.

<a id="core-p09b-renal"></a>

### P09B-renal. Tarifas de eventos con diagnóstico textual de deficiencia renal

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09B-renal — Tarifas de eventos con diagnóstico textual de deficiencia renal |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `deficiencia_renal` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con evento tarifado de ese diagnóstico | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Deja Cohortes vacío. Aquí se miden solo remisiones tarifadas con ese diagnóstico; difiere de toda la atención de personas de una cohorte. El mapeo es textual, no diagnóstico clínico certificado.

<a id="core-p09b-vih"></a>

### P09B-vih. Tarifas de eventos con diagnóstico textual de VIH/SIDA

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P09B-vih — Tarifas de eventos con diagnóstico textual de VIH/SIDA |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_atencion.tipo_atencion` | EQ | `remision` |
| `Base · fact_atencion.tarifa_servicio_catalogo` | IS_NOT_NULL | Sin valor adicional |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 1 · dim_diagnostico.grupo_textual` | EQ | `vih_sida` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `tarifa` | Tarifa total | `SUM` | `Base · fact_atencion.tarifa_servicio_catalogo` | `origen_money` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `media_persona` | Tarifa por persona con evento tarifado de ese diagnóstico | `tarifa / personas` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Deja Cohortes vacío. Aquí se miden solo remisiones tarifadas con ese diagnóstico; difiere de toda la atención de personas de una cohorte. El mapeo es textual, no diagnóstico clínico certificado.

<a id="core-p10a"></a>

### P10A. Solicitudes por departamento de IPS asociada al médico

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10A — Solicitudes por departamento de IPS asociada al médico |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_ips` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `ips_id` |
| Columna para `ips_id` | `ips_medico_asociado_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_solicitud` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `departamento` |
| Nombre de agrupación | Departamento |
| Campo de agrupación | `Relación 1 · dim_ips.departamento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |
| `total` | Solicitudes totales filtradas | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de solicitudes | `100 * eventos / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El denominador incluye departamentos fuera del Top 10. La zona es la de IPS asociada al médico, no residencia ni regional administrativa.

<a id="core-p10b"></a>

### P10B. Retiros observados por mes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10B — Retiros observados por mes |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `mes` |
| Nombre de agrupación | Mes de retiro |
| Campo de agrupación | `Base · fact_retiro.fecha_retiro` |
| Período de agrupación | `month` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_retiro.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`36`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`mes`**; en **Dirección del análisis**, selecciona **`ASC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Series temporales** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Este conteo no identifica desvinculación por mora: faltan causa, obligación, período y vencimiento. Los destinos vacíos no significan falta de pago.

<a id="core-p10c"></a>

### P10C. Retiros con destino informado y desconocido

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P10C — Retiros con destino informado y desconocido |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `destino` |
| Nombre de agrupación | Destino informado |
| Campo de agrupación | `Base · fact_retiro.destino_informado` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_retiro.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 48 con destino informado y 41 desconocidos. Ninguno de esos grupos demuestra mora; no existe promedio de desvinculación por mora calculable con estos datos.

<a id="core-p11a"></a>

### P11A. Cobertura de cabeceras de recetas

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_formula`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_formula`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P11A — Cobertura de cabeceras de recetas |
| Qué representa una fila | Una fórmula médica |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `recetas` | Recetas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 7.484 recetas. No hay total facturado por receta ni detalle con cantidad/precio vigente; costo promedio de recetas no calculable. Exporta la cobertura y deja explícitos los datos faltantes. No presentes costo cero.

<a id="core-p11b"></a>

### P11B. Cobertura de presencias y códigos de medicamentos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P11B — Cobertura de presencias y códigos de medicamentos |
| Qué representa una fila | Una presencia fórmula–medicamento |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `fact_formula` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `codigo_formula` |
| Columna para `codigo_formula` | `codigo_formula` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Relación 1 · fact_formula.fecha_formula` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `presencias` | Presencias | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `codigos` | Códigos distintos | `COUNT_DISTINCT` | `Base · puente_formula_medicamento.medicamento_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: 15.770 presencias y 166 códigos. No hay unidades prescritas/dispensadas ni precios. Para un costo futuro harían falta cantidades × precios o valores facturados, sumar por receta y después promediar recetas. No uses aportes ni tarifas POS como sustitutos.

<a id="core-p12-no-edad"></a>

### P12-no-edad. Perfil por edad al corte de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-edad — Perfil por edad al corte de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Edad al corte |
| Campo de agrupación | `Base · dim_paciente.fecha_nacimiento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | `2008-12-09` |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo es nacimiento: la edad se calcula al corte histórico indicado.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-no-escolaridad"></a>

### P12-no-escolaridad. Perfil por escolaridad propia de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-escolaridad — Perfil por escolaridad propia de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Escolaridad propia |
| Campo de agrupación | `Base · dim_paciente.escolaridad_propia` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-no-estrato"></a>

### P12-no-estrato. Perfil por estrato propio de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-estrato — Perfil por estrato propio de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Base · dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-no-sexo"></a>

### P12-no-sexo. Perfil por sexo de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-sexo — Perfil por sexo de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Base · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-no-tipo"></a>

### P12-no-tipo. Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-no-tipo — Perfil por tipo de cotizante propio de cotizantes que no provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Base · dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-si-edad"></a>

### P12-si-edad. Perfil por edad al corte de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-edad — Perfil por edad al corte de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Edad al corte |
| Campo de agrupación | `Base · dim_paciente.fecha_nacimiento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | `2008-12-09` |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo es nacimiento: la edad se calcula al corte histórico indicado.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-si-escolaridad"></a>

### P12-si-escolaridad. Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-escolaridad — Perfil por escolaridad propia de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Escolaridad propia |
| Campo de agrupación | `Base · dim_paciente.escolaridad_propia` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-si-estrato"></a>

### P12-si-estrato. Perfil por estrato propio de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-estrato — Perfil por estrato propio de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Base · dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-si-sexo"></a>

### P12-si-sexo. Perfil por sexo de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-sexo — Perfil por sexo de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Base · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12-si-tipo"></a>

### P12-si-tipo. Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12-si-tipo — Perfil por tipo de cotizante propio de cotizantes que sí provienen de otra EPS |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |
| `Base · dim_paciente.proviene_otra_eps_propio` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Base · dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Personas del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Personas de la procedencia filtrada | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje dentro de la procedencia | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Cada procedencia tiene su propio denominador. Conserva desconocidos como tales, incluida escolaridad N/A; no los conviertas en un nivel real. Los atributos son propios de cotizantes, sin historia completa. Cinco atributos por dos procedencias forman diez paneles: expórtalos en dos lotes de hasta ocho. La mora necesita obligaciones y vencimientos, ausentes.

<a id="core-p12a"></a>

### P12A. Procedencia de otras EPS de los cotizantes al corte

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P12A — Procedencia de otras EPS de los cotizantes al corte |
| Qué representa una fila | Una persona registrada |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · dim_paciente.fecha_afiliacion_propia` | LT | `2008-12-10T00:00:00` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `procedencia` |
| Nombre de agrupación | Proviene de otra EPS |
| Campo de agrupación | `Base · dim_paciente.proviene_otra_eps_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `personas` | Personas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`personas`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** True = sí, False = no, nulo = desconocido. Beneficiarios no tienen un dato propio equivalente y quedan fuera. Corte histórico 2008-12-09; no uses fecha actual. Una fecha de pago aislada no permite identificar pagos tardíos.

<a id="core-p13a"></a>

### P13A. Diagnósticos textuales observados por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13A — Diagnósticos textuales observados por sexo |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 2:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Relación 1 · dim_diagnostico.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 2 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="core-p13b"></a>

### P13B. Diagnósticos textuales observados por grupo de edad

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13B — Diagnósticos textuales observados por grupo de edad |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Relación 1 · dim_diagnostico.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="core-p13c"></a>

### P13C. Diagnósticos textuales observados por estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13C — Diagnósticos textuales observados por estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 2:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Relación 1 · dim_diagnostico.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `estrato` |
| Nombre de agrupación | Estrato familiar |
| Campo de agrupación | `Relación 2 · dim_paciente.estrato_familiar` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Matriz de intensidad** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** La clasificación es textual, parcial y no validada clínicamente. El origen registra sexo, no identidad de género. Estrato familiar puede ser heredado y carece de historia. Un Top de combinaciones difiere de un Top global de enfermedades; no presentes prevalencia poblacional.

<a id="core-p13d"></a>

### P13D. Enfermedad, sexo y edad dentro de un estrato familiar

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13D — Enfermedad, sexo y edad dentro de un estrato familiar |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 2:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |
| `Relación 2 · dim_paciente.estrato_familiar` | EQ | `<estrato existente>` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Relación 1 · dim_diagnostico.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 2 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_atencion.edad_al_evento` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`1000`**; si la conexión impone un máximo menor, usa ese máximo y declara la limitación. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Sustituye el marcador por un estrato existente. El constructor tiene tres dimensiones predeterminadas; el estrato queda como filtro. Para una matriz usa solo dos dimensiones y fija otro atributo como filtro. La tabla conserva el cruce hasta el límite de grupos.

<a id="core-p13e"></a>

### P13E. Cobertura de clasificación de textos diagnósticos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13E — Cobertura de clasificación de textos diagnósticos |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `clase` |
| Nombre de agrupación | Clase de texto |
| Campo de agrupación | `Relación 1 · dim_diagnostico.clase_texto` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Sin filtro de clase. Permite ver controles, seguimientos, no clasificados y nulos. Referencia: 1.972 eventos clasificados como diagnóstico observado de 21.207; no todas las atenciones son enfermedades confirmadas.

<a id="core-p13f"></a>

### P13F. Grupos textuales de enfermedad más frecuentes

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P13F — Grupos textuales de enfermedad más frecuentes |
| Qué representa una fila | Un registro de atención de una tabla origen; no episodio clínico único |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_diagnostico` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `diagnostico_id` |
| Columna para `diagnostico_id` | `diagnostico_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_atencion.fecha_atencion` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Relación 1 · dim_diagnostico.clase_texto` | EQ | `diagnostico_observado` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `enfermedad` |
| Nombre de agrupación | Grupo textual |
| Campo de agrupación | `Relación 1 · dim_diagnostico.grupo_textual` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `eventos` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`10`**. En **Orden del análisis**, selecciona **`eventos`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`eventos`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Este Top ordena enfermedades globalmente, sin fragmentarlas por sexo/edad/estrato. El conteo sigue limitado por la clasificación textual disponible.

<a id="core-p14-desconocidos"></a>

### P14-desconocidos. Perfil de retiros con EPS destino desconocida

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-desconocidos — Perfil de retiros con EPS destino desconocida |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `false` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `sexo` |
| Nombre de agrupación | Sexo registrado |
| Campo de agrupación | `Relación 1 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros con destino desconocido | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro desconocidos | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 41 retiros. Destino desconocido no significa mora ni certifica ausencia de cambio de EPS. El denominador pertenece a este grupo, no a los 48 destinos informados.

<a id="core-p14-edad"></a>

### P14-edad. Perfil de retiros informados por edad al retiro

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-edad — Perfil de retiros informados por edad al retiro |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `edad` |
| Nombre de agrupación | Grupo de edad |
| Campo de agrupación | `Base · fact_retiro.edad_al_retiro` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Rangos numéricos o de edad** añade una fila por intervalo:

| Nombre | Mínimo incluido | Máximo excluido |
| --- | --- | --- |
| 0–4 | 0 | 5 |
| 5–14 | 5 | 15 |
| 15–24 | 15 | 25 |
| 25–44 | 25 | 45 |
| 45–64 | 45 | 65 |
| 65+ | 65 | Vacío |

El campo ya es una edad numérica: no actives otra conversión de edad.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="core-p14-estrato"></a>

### P14-estrato. Perfil de retiros informados por estrato propio

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-estrato — Perfil de retiros informados por estrato propio |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Estrato propio |
| Campo de agrupación | `Relación 1 · dim_paciente.estrato_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="core-p14-sexo"></a>

### P14-sexo. Perfil de retiros informados por sexo

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-sexo — Perfil de retiros informados por sexo |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Sexo |
| Campo de agrupación | `Relación 1 · dim_paciente.sexo` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="core-p14-tipo"></a>

### P14-tipo. Perfil de retiros informados por tipo de cotizante propio

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14-tipo — Perfil de retiros informados por tipo de cotizante propio |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Pulsa **Agregar relación verificada** en **Eventos a medir** y configura la relación 1:

| Campo | Valor |
| --- | --- |
| Partir de relación | `base` |
| Destino de relación | `dim_paciente` |
| Cruce de relación | `LEFT` |
| PK/UNIQUE | `paciente_id` |
| Columna para `paciente_id` | `paciente_id` de la base de este bloque |

Si el destino no aparece, falta su PK/UNIQUE física o el catálogo está desactualizado. Vuelve a **Conectar y leer catálogo** tras preparar la clave mediante el apartado de esa tabla en [la guía ETL](GUIA_ETL_WEB.md#6-preparar-claves-de-la-bodega-del-cuaderno-sin-recargar-filas); conserva las filas existentes.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `perfil` |
| Nombre de agrupación | Tipo de cotizante propio |
| Campo de agrupación | `Relación 1 · dim_paciente.tipo_cotizante_propio` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `n` | Retiros del grupo | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `total` | Retiros informados del período | `COUNT_ROWS` | No requiere columna | `count` | Total filtrado antes de Top N |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Pulsa **Agregar indicador calculado** por cada fila y completa:

| ID | Nombre | Fórmula | Unidad |
| --- | --- | --- | --- |
| `porcentaje` | Porcentaje de eventos de retiro | `100 * n / total` | `auto` |

Las fórmulas utilizan los IDs de componentes, no sus nombres visibles. Una división por cero da **Sin valor**.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`porcentaje`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** El porcentaje es de eventos de retiro. Personas únicas requieren COUNT_DISTINCT paciente_id coherente en numerador y denominador y revisión de repeticiones. La edad ya es numérica al retiro; no vuelvas a convertirla desde una fecha actual.

<a id="core-p14a"></a>

### P14A. EPS destino de retiros informados

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | P14A — EPS destino de retiros informados |
| Qué representa una fila | Un evento de retiro |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · fact_retiro.fecha_retiro` | BETWEEN | Inicio `2006-01-01`; fin `2008-12-31` |
| `Base · fact_retiro.destino_informado` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `eps` |
| Nombre de agrupación | EPS destino |
| Campo de agrupación | `Base · fact_retiro.eps_destino` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `retiros` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas distintas | `COUNT_DISTINCT` | `Base · fact_retiro.paciente_id` | `count` | Grupo actual |
| `edad_media` | Edad media al retiro | `AVG` | `Base · fact_retiro.edad_al_retiro` | `years` | Grupo actual |
| `dias_media` | Días medios de afiliación al retiro | `AVG` | `Base · fact_retiro.dias_afiliacion_al_retiro` | `days` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **`retiros`**; en **Dirección del análisis**, selecciona **`DESC`**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, selecciona **Barras agrupadas** y, en **Medida y unidad del gráfico**, elige **`retiros`**. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: pulsa **Ejecutar todos los paneles**, revisa los resultados, pulsa **Guardar definición del reporte** y **Exportar definición** antes de empezar otro lote. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 48 retiros de 48 pacientes, Cafesalud en 16. Cambia el selector de unidad para ver edad y días por separado; no mezcles unidades en un eje. La edad corresponde al retiro; la duración usa la afiliación del titular disponible.

## 4. Retomar y editar un reporte ya guardado

1. Abre la aplicación desplegada, inicia sesión y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de `colombia_saludable_dw_core` y sus credenciales; activa **Usar agente local híbrido** si la base está en tu PC y mantén el agente conectado. Pulsa **Conectar y leer catálogo**.
2. En **Análisis avanzados y reportes**, pulsa **Restaurar reporte guardado** para recuperar la definición del navegador, o **Importar definición JSON** para seleccionar la que exportaste. No importes un CSV de resultados como definición.
3. Verifica tablas, títulos, zona, períodos y los filtros de cada panel. La definición no contiene credenciales ni resultados congelados y no selecciona otra base por sí misma.
4. Pulsa **Ejecutar todos los paneles**. Un lote admite hasta ocho análisis de la misma conexión. En PostgreSQL comparten snapshot de esa operación; lotes de momentos distintos pueden leer estados distintos.
5. Para cambiar un panel pulsa **Editar copia del panel**. Modifica la copia, pulsa **Calcular análisis**, revisa su tabla y **Agregar esta definición al reporte**. Después pulsa **Quitar panel** en la versión anterior: editar la copia no la reemplaza automáticamente.
6. Si necesitas un filtro compartido, abre **Añadir filtros compartidos con mapeo por panel**, agrega la condición y selecciona expresamente el campo compatible de cada panel o **Excluir panel de ese filtro**. Distingue fecha de solicitud, atención, pago, fórmula y retiro; la cohorte tiene un período propio. Aplicar agrega condiciones AND: no borra un rango anterior. Para sustituirlo, edita la definición correspondiente y retira los filtros viejos.
7. Ejecuta otra vez **todos los paneles**, comprueba las definiciones y guarda/exporta la nueva definición con nombre de lote. El navegador conserva una definición por contexto, por lo que conviene exportar cada lote antes de guardar otro.
8. Para conservar la ejecución, descarga **este resultado JSON** y **esta tabla CSV** de cada panel. Cuando esté disponible en barras o líneas, pulsa **Descargar gráfico SVG**. Las matrices conservan tabla/CSV/JSON. No hay exportación PDF integrada en este recorrido.
9. Los resultados avanzados se descargan sin volver a consultar. Las descargas de la consulta sencilla pueden hacer otra lectura; no se debe presuponer que son la misma ejecución. Tras recargar la página vuelve a introducir credenciales y ejecutar las definiciones si necesitas resultados actuales.

## 5. Referencias y alcance

- [Taller original](Taller_Colombia_Saludable.pdf) y [matriz de preguntas, métricas y limitaciones](planes_y_evidencia/plan_answers.md).
- [Implementación y resultados de las respuestas del cuaderno](planes_y_evidencia/implementacion_answers.md) e [índice de tablas/figuras](planes_y_evidencia/respuestas/README.md).
- [Modelo](planes_y_evidencia/carga_core/modelo_bodega.json), [diccionario de la bodega](planes_y_evidencia/carga_core/diccionario_bodega.csv) y [capacidades de la aplicación](../docs/general-etl-analytics.md).
- [Guía ETL](GUIA_ETL_WEB.md) y [propósito de cada tabla](DICCIONARIO_Y_PROPOSITO_TABLAS.md).

La guía incorpora las aclaraciones de las conversaciones **«Explicar filtros de departamento y <»**, **«Aclarar comprobación de pacientes»** y **«Aclarar el paso 3 del punto 4.1»**, contrastadas con la implementación y la evidencia local. Esta actualización documental no ejecutó los paneles sobre la bodega del usuario ni modificó datos.
