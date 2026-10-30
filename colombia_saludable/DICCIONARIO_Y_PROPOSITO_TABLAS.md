# Diccionario y propósito de las tablas de Colombia Saludable

Actualizado el 30 de octubre de 2026.

Este documento explica **por qué existe cada tabla, qué representa una fila, cómo se usa y qué pregunta del taller necesita**. Complementa la [guía ETL](GUIA_ETL_WEB.md) y la [guía de respuestas en la interfaz](GUIA_RESPUESTAS_TALLER_WEB.md). No ejecuta creación ni modificación de tablas.

## 1. Dos modelos y cuatro clases de tabla

La ruta de la interfaz crea **24 tablas con prefijo web_**: dimensiones, hechos, mapas y auxiliares. La bodega del cuaderno contiene **17 tablas sin ese prefijo**; comparte objetivos, pero no todos los nombres de columnas ni las tablas intermedias. No son copias intercambiables por renombrado.

- **Dimensión:** una fila por entidad descriptiva, como paciente o IPS. Da categorías y claves estables; contar una dimensión de pacientes mide registrados.
- **Hecho:** una fila por acontecimiento, como atención, pago o retiro. Conserva importes/fechas con su grano; contar atención mide eventos.
- **Puente:** una fila por asociación, como una presencia fórmula–medicamento. Representa relaciones múltiples sin suponer cantidades.
- **Mapa o auxiliar:** una clasificación o etapa materializada del ETL. Prepara claves y atributos para los cruces disponibles en la web. No se suma como población adicional a las tablas finales.

**Grano** significa qué representa exactamente una fila. **PK** identifica esa fila de forma única. **UNIQUE** asegura otra clave alternativa sin repeticiones. **FK** verifica la referencia hacia otra tabla. Una validación lógica documentada no implica que exista una restricción física en PostgreSQL; la interfaz consulta estas últimas para ofrecer relaciones seguras.

## 2. Tablas creadas mediante la interfaz

### web_dim_fecha

**Grano y clave:** Un día del calendario de observación. PK `fecha_id`; UNIQUE `fecha`. Referencia histórica: 1.096 filas. Se construye en el paso **4.1** de la guía ETL, a partir de Dimensión Fecha, años 2006 a 2008.

**Por qué se crea y para qué se utilizará:** Calendario independiente de los eventos. Permite agrupar días por mes, día de semana y temporada y contar días sin actividad en un denominador calendario.

**Preguntas del taller:** P06 y P07; soporte temporal de P01–P14 cuando un hecho tiene fecha.

**Cómo participa en el modelo:** Se une por fecha_solicitud_id o fecha_atencion_id a atención; fecha_pago_id, fecha_formula_id y fecha_retiro_id a sus hechos. Cada rol tiene una interpretación distinta.

**Qué evita o qué límite conserva:** Si se contaran solo los días presentes en hechos, una temporada de pocos días con eventos podría compararse con otra usando denominadores diferentes. No acredita operación del hospital ni define vacaciones.

### web_dim_empresa

**Grano y clave:** Una empresa. PK `empresa_id`. Referencia histórica: 21 filas. Se construye en el paso **4.2** de la guía ETL, a partir de origen: empresa.

**Por qué se crea y para qué se utilizará:** Catálogo de empleadores, separado de los pagos para conservar una sola descripción por empresa y evitar repetir su nombre en cada transacción.

**Preguntas del taller:** P02D, aportes por empresa.

**Cómo participa en el modelo:** empresa_id enlaza pagos y perfiles. Las filas sin empleador se conservan con empresa_id nulo.

**Qué evita o qué límite conserva:** La ciudad empresarial y el total de empleados no representan residencia de pacientes ni población afiliada activa; no se usan como denominadores por defecto.

### web_dim_ips

**Grano y clave:** Una IPS. PK `ips_id`. Referencia histórica: 86 filas. Se construye en el paso **4.3** de la guía ETL, a partir de origen: ips.

**Por qué se crea y para qué se utilizará:** Catálogo de prestadores y su geografía. Proporciona nombre, tipo, nivel, municipio y departamento para identificar y filtrar resultados.

**Preguntas del taller:** P02A, P02E–F, P06C y P10A; cortes geográficos de otros paneles.

**Cómo participa en el modelo:** Atención usa ips_medico_asociado_id; pagos usan ips_afiliacion_id. Ambas columnas se relacionan con ips_id, pero describen roles diferentes.

**Qué evita o qué límite conserva:** La ubicación de la IPS no es residencia del paciente ni regional administrativa de la EPS. La asociación médico–IPS disponible no acredita vigencias históricas.

### web_dim_medico

**Grano y clave:** Un médico. PK `medico_id`. Referencia histórica: 720 filas. Se construye en el paso **4.4** de la guía ETL, a partir de origen: medico.

