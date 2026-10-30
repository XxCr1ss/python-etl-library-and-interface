# Plan de desarrollo de answers.ipynb

Estado: **plan implementado y ejecutado** en [answers.ipynb](../cuadernos/answers.ipynb). Las 14 viñetas analíticas del taller se numeran como P01–P14. La implementación, validaciones y límites están en [implementacion_answers.md](implementacion_answers.md); los resultados están en el [índice de exportaciones](respuestas/README.md). La carga permanece documentada en [manifest_carga.json](carga_core/manifest_carga.json) y [verificacion_independiente.json](carga_core/verificacion_independiente.json). Las secciones siguientes conservan las decisiones del plan aplicado.

Fuente del requerimiento: `../Taller_Colombia_Saludable.pdf`, página 4; entregables, página 5. Las cinco páginas contienen texto; no se encontraron dentro del PDF los formatos de diseño adjuntos que menciona el enunciado. El alcance acordado usa cuadernos como superficie de análisis y visualización, sin utilizar la parte gráfica del proyecto.

## 1. Estructura y condiciones de ejecución

1. Introducción: corte de datos, alcance, glosario y estado de validación de la carga.
2. Conexión a la bodega usando `DB_Extractor` en modo lectura, con `.env` sin credenciales en salidas. Verificar nombre real de base, tablas requeridas y manifiesto de carga exitosa. El manifiesto `ejecucion_diagnostico.json` no certifica una carga.
3. Parámetros comunes: intervalo de fechas, tipos de evento, IPS/departamento, sexo, grupo de edad y definición de población. Sin dependencias de backend o frontend.
4. Calidad: conteos, exclusiones, cobertura de tarifas, interpretación de geografía y limitaciones de historia.
5. P01–P14: una sección por pregunta, con definición del indicador, consulta, tabla, visualización, interpretación y límites. Cuando no hay datos, explicar la ausencia y la fuente necesaria, sin emitir un cero o una gráfica ficticia.
6. Exportaciones de resultados agregados a `planes_y_evidencia/respuestas/` y conclusión apoyada en resultados reales.

Los códigos y métricas deben salir de la bodega después de la carga. El origen solo se usará para conciliación, no para resolver silenciosamente una respuesta cuando falte una tabla en destino. Los filtros de fecha se aplicarán de forma coherente por rol (solicitud para demanda, atención para prestación, pago para aportes y fórmula para recetas).

## 2. Matriz completa de preguntas, métricas y límites