**Por qué se crea y para qué se utilizará:** Relaciona cada profesional con la IPS asociada disponible y conserva especialidad/subespecialidad. Es necesaria para atribuir la geografía a hechos que solo traen un médico.

**Preguntas del taller:** P06D directamente; P02A, P06C y P10A indirectamente al enriquecer atención.

**Cómo participa en el modelo:** medico_id enlaza atención y recetas; durante el ETL aporta ips_medico_asociado_id, que luego enlaza con la dimensión IPS.

**Qué evita o qué límite conserva:** No contiene agendas ni horas disponibles; eventos por médico son actividad, no ocupación ni productividad ajustada por capacidad.

### web_mapa_servicio

**Grano y clave:** Una clasificación por código de servicio. PK `servicio_id`. Referencia histórica: 67 filas. Se construye en el paso **4.5.A** de la guía ETL, a partir de archivo: [mapeo_servicios.csv](planes_y_evidencia/carga_core/mapeo_servicios.csv).

**Por qué se crea y para qué se utilizará:** Materializa la clasificación revisada del CSV para que el cruce web pueda identificar cirugías por código. La interfaz lee la tabla derecha completa, sin aplicar recetas externas.

**Preguntas del taller:** P01B/P01D, esperas de cirugías; apoyo a P02G, P03, P08 y P09 al interpretar servicios tarifados.

**Cómo participa en el modelo:** servicio_id aporta tipo_servicio a web_dim_servicio. Debe cargarse antes de la dimensión.

**Qué evita o qué límite conserva:** El CSV no suministra la tarifa vigente: esta se lee de servicios_pos. Las partes 4.5.A y 4.5.B son complementarias, no opciones alternativas.

### web_dim_servicio

**Grano y clave:** Un servicio POS. PK `servicio_id`. Referencia histórica: 67 filas. Se construye en el paso **4.5.B** de la guía ETL, a partir de origen: servicios_pos.

**Por qué se crea y para qué se utilizará:** Reúne código, descripción, clasificación y tarifa de catálogo del servicio POS en una fila por servicio.

**Preguntas del taller:** P01B/P01D, cirugía; P02G, P03A–C, P08 y P09, estimaciones tarifarias parciales.

**Cómo participa en el modelo:** servicio_id enriquece remisiones y se conserva como FK del hecho. Una clasificación faltante debe bloquear la carga hasta revisarla.

**Qué evita o qué límite conserva:** Una tarifa de catálogo no es el costo real completo ni se aplica a citas, urgencias u hospitalizaciones sin servicio enlazado.

### web_mapa_diagnostico

**Grano y clave:** Una clasificación por texto diagnóstico normalizado. PK `diagnostico_normalizado`. Referencia histórica: consulta el CSV vigente; el catálogo histórico tiene 87 textos diagnósticos filas. Se construye en el paso **4.6** de la guía ETL, a partir de archivo: [clasificacion_diagnosticos.csv](planes_y_evidencia/carga_core/clasificacion_diagnosticos.csv).

**Por qué se crea y para qué se utilizará:** Permite asignar una agrupación revisada a textos libres normalizados y distinguir diagnóstico observado, control, seguimiento y no clasificado.

**Preguntas del taller:** P07E, P09 y P13.

**Cómo participa en el modelo:** diagnostico_normalizado se cruza con atención; grupo_textual y clase_texto se materializan en web_fact_atencion para consultar desde esa tabla.

**Qué evita o qué límite conserva:** Es una clasificación textual parcial y no validada clínicamente. Los textos sin coincidencia permanecen desconocidos; no inventa códigos CIE-10 ni enfermedades desde antecedentes.

### web_aux_laboral

**Grano y clave:** Una relación laboral por cotizante. PK `usuario_origen`. Referencia histórica: 925 filas. Se construye en el paso **4.7.A** de la guía ETL, a partir de origen: empresa_cotizante.

**Por qué se crea y para qué se utilizará:** Proyección de la relación cotizante–empresa, con los nombres de clave que espera el cruce de pacientes. Se carga para poder usarla como fuente derecha sin una transformación implícita.

**Preguntas del taller:** P02D por la atribución de pagos a empresa; apoyo familiar para P02C/P02G y perfiles.

**Cómo participa en el modelo:** Se une por usuario_origen a cotizantes; empresa_id debe existir en web_dim_empresa.

**Qué evita o qué límite conserva:** La PK impone una empresa por cotizante en esta fotografía. Si el origen trae varias, se debe revisar la regla temporal. El left join conserva 175 cotizantes sin empresa.

### web_aux_familia

**Grano y clave:** Un titular asociado por beneficiario. PK `usuario_origen`. Referencia histórica: 3.316 filas. Se construye en el paso **4.7.B** de la guía ETL, a partir de origen: cotizante_beneficiario.

**Por qué se crea y para qué se utilizará:** Explicita qué titular corresponde a cada beneficiario, separando el identificador del beneficiario de la clave del titular.

**Preguntas del taller:** P02C/P02G, agrupación familiar; apoyo a P03/P05/P12/P13/P14 para no confundir atributos propios y familiares.

**Cómo participa en el modelo:** usuario_origen identifica al beneficiario; titular_origen permite un segundo cruce con web_aux_perfil_titular.

**Qué evita o qué límite conserva:** No representa otra población de pacientes. No deben sumarse sus filas a las de web_dim_paciente; no borres relaciones distintas para forzar unicidad.

### web_aux_cotizante

**Grano y clave:** Un cotizante. PK `paciente_id`; UNIQUE `usuario_origen`. Referencia histórica: 1.100 filas. Se construye en el paso **4.8** de la guía ETL, a partir de origen: cotizante.

**Por qué se crea y para qué se utilizará:** Prepara la rama de titulares: claves C:, familia F:, atributos propios, empresa e IPS, y procedencia propia de otra EPS.

**Preguntas del taller:** P02, P03, P05, P12, P13 y P14, a través de la dimensión definitiva.

**Cómo participa en el modelo:** Alimenta web_aux_perfil_titular y se apila con beneficiarios para crear web_dim_paciente.

**Qué evita o qué límite conserva:** Es una etapa de construcción, no una segunda población para agregar con la definitiva. La escolaridad desconocida y empresa ausente permanecen nulas.

### web_aux_perfil_titular

**Grano y clave:** Un perfil familiar por titular. PK `titular_origen`. Referencia histórica: 1.100 filas. Se construye en el paso **4.9** de la guía ETL, a partir de bodega: web_aux_cotizante.

**Por qué se crea y para qué se utilizará:** Selecciona únicamente los atributos familiares que se pueden transmitir a beneficiarios. Evita que sexo o fecha de nacimiento del titular sustituyan los del beneficiario.

**Preguntas del taller:** P02C/P02G y segmentos familiares de P03/P13; apoyo a P14 para duración desde afiliación del titular.

**Cómo participa en el modelo:** titular_origen se cruza con la relación familiar y aporta familia, empresa, IPS, estrato y tipo del titular.

**Qué evita o qué límite conserva:** Lo heredado debe seguir nombrándose familiar/titular. No acredita procedencia, escolaridad, ocupación o afiliación propia del beneficiario.

### web_aux_beneficiario

**Grano y clave:** Un beneficiario. PK `paciente_id`; UNIQUE `usuario_origen`. Referencia histórica: 3.316 filas. Se construye en el paso **4.10** de la guía ETL, a partir de origen: beneficiario.

**Por qué se crea y para qué se utilizará:** Prepara la rama B: con sexo y nacimiento propios, vínculo con titular y atributos familiares heredados de forma explícita.

**Preguntas del taller:** P02C/P02G, P03, P05, P13 y P14 a través de web_dim_paciente.

**Cómo participa en el modelo:** Se construye con web_aux_familia y web_aux_perfil_titular y se apila con la rama cotizante.

**Qué evita o qué límite conserva:** Los campos propios estrato, tipo de cotizante, escolaridad y procedencia que no existen se crean con None. En particular, procedencia nula no se reemplaza por False.

### web_dim_paciente

**Grano y clave:** Una persona distinguida por tipo de registro. PK `paciente_id`; UNIQUE `usuario_origen`. Referencia histórica: 4.416 filas. Se construye en el paso **4.11** de la guía ETL, a partir de bodega: web_aux_cotizante.

**Por qué se crea y para qué se utilizará:** Unifica cotizantes y beneficiarios en una población con identidad estable. Permite contar registrados, familias y perfiles sin depender de que tengan una atención.

**Preguntas del taller:** P02C/P02G, P03, P05, P09, P12, P13 y P14; en P09 identifica personas mediante paciente_id, sin necesitar siempre una relación adicional.

**Cómo participa en el modelo:** PK paciente_id con prefijo de tipo; UNIQUE usuario_origen, necesario porque los hechos originales solo traen id_usuario. El perfil para hechos se deriva de aquí.

**Qué evita o qué límite conserva:** La referencia es 4.416 registrados frente a 504 atendidos. No representa afiliación activa todo el período ni historia completa de atributos; distintos no se suman entre cortes.

### web_aux_paciente_hecho

**Grano y clave:** Un perfil de persona para enriquecer hechos. PK `usuario_origen`. Referencia histórica: 4.416 filas. Se construye en el paso **4.12** de la guía ETL, a partir de bodega: web_dim_paciente.

**Por qué se crea y para qué se utilizará:** Proyección de las columnas necesarias para enriquecer hechos mediante usuario_origen sin arrastrar todo el perfil ni nombres personales.