| ID | Pregunta del taller | Cálculo y fuentes propuestas en DWH | Visualización | Viabilidad con los datos actuales |
| --- | --- | --- | --- | --- |
| P01 | Espera de citas y cirugías | Media, mediana y percentiles de `espera_valida_min` en `fact_atencion`; separar cita general y remisiones con servicio clasificado como cirugía. Mostrar N válido/excluido | Barras y distribución de esperas por tipo/mes | Parcial: solicitud/remisión a atención, no fecha certificada de asignación. 497 remisiones negativas se excluyen solo de espera |
| P02 | Centros que más atienden; pagos por afiliado, familia, empresa, ciudad y regional; costo familiar | Conteo de eventos y pacientes distintos por IPS asociada al médico. `SUM(valor_aporte)` de `fact_pago` por cotizante/familia/empresa/IPS de afiliación. Tarifa de remisiones sumada por familia como estimación parcial | Barras de prestadores y tabla de aportes; costo estimado en gráfico separado | Pagos disponibles. IPS y empleador son asociaciones actuales. Ciudad/departamento de IPS no son residencia ni regional administrativa. Costo familiar real no disponible |
| P03 | Costo por estrato, ocupación y grupo etario; medicamentos más recetados en un período | Tarifas de remisiones por `estrato_familiar`, tipo cotizante y edad al evento; explicitar subconjunto con tarifa. `COUNT(DISTINCT codigo_formula)` por código de medicamento y período | Barras por segmento y Top N de códigos | Costo solo estimado y parcial; ocupación específica ausente, tipo de cotizante es aproximación. Frecuencias disponibles por código, sin nombres |
| P04 | Medicamentos formulados juntos y más frecuentes | Autounión analítica del puente fórmula–medicamento por fórmula, ordenando código A < B, sin pares consigo mismo; conteo de recetas compartidas y soporte = recetas con par / recetas del período. Frecuencia individual por recetas | Matriz de coocurrencia y barras | Disponible por código. No interpretar combinación como recomendación clínica, dosis ni entrega |
| P05 | Utilización media por paciente, sexo y edad | `N_eventos / N_pacientes_atendidos` por sexo y edad al evento. Mostrar también pacientes distintos y eventos; separar tipos de evento. Para media sobre afiliados registrados incluir ceros y rotular población | Barras de utilización y tabla de denominadores | Disponible como eventos registrados. No representa episodios únicos ni tasa por tiempo de exposición; faltan vigencias completas de beneficiarios |
| P06 | Ocupación de hospitales y médicos en Navidad, vacaciones y Semana Santa | Conteo de eventos por IPS/médico y temporada, rotulado actividad o demanda. Estancia solo descriptiva hasta confirmar unidad. Temporadas con reglas explícitas | Mapa de calor mes/día y barras de actividad por temporada | Ocupación real no calculable: no hay camas, capacidad ni agendas. Vacaciones carece de definición en origen; no inventarla |
| P07 | Épocas de más atención, espera y enfermos; días de mayor demanda | Solicitudes y atenciones por sus fechas respectivas; espera válida por mes/día; pacientes distintos con diagnóstico clasificado por período | Series y mapa de calor por día/mes, gráficos separados para conteos y tiempos | Atención/demanda/espera disponibles. “Enfermos” requiere catálogo diagnóstico: controles y “Sin novedad” no son enfermedades confirmadas |
| P08 | Costo promedio de atención a usuarios | `SUM(tarifa_catalogo_remisiones) / N_pacientes_con_remision_tarifada` y tarifa media por remisión; mostrar cobertura, período y denominadores diferentes | Tabla y barras de estimación parcial | No responde costo real total. Citas, urgencias y hospitalizaciones no tienen costo enlazado |
| P09 | Costo de atención de pacientes con SIDA, insuficiencia renal, etc. | Cohorte explícita desde diagnóstico observado en `fact_atencion`; agregar tarifas de remisiones de cohorte en el período. Separar costo estimado de eventos con ese diagnóstico y costo estimado de toda la cohorte | Barras y tabla de cohorte/cobertura | Parcial: mapeo diagnóstico documentado; sin inferir enfermedades desde antecedentes familiares o medicamentos; sin costos reales completos |
| P10 | Regiones con más demanda; desvinculación por pago no oportuno | Solicitudes por departamento de IPS asociada al médico; regional solo con catálogo adicional. Conteo de retiros disponible, sin atribución a mora | Barras departamentales; tabla de datos faltantes para mora | Demanda departamental como aproximación geográfica. Desvinculación por mora no calculable sin causa y obligaciones/vencimientos |
| P11 | Costo promedio de recetas médicas | Requerir detalle medicamento, cantidad y precio vigente o valor facturado por receta; no existe en el DWH propuesto porque no está en origen | Tabla de cobertura y datos requeridos | No calculable: 166 códigos sin catálogo, precios o cantidades. Aportes y tarifas de remisión no se usarán como sustitutos |
| P12 | Perfil de usuarios provenientes de otras EPS y de quienes pagan tarde | Perfil de cotizantes con `proviene_otra_eps='1'` frente a los demás: sexo, edad a fecha de corte histórica, estrato, tipo y escolaridad. Para mora requerir obligación, período y vencimiento | Barras de proporciones, con tamaño de grupos | Primer perfil disponible solo para cotizantes. Pagadores tardíos no identificables con fecha y valor de pago aislados |
| P13 | Enfermedades más frecuentes por género, edad y estrato | Diagnósticos agrupados mediante mapeo; contar eventos y pacientes distintos por grupo, sexo registrado, edad al evento y estrato propio/familiar claramente rotulado | Barras y mapas de calor | Parcial: texto libre y perfil sin historia; separar frases de control y antecedentes familiares. No afirmar prevalencia poblacional |
| P14 | Perfil de quien se cambia a otra EPS | `fact_retiro` con EPS destino informada; enlazar cotizante y calcular edad al retiro. Distribuciones de sexo, estrato, tipo de cotizante, EPS destino y tiempo afiliación–retiro | Barras y tabla de comparación | Disponible para 48 retiros con destino informado; 41 retiros sin destino quedan como desconocidos, no como mora |

## 3. Definiciones que evitan resultados engañosos