**Preguntas del taller:** P01–P14 que usan hechos, indirectamente; conecta atención, pagos, recetas y retiros con identidad y familia.

**Cómo participa en el modelo:** Se une por usuario_origen y aporta paciente_id, familia_id, empresa, IPS y fechas para edades. Las FK finales apuntan a la dimensión de pacientes.

**Qué evita o qué límite conserva:** Una clave derecha única evita multiplicar eventos o pagos. Es auxiliar técnica: sus filas no son nuevos pacientes ni hechos adicionales.

### web_aux_citas

**Grano y clave:** Un evento de citas_generales. PK `atencion_id`. Referencia histórica: 3.013 filas. Se construye en el paso **4.13.A** de la guía ETL, a partir de origen: citas_generales.

**Por qué se crea y para qué se utilizará:** Adapta las citas al contrato común de atención: nombres de claves, tipo de evento, fechas y timestamps comparables.

**Preguntas del taller:** P01 de citas; P02A, P05, P06, P07, P10 y P13 al unificar los eventos.

**Cómo participa en el modelo:** atencion_id usa prefijo citas_generales:. Se apila con las otras tres ramas en web_fact_atencion.

**Qué evita o qué límite conserva:** servicio_id permanece nulo porque no hay servicio POS enlazado en esta rama. No se imputa una tarifa para completar el costo.

### web_aux_urgencias

**Grano y clave:** Un evento de urgencias. PK `atencion_id`. Referencia histórica: 559 filas. Se construye en el paso **4.13.B** de la guía ETL, a partir de origen: urgencias.

**Por qué se crea y para qué se utilizará:** Adapta las urgencias al mismo conjunto y orden de columnas que las otras ramas, conservando el origen de cada evento.

**Preguntas del taller:** P02A, P05, P06, P07, P10 y P13 mediante atención.

**Cómo participa en el modelo:** atencion_id usa prefijo urgencias:. La unión vertical suma filas, no cruza urgencias con citas de una persona.

**Qué evita o qué límite conserva:** La urgencia puede estar relacionada clínicamente con otro registro, pero la fuente no permite deduplicar episodios de forma fiable. No hay tarifa POS enlazada.

### web_aux_hospitalizaciones

**Grano y clave:** Un evento de hospitalizaciones. PK `atencion_id`. Referencia histórica: 893 filas. Se construye en el paso **4.13.C** de la guía ETL, a partir de origen: hospitalizaciones.

**Por qué se crea y para qué se utilizará:** Adapta los registros de hospitalización para estudiar actividad, espera y perfiles con el mismo contrato de eventos.

**Preguntas del taller:** P02A, P05, P06, P07, P10 y P13.

**Cómo participa en el modelo:** atencion_id usa prefijo hospitalizaciones:. Las fechas se conservan y los timestamps se convierten antes de calcular duraciones.

**Qué evita o qué límite conserva:** Hospitalización no equivale a cirugía. La duración original sin unidad/capacidad confirmada no permite ocupación de camas; servicio/tarifa no se inventan.

### web_aux_remisiones

**Grano y clave:** Un evento de remisiones. PK `atencion_id`. Referencia histórica: 16.742 filas. Se construye en el paso **4.13.D** de la guía ETL, a partir de origen: remisiones.

**Por qué se crea y para qué se utilizará:** Adapta remisiones al contrato común, tratando fecha/hora de remisión como solicitud y conservando servicio_pos como servicio_id.

**Preguntas del taller:** P01 de cirugía; estimaciones tarifarias P02G, P03, P08 y P09; también actividad y perfiles.

**Cómo participa en el modelo:** atencion_id usa prefijo remisiones:. servicio_id permite añadir clasificación y tarifa en la unificación final.

**Qué evita o qué límite conserva:** Los eventos con espera negativa se conservan para auditar calidad y se excluyen solo de la duración válida. No se convierte una espera negativa a positiva.

### web_fact_atencion

**Grano y clave:** Un registro de atención de una tabla origen; no episodio único. PK `atencion_id`. Referencia histórica: 21.207 filas. Se construye en el paso **4.14** de la guía ETL, a partir de bodega: web_aux_citas.

**Por qué se crea y para qué se utilizará:** Tabla central de eventos asistenciales unificados y enriquecidos. Permite medir actividad y duraciones con grano consistente sin cruzar hechos entre sí.

**Preguntas del taller:** P01; P02A/P02G; P03A–C; P05–P10 en su parte asistencial; P13.

**Cómo participa en el modelo:** Conecta paciente, médico, IPS, servicio y dos roles de fecha. Tiene atributos diagnósticos materializados, edades históricas y tarifas de las remisiones.

**Qué evita o qué límite conserva:** Referencia 21.207 eventos. No son episodios únicos. COUNT_ROWS mide eventos; COUNT_DISTINCT paciente_id mide atendidos. Sus tarifas no cubren todas las modalidades.

### web_fact_pago

**Grano y clave:** Un pago del origen. PK `id_transaccion`. Referencia histórica: 22.938 filas. Se construye en el paso **4.15** de la guía ETL, a partir de origen: pagos.

**Por qué se crea y para qué se utilizará:** Conserva una fila por transacción para sumar aportes una vez y atribuirlos a cotizante, familia, empresa y geografía de afiliación.

**Preguntas del taller:** P02B–F. Para P10/P12 solo aporta el historial de pagos; no basta para resolver mora.

**Cómo participa en el modelo:** id_transaccion es PK; paciente/familia/empresa/IPS provienen del perfil, y fecha_pago_id enlaza calendario.

**Qué evita o qué límite conserva:** Los ingresos no son costos. Sin obligación, período adeudado y vencimiento no se sabe si se pagó tarde. No unir cada pago con todas las atenciones o beneficiarios.

### web_fact_formula

**Grano y clave:** Una fórmula médica. PK `codigo_formula`. Referencia histórica: 7.484 filas. Se construye en el paso **4.16** de la guía ETL, a partir de origen: formulas_medicas.

**Por qué se crea y para qué se utilizará:** Conserva cabeceras de recetas, fecha, paciente y médico. Mantiene la identidad de cada canasta y permite filtrar el puente por el período de la receta.

**Preguntas del taller:** P03D, P04 y cobertura P11.

**Cómo participa en el modelo:** codigo_formula es PK y destino de relación desde el puente; fecha_formula aporta el período que el detalle no tiene.

**Qué evita o qué límite conserva:** Se conservan cabeceras con un solo medicamento. No hay total facturado, por lo que contar recetas no produce costo promedio.

### web_puente_formula_medicamento

**Grano y clave:** Una presencia de un medicamento en una fórmula. PK `codigo_formula` + `medicamento_id`. Referencia histórica: 15.770 filas. Se construye en el paso **4.17** de la guía ETL, a partir de bodega: web_fact_formula.

**Por qué se crea y para qué se utilizará:** Convierte la lista separada por punto y coma en una relación muchos a muchos entre fórmula y código observado. Deduplica presencia por pareja.

**Preguntas del taller:** P03D, P04A/P04B y cobertura P11.

**Cómo participa en el modelo:** PK compuesta codigo_formula + medicamento_id; FK a cabecera y, después de crearla, a dimensión de medicamentos. Los pares se generan al consultar, no son filas de esta tabla.

**Qué evita o qué límite conserva:** Una fila es presencia, no cantidad prescrita ni dispensada. Deduplicar solo por medicamento borraría su presencia en otras recetas. El puente no es un catálogo de precios.

### web_dim_medicamento

**Grano y clave:** Un código de medicamento observado. PK `medicamento_id`. Referencia histórica: 166 filas. Se construye en el paso **4.18** de la guía ETL, a partir de bodega: web_puente_formula_medicamento.

**Por qué se crea y para qué se utilizará:** Catálogo de los códigos distintos observados, para asegurar una referencia consistente y habilitar su FK en el puente.

**Preguntas del taller:** P03D/P04 y cobertura P11 como integridad del modelo; contar frecuencias/pares puede hacerse directamente sobre el puente.

**Cómo participa en el modelo:** Se obtiene conservando medicamento_id y deduplicándolo. Se carga después del puente y entonces se añade su FK con schema_only.

**Qué evita o qué límite conserva:** Referencia 166 códigos. No contiene nombres, precios, dosis ni cantidades; no se rellenan artificialmente. Su existencia no vuelve calculable el costo de recetas.

### web_fact_retiro

**Grano y clave:** Un evento de retiro. PK `id_retiro`. Referencia histórica: 89 filas. Se construye en el paso **4.19** de la guía ETL, a partir de origen: retiros.

**Por qué se crea y para qué se utilizará:** Conserva cada retiro y diferencia EPS destino conocida/desconocida. Incluye edad al retiro y días desde afiliación del titular para describir el perfil disponible.

**Preguntas del taller:** P14 y parte descriptiva de P10.

**Cómo participa en el modelo:** id_retiro es PK; paciente_id enlaza perfil y fecha_retiro_id calendario. destino_informado clasifica si hay nombre de EPS destino.

**Qué evita o qué límite conserva:** Referencia 89 retiros: 48 informados y 41 desconocidos. No contiene causa certificada de retiro ni demuestra mora; edad y duración son históricas, no actuales.

## 3. Tablas de la bodega del cuaderno

Estas son las 17 tablas registradas en [la implementación del ETL Core](planes_y_evidencia/implementacion_etl_core.md) y [su modelo](planes_y_evidencia/carga_core/modelo_bodega.json). No se crean de nuevo por seguir la guía de respuestas. Las claves siguientes describen el contrato lógico; el catálogo vigente determina cuáles tienen una PK física.