- **Paciente atendido**: persona con al menos un evento en la selección. **Afiliado registrado**: persona del catálogo. La segunda población no equivale necesariamente a afiliados activos durante todo el período. Mostrar ambos denominadores cuando se compare utilización.
- **Pagos**: suma de aportes recibidos. No repartir un aporte de titular a todos los beneficiarios y luego volver a sumarlo. Pago individual se atribuye al cotizante; pago familiar suma las transacciones del titular una sola vez.
- **Edad**: en hechos, edad a fecha del evento; en perfiles de corte, usar la última fecha histórica pertinente de los datos, definida en la cabecera. Nunca usar la edad actual para describir 2006–2008.
- **Promedios**: calcular con numerador y denominador globales, no promediar medias de grupos. Diferenciar tarifa media por evento, estimación por usuario y aporte medio por cotizante.
- **Coformulación**: un código cuenta una vez por receta; un par no ordenado una vez por receta. Autouniones se harán en la capa analítica con SQL de lectura mediante el Core, permitidas en el cuaderno de respuestas. No cargar pares artificiales como nuevos eventos de la bodega.
- **Geografía**: departamento/municipio de IPS asociada al médico o IPS de afiliación, según la pregunta, con etiqueta visible. No asumir domicilio del afiliado, sitio real de atención o regional de EPS.
- **Desconocidos**: mantenerlos en tablas y explicar su proporción. No sustituir ausencia por cero y no clasificar `cambio_a_eps` vacío como mora.
- **Temporadas**: fijar definición antes del cálculo y contar cada evento una sola vez en categorías excluyentes, o indicar claramente superposición. No se ha acordado un calendario de vacaciones.
- **Dinero**: conservar exactitud en consultas/tablas y redondear únicamente la presentación. La columna `costo` no declara moneda en el esquema; no certificar COP sin un diccionario que lo confirme. Rotular “unidades monetarias del origen” mientras tanto.

## 4. Core, gráficos y exportación

`DB_Extractor.execute_query` permite leer agregados desde el DWH sin pasar por la interfaz del proyecto. El Core incluye `etl.warehouse` para catálogo, agregados y CSV/JSON, pero no tiene renderizadores Python de gráficos. Además, su compilador limita joins y necesita claves únicas verificables; la carga Core actual no crea esas restricciones físicas. No es necesario forzar ese módulo para contestar el taller.

Se propone usar **Matplotlib** en `answers.ipynb` para barras, series, histogramas y matrices, y pandas para presentación y análisis permitido en este cuaderno. No se requiere una nueva aplicación gráfica ni un servidor. Si después se desean filtros interactivos, se podrá evaluar Plotly/ipywidgets en una tarea posterior; no son necesarios para el alcance actual.

Cada figura tendrá título con indicador, intervalo y unidad; ejes legibles; tamaño de muestra y exclusiones cercanos; y su tabla de resultados. Mostrar orden cronológico en fechas, Top N explícito y categorías desconocidas. Exportar CSV UTF-8 y PNG de resultados agregados, sin identificadores personales ni credenciales. Si falta una fuente, la sección mostrará una explicación de indisponibilidad, no una gráfica vacía que sugiera cero.

## 5. Validación antes de entregar respuestas

1. Verificar carga completa, base correcta y tablas esperadas; fallar claramente si la bodega está vacía o la carga es parcial.
2. Conciliar eventos, pagos y fórmulas con la evidencia de carga. El diagnóstico previo sirve como referencia inicial, no como valor fijo si cambió el origen.
3. Asegurar que cada join dimensional mantiene el grano; sumar pagos y tarifas antes de unirlos a otros hechos. No unir directamente eventos, pagos y recetas por persona y multiplicar medidas.
4. Verificar exclusiones de espera, edad histórica, códigos únicos por fórmula y pares A < B. Confirmar que periodos y denominadores de las tablas coinciden con los de las figuras.
5. Ejecutar el cuaderno completo, guardar salidas y revisar figuras. Cada P01–P14 debe concluir con resultado sustentado, aproximación explícita o datos faltantes concretos.

## 6. Orden de desarrollo

Después del ETL: implementar prevalidación y filtros; resolver primero P01, P04, P05, P07 y perfiles disponibles de P12/P14; después aportes de P02 y estimaciones parciales de P03/P08/P09/P13; finalmente documentar y visualizar las partes disponibles de P06/P10/P11. Todos los apartados permanecerán en el orden del taller para lectura.

El ETL se validó antes de ejecutar las respuestas. La implementación preserva las limitaciones del plan; ninguna pregunta sin datos se sustituye por un resultado inventado.