### dim_fecha

**Grano y clave:** Un día; clave lógica `fecha_id`; 1.096 filas históricas.

**Por qué existe y cómo se usa:** Es el calendario del modelo del cuaderno. Cumple el propósito de web_dim_fecha, con más atributos como día, nombres de día/mes, trimestre y festivo. La temporada se llama temporada_convencional y fecha se almacenó como timestamp sin zona. Permite contar días calendario y distinguir los roles de solicitud y atención. No acredita cobertura de actividad.

**Preguntas del taller:** P06 y P07; fechas de los hechos.

### dim_empresa

**Grano y clave:** Una empresa; clave lógica `empresa_id`; 21 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_dim_empresa. El nombre se llama nombre y conserva ciudad/actividad originales y normalizadas. Da identidad al empleador y permite sumar pagos sin duplicarlos. total_empleados no se usa automáticamente como población afiliada.

**Preguntas del taller:** P02D.

### dim_ips

**Grano y clave:** Una IPS; clave lógica `ips_id`; 86 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_dim_ips, pero el nombre es nombre. Conserva atributos originales y normalizados para auditar limpieza. ips_id recibe los roles ips_medico_asociado_id e ips_afiliacion_id de los hechos; no hay que confundir sus geografías.

**Preguntas del taller:** P02A, P02E–F, P06C y P10A.

### dim_medico

**Grano y clave:** Un médico; clave lógica `medico_id`; 720 filas históricas.

**Por qué existe y cómo se usa:** Conserva perfil del profesional y su asociación a IPS mediante ips_id en esta dimensión. El ETL ya dejó ips_medico_asociado_id en los hechos; los paneles por código médico pueden usar directamente medico_id de atención. No contiene agendas para medir ocupación.

**Preguntas del taller:** P06D y atribución de IPS para P02/P06/P10.

### dim_familia

**Grano y clave:** Una familia identificada por su titular; clave lógica `familia_id`; 1.100 filas históricas.

**Por qué existe y cómo se usa:** Agrupa titular y beneficiarios y conserva número de miembros y beneficiarios. Sirve para describir composición y validar familias. Sumar aportes/tarifas por familia_id de los hechos no requiere unir todos los miembros. La variante web representa familia mediante familia_id y auxiliares, sin una web_dim_familia adicional.

**Preguntas del taller:** P02C/P02G; apoyo a P05 y segmentos familiares.

### dim_paciente

**Grano y clave:** Una persona distinguida por tipo de registro; clave lógica `paciente_id`; 4.416 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_dim_paciente y conserva más datos originales y marcas de herencia familiar/sin historia. Tiene fecha_afiliacion_propia separada de fecha_afiliacion_titular; la primera se utiliza para el corte de P12 de cotizantes. Las fechas de dimensión son timestamp. Beneficiarios mantienen procedencia/escolaridad/salario propios desconocidos, sin rellenarlos a partir del titular.

**Preguntas del taller:** P02, P03, P05, P09, P12, P13 y P14.

### dim_servicio

**Grano y clave:** Un servicio POS; clave lógica `servicio_id`; 67 filas históricas.

**Por qué existe y cómo se usa:** Reúne catálogo, clasificación y tarifa. En el cuaderno la clasificación no requiere una tabla web_mapa_servicio materializada: se usa el mapeo durante el ETL. El hecho ya incorpora tipo_servicio y tarifa_servicio_catalogo para filtrar cirugía y calcular estimaciones parciales.

**Preguntas del taller:** P01 de cirugía; P02G, P03, P08 y P09.

### dim_medicamento

**Grano y clave:** Un código observado; clave lógica `medicamento_id`; 166 filas históricas.

**Por qué existe y cómo se usa:** Identifica códigos observados para el puente. El cuaderno conserva campos de catálogo o precio no disponibles como desconocidos según el diccionario. No suministra precios o cantidades reales. Las frecuencias pueden calcularse sin relacionar esta dimensión y la presencia de una columna precio no acredita valores utilizables.

**Preguntas del taller:** P03D/P04 y cobertura P11.

### dim_diagnostico

**Grano y clave:** Un texto diagnóstico normalizado; clave lógica `diagnostico_id`; 87 filas históricas.

**Por qué existe y cómo se usa:** Separa los textos y su clasificación de atención usando una clave determinista de texto normalizado. Aporta grupo_textual, clase_texto y validado_clinicamente mediante una relación de fact_atencion.diagnostico_id a dim_diagnostico.diagnostico_id. A diferencia de web_fact_atencion, no se deben buscar grupo/clase directamente en fact_atencion. No convierte el mapeo textual en diagnóstico certificado.

**Preguntas del taller:** P07E, P09 y P13.

### dim_drogueria

**Grano y clave:** Una droguería; clave lógica `drogueria_id`; 35 filas históricas.

**Por qué existe y cómo se usa:** Conserva el catálogo de droguerías para describir la red vinculada a IPS. No hay dispensaciones con fecha, paciente, medicamento, cantidad y valor. Por tanto, no permite calcular frecuencia de entregas ni costo promedio de recetas. La ruta web omite esta tabla porque no resuelve una medida adicional del taller con los datos existentes.

**Preguntas del taller:** No es necesaria para calcular las respuestas P01–P14 disponibles; amplía el contexto de P04/P11.

### puente_ips_drogueria

**Grano y clave:** Una asociación distinta IPS–droguería; clave lógica `ips_id + drogueria_id`; 69 filas históricas.

**Por qué existe y cómo se usa:** Representa la red de asociaciones muchos a muchos entre IPS y droguerías sin suponer exclusividad. El cuaderno retiró cuatro copias exactas y conservó 69 asociaciones. No representa una entrega ni una receta y no se debe cruzar con atención para sumar eventos sin controlar multiplicaciones.

**Preguntas del taller:** No es necesaria en los paneles disponibles; contexto potencial de P02/P04/P11.

### fact_atencion

**Grano y clave:** Un registro asistencial de una tabla origen; clave lógica `atencion_id`; 21.207 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito del hecho web y conserva, además, horas SQL TIME, espera_minutos_cruda, espera_valida_min y grupos etarios a solicitud/atención. Las 497 esperas negativas permanecen en hechos y su espera válida es nula. Se relaciona con dim_diagnostico para clasificar textos. La guía usa duración entre timestamps para que el procedimiento sea comparable en ambas rutas.

**Preguntas del taller:** P01; P02A/P02G; P03A–C; P05–P10 asistencial y P13.

### fact_pago

**Grano y clave:** Una transacción de aporte; clave lógica `id_transaccion`; 22.938 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_fact_pago. Sus 8.548.421.149,00 unidades del origen se conciliaron con pagos en la fotografía histórica. No equivale a costo de atención ni demuestra puntualidad sin obligaciones y vencimientos. familia_id permite sumar sin expandir miembros.

**Preguntas del taller:** P02B–F; insuficiente para mora en P10/P12.

### fact_formula

**Grano y clave:** Una cabecera de receta; clave lógica `codigo_formula`; 7.484 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_fact_formula. La lista original se llama medicamentos_recetados_original, y contiene además perfil/geografía/edad del evento. El puente usa su clave para obtener fecha_formula, de tipo date. Debe conservar recetas con un solo elemento para el denominador de pares.

**Preguntas del taller:** P03D/P04 y cobertura P11.

### puente_formula_medicamento

**Grano y clave:** Una presencia fórmula–código; clave lógica `codigo_formula + medicamento_id`; 15.770 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito del puente web. En el patrón Pares se genera una fila de resultado por pareja de códigos: frequency es número de canastas con la pareja, no una columna almacenada del puente. Contar presencias no produce cantidades ni costos.

**Preguntas del taller:** P03D, P04A/P04B y cobertura P11.

### fact_retiro

**Grano y clave:** Un evento de retiro; clave lógica `id_retiro`; 89 filas históricas.

**Por qué existe y cómo se usa:** Cumple el propósito de web_fact_retiro. La fotografía contiene 48 destinos informados y 41 desconocidos. Conserva edad al retiro y días desde la afiliación disponible para describir el perfil; carece de causa de retiro y no permite atribuirlo a mora.

**Preguntas del taller:** P14 y descripción de retiros en P10.

### fact_antecedente_familiar

**Grano y clave:** Un registro de antecedente familiar asociado a una persona; clave lógica `antecedente_id`; 4.416 filas históricas.

**Por qué existe y cómo se usa:** Conserva información declarada sobre familiares y preexistencias como contexto de riesgo. Un antecedente familiar de una persona no demuestra que esa persona padezca la enfermedad. No se usa para construir cohortes de VIH/renal ni para prevalencia de enfermedades propias. La ruta web omite esta tabla para no atribuir diagnósticos incorrectos.

**Preguntas del taller:** No necesaria para las respuestas actuales; no sustituye los diagnósticos de P09/P13.

## 4. Recorrido de dependencias que justifica las auxiliares web

1. **Empresa e IPS** dan las claves descriptivas; **médico** permite obtener la IPS de atención.
2. **Mapa de servicio → dimensión de servicio** añade clasificación a las tarifas del origen. **Mapa de diagnóstico** distingue las clases de texto que se podrán analizar.
3. **Auxiliar laboral → cotizante → perfil del titular** prepara la información transmisible. **Auxiliar familiar + perfil del titular → beneficiario** conserva sus datos propios. **Cotizante + beneficiario → paciente** construye la población final.
4. **Paciente → perfil para hechos** proyecta solo las columnas necesarias. Una fuente derecha de la web no hereda otra receta abierta: materializar esta proyección evita columnas ambiguas o cruces distintos de lo previsto.
5. **Cuatro auxiliares asistenciales → atención** homogeneizan columnas antes de apilar. Los cruces con perfiles/catálogos enriquecen sin cambiar la cantidad de eventos.
6. **Fórmula → puente → medicamento** separa cabecera y presencias. La FK de medicamento se añade al puente después de crear la dimensión, en schema_only, sin reinsertar filas.
7. **Pagos y retiros** conservan sus propios granos: no se mezclan con atención para sumar importes ni para inferir mora.

Las auxiliares hacen reproducible la operación de la interfaz; no son medidas adicionales del negocio. Por ejemplo, sumar las filas de web_aux_cotizante, web_aux_beneficiario y web_dim_paciente contaría dos veces a la misma población final.

## 5. Qué tabla responde cada pregunta y qué sigue faltando

| Pregunta | Tablas principales de la ruta web | Uso | Límite / dato faltante |
| --- | --- | --- | --- |
| P01 | web_fact_atencion; web_dim_servicio al construirla | Duración válida, cirugía y distribución | Fecha certificada de asignación |
| P02 | web_fact_atencion, web_dim_ips, web_fact_pago, web_dim_empresa, web_dim_paciente | Prestadores, aportes, familia y tarifas parciales | Costo familiar real y regional administrativa |
| P03 | web_fact_atencion, web_dim_paciente, web_puente_formula_medicamento, web_fact_formula | Segmentos y recetas por código | Ocupación específica y costo completo |
| P04 | web_puente_formula_medicamento, web_fact_formula; web_dim_medicamento para integridad | Frecuencia individual y pares | Dosis, cantidades y dispensaciones |
| P05 | web_fact_atencion, web_dim_paciente | Eventos/atendido y eventos/registrado | Exposición y afiliación activa histórica |
| P06 | web_fact_atencion, web_dim_fecha, web_dim_ips; médico atribuido en ETL | Actividad por temporada y días calendario | Capacidad, agendas y definición de vacaciones |
| P07 | web_fact_atencion, web_dim_fecha, web_mapa_diagnostico incorporado al hecho | Solicitud, atención, espera y clasificación por período | Cobertura completa y diagnóstico clínico certificado |
| P08 | web_fact_atencion; web_dim_servicio al construirla | Tarifa/remisión, tarifa/persona y cobertura | Costos de todas las modalidades |
| P09 | web_fact_atencion; clasificación del mapa incorporada | Seleccionar personas y medir su atención tarifada | Diagnóstico clínico/costos completos |
| P10 | web_fact_atencion, web_dim_ips, web_fact_retiro | Demanda de IPS y descripción de retiros | Causa de retiro, obligación y vencimiento para mora |
| P11 | web_fact_formula, web_puente_formula_medicamento, web_dim_medicamento | Acreditar cobertura de recetas/códigos | Cantidades, precios vigentes o valor facturado por receta |
| P12 | web_dim_paciente; web_fact_pago insuficiente para puntualidad | Procedencia y perfil de cotizantes | Obligaciones, períodos y vencimientos |
| P13 | web_fact_atencion, web_dim_paciente; mapa incorporado | Eventos/personas por grupo textual y perfil | Catálogo clínico validado e historia del perfil |
| P14 | web_fact_retiro, web_dim_paciente | Destino y perfil al retiro | Destino de 41 retiros y causa certificada |

En la bodega del cuaderno se usan los equivalentes sin prefijo, con la relación adicional a **dim_diagnostico** para P07/P09/P13 y los nombres de columna indicados en su ruta. Las tablas dim_drogueria, puente_ips_drogueria y fact_antecedente_familiar conservan información adicional, pero no resuelven por sí solas las ausencias listadas.

## 6. Referencias

- [Enunciado del taller](Taller_Colombia_Saludable.pdf) y [matriz de preguntas y métricas](planes_y_evidencia/plan_answers.md).
- [Modelo del cuaderno](planes_y_evidencia/carga_core/modelo_bodega.json), [diccionario por columna](planes_y_evidencia/carga_core/diccionario_bodega.csv) y [conteos de carga](planes_y_evidencia/carga_core/conteos_carga.csv).
- [Implementación ETL y sus límites](planes_y_evidencia/implementacion_etl_core.md) e [implementación de respuestas](planes_y_evidencia/implementacion_answers.md).

Los conteos son históricos; no equivalen a una inspección actual de tu base. Este documento describe 24 salidas web y las 17 tablas del cuaderno, sin indicar que ambas rutas deban cargarse juntas.
