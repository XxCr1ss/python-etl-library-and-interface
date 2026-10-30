# Guía ETL de Colombia Saludable desde la aplicación web desplegada

Actualizada el 30 de octubre de 2026.

Esta guía transforma el origen `colombia_saludable.public` en tablas `web_*` de `colombia_saludable_dw_core.public` mediante **Extracción → Transformación → Carga**. Cada tabla incluye su recorrido completo. Las respuestas P01–P14 se configuran en [GUIA_RESPUESTAS_TALLER_WEB.md](GUIA_RESPUESTAS_TALLER_WEB.md); la finalidad de las tablas se explica en [DICCIONARIO_Y_PROPOSITO_TABLAS.md](DICCIONARIO_Y_PROPOSITO_TABLAS.md).

Los conteos son referencias de la fotografía del 22 de octubre de 2026. Se deben comprobar con el origen vigente; esta edición de la documentación no ejecuta cargas ni certifica el estado actual de la bodega.

## 1. Acceso y conexiones

Abre la URL de la aplicación **ya desplegada** que utilizas habitualmente e inicia sesión. No necesitas arrancar frontend o backend en tu equipo.

La base de destino debe existir: **Carga crea tablas, no bases de datos**. Las tablas `web_*` permiten conservar las tablas `dim_*`/`fact_*` del cuaderno. La conexión de Extracción, la de cada fuente secundaria, la de Carga y la de Bodega de datos se configuran por separado.

| Dato | Origen | Bodega |
| --- | --- | --- |
| Motor | PostgreSQL | PostgreSQL |
| Base | `colombia_saludable` | `colombia_saludable_dw_core` |
| Esquema | `public` | `public` |
| Host/puerto | Los del servidor PostgreSQL accesible | Los del servidor destino accesible |
| Usuario/contraseña | Credenciales del origen | Credenciales autorizadas de la bodega |

Si las bases están en tu PC, mantén conectado el **agente local híbrido** y autoriza la carga en el agente. Marca su uso en cada formulario que lo necesite. En ese caso `localhost` identifica el equipo del agente; en conexión directa identifica el equipo del backend desplegado. El puerto habitual PostgreSQL es `5432`, pero usa el de tu configuración. La web no importa automáticamente el archivo `.env`; las contraseñas se introducen únicamente en los formularios de conexión.

## 2. Convenciones del recorrido

- Calendario y eventos de referencia: 2006–2008; zona `America/Bogota`.
- Un evento es un registro de cita, urgencia, hospitalización o remisión. No se deduplican episodios clínicos entre fuentes.
- Los identificadores son texto. Los atributos familiares heredados no se convierten en datos propios del beneficiario.
- La espera se mide desde solicitud/remisión, porque no existe fecha certificada de asignación.
- Solo las remisiones tienen tarifa de catálogo enlazada; no representa costo real completo. La moneda del origen no está certificada.
- La clasificación diagnóstica es textual y parcial. Los nulos siguen siendo desconocidos.

Las expresiones son de **Transformación**, no SQL ni fórmulas de análisis. En **Columna Calculada** utiliza directamente los nombres de columnas; en **Transformar Col**, `x` representa la celda. Copia la expresión sin `lambda`, `row`, `pd` ni importaciones. Las conversiones se explicitan en cada tabla para que también funcionen cuando el agente entregue fechas como texto o los cruces produzcan nulos internos.

## 3. Orden de construcción

Sigue 4.1–4.19 en orden. En 4.5 y 4.7 crea primero A y después B; en 4.13 crea A, B, C y D. La sección 4.18 incluye una segunda operación sobre el puente para añadir su FK de medicamento, una vez exista la dimensión.

| Paso | Tabla | Grano | Filas históricas |
| --- | --- | --- | --- |
| [4.1](#etl-4-1) | `web_dim_fecha` | Un día del calendario de observación | 1.096 |
| [4.2](#etl-4-2) | `web_dim_empresa` | Una empresa | 21 |
| [4.3](#etl-4-3) | `web_dim_ips` | Una IPS | 86 |
| [4.4](#etl-4-4) | `web_dim_medico` | Un médico | 720 |
| [4.5.A](#etl-4-5-a) | `web_mapa_servicio` | Una clasificación por código de servicio | 67 |
| [4.5.B](#etl-4-5-b) | `web_dim_servicio` | Un servicio POS | 67 |
| [4.6](#etl-4-6) | `web_mapa_diagnostico` | Una clasificación por texto diagnóstico normalizado | consulta el CSV vigente; el catálogo histórico tiene 87 textos diagnósticos |
| [4.7.A](#etl-4-7-a) | `web_aux_laboral` | Una relación laboral por cotizante | 925 |
| [4.7.B](#etl-4-7-b) | `web_aux_familia` | Un titular asociado por beneficiario | 3.316 |
| [4.8](#etl-4-8) | `web_aux_cotizante` | Un cotizante | 1.100 |
| [4.9](#etl-4-9) | `web_aux_perfil_titular` | Un perfil familiar por titular | 1.100 |
| [4.10](#etl-4-10) | `web_aux_beneficiario` | Un beneficiario | 3.316 |
| [4.11](#etl-4-11) | `web_dim_paciente` | Una persona distinguida por tipo de registro | 4.416 |
| [4.12](#etl-4-12) | `web_aux_paciente_hecho` | Un perfil de persona para enriquecer hechos | 4.416 |
| [4.13.A](#etl-4-13-a) | `web_aux_citas` | Un evento de citas_generales | 3.013 |
| [4.13.B](#etl-4-13-b) | `web_aux_urgencias` | Un evento de urgencias | 559 |
| [4.13.C](#etl-4-13-c) | `web_aux_hospitalizaciones` | Un evento de hospitalizaciones | 893 |
| [4.13.D](#etl-4-13-d) | `web_aux_remisiones` | Un evento de remisiones | 16.742 |
| [4.14](#etl-4-14) | `web_fact_atencion` | Un registro de atención de una tabla origen; no episodio único | 21.207 |
| [4.15](#etl-4-15) | `web_fact_pago` | Un pago del origen | 22.938 |
| [4.16](#etl-4-16) | `web_fact_formula` | Una fórmula médica | 7.484 |
| [4.17](#etl-4-17) | `web_puente_formula_medicamento` | Una presencia de un medicamento en una fórmula | 15.770 |
| [4.18](#etl-4-18) | `web_dim_medicamento` | Un código de medicamento observado | 166 |
| [4.19](#etl-4-19) | `web_fact_retiro` | Un evento de retiro | 89 |

## 4. Extracción, transformación y carga por tabla

<a id="etl-4-1"></a>

### 4.1. `web_dim_fecha`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Dimensión Fecha**. Configura año inicial `2006` y final `2008`, procesa la fuente y continúa a **Transformación**.

**B. Transformar, en este orden**

En **Mantener Cols**, selecciona `fecha`, `es_fin_de_semana`, `es_festivo`. Retira las demás columnas de la fuente, incluido el índice secuencial.

Agrega **Cambiar Tipo**, selecciona `fecha`, elige **Tipo de Tipo de datos = Texto**, escribe **Tipo de datos = `datetime`** sin comillas y pulsa **Aplicar Operación**. “Texto” indica cómo introduces el parámetro; el tipo convertido es `datetime`. Actualiza la vista previa antes de utilizar `.year` o `.month`.

Agrega una **Columna Calculada** por fila y pulsa **Aplicar Operación** después de cada una:

| Nueva columna | Expresión |
| --- | --- |
| `fecha_id` | `str(fecha)[:10].replace('-', '')` |
| `anio` | `fecha.year` |
| `mes` | `fecha.month` |
| `dia_semana` | `fecha.weekday() + 1` |
| `temporada` | Expresión siguiente |

```python
'semana_santa' if ('2006-04-10' <= str(fecha)[:10] <= '2006-04-16' or '2007-04-02' <= str(fecha)[:10] <= '2007-04-08' or '2008-03-17' <= str(fecha)[:10] <= '2008-03-23') else ('navidad' if str(fecha)[5:7] == '12' and int(str(fecha)[8:10]) >= 24 else 'ordinario')
```

El día 1 es lunes y el 7 domingo. Semana Santa representa lunes a domingo de la semana del jueves santo; Navidad, 24–31 de diciembre. Estas reglas cubren únicamente 2006–2008. No se asignan vacaciones porque no hay una definición disponible.

Agrega **Mantener Cols** al final y conserva exactamente estas 8 columnas, en este orden:

```text
fecha
es_fin_de_semana
es_festivo
fecha_id
anio
mes
dia_semana
temporada
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `fecha` | `datetime` |
| `es_fin_de_semana`, `es_festivo` | `boolean` |
| `fecha_id`, `temporada` | `string` |
| `anio`, `mes`, `dia_semana` | `integer` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **1.096 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_fecha`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un día del calendario de observación`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `fecha` | date | No | Sí |
| `es_fin_de_semana` | boolean | No | Sí |
| `es_festivo` | boolean | No | Sí |
| `fecha_id` | string | Sí | No |
| `anio` | integer | No | Sí |
| `mes` | integer | No | Sí |
| `dia_semana` | integer | No | Sí |
| `temporada` | string | No | Sí |

5. En **Claves UNIQUE**, añade una entrada con `fecha`. Escribe nombres sin comillas ni corchetes. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_fecha`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-2"></a>

### 4.2. `web_dim_empresa`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.empresa`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `nit`, `nombre`, `actividad_economica`, `ciudad`, `total_empleados`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `nit` | `empresa_id` |
| `nombre` | `empresa_nombre` |

Agrega **Transformar Col** → **Columna = `actividad_economica`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `ciudad`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Mantener Cols** al final y conserva exactamente estas 5 columnas, en este orden:

```text
empresa_id
empresa_nombre
actividad_economica
ciudad
total_empleados
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `empresa_id`, `empresa_nombre`, `actividad_economica`, `ciudad` | `string` |
| `total_empleados` | `integer` |

Pulsa **Actualizar vista previa**. Referencia histórica: **21 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_empresa`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una empresa`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `empresa_id` | string | Sí | No |
| `empresa_nombre` | string | No | Sí |
| `actividad_economica` | string | No | Sí |
| `ciudad` | string | No | Sí |
| `total_empleados` | integer | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_empresa`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-3"></a>

### 4.3. `web_dim_ips`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.ips`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `id_ips`, `nombre`, `tipo_ips`, `nivel`, `municipio`, `departamento`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `id_ips` | `ips_id` |
| `nombre` | `ips_nombre` |

Agrega **Transformar Col** → **Columna = `tipo_ips`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `nivel`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `municipio`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `departamento`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

La expresión convierte vacíos y N/A en nulos, elimina espacios sobrantes y pasa a minúsculas. Por ejemplo, `  HOSPITAL  ` pasa a `hospital`. Un nivel desconocido permanece nulo.

Agrega **Mantener Cols** al final y conserva exactamente estas 6 columnas, en este orden:

```text
ips_id
ips_nombre
tipo_ips
nivel
municipio
departamento
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `ips_id`, `ips_nombre`, `tipo_ips`, `nivel`, `municipio`, `departamento` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **86 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_ips`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una IPS`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `ips_id` | string | Sí | No |
| `ips_nombre` | string | No | Sí |
| `tipo_ips` | string | No | Sí |
| `nivel` | string | No | Sí |
| `municipio` | string | No | Sí |
| `departamento` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_ips`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-4"></a>

### 4.4. `web_dim_medico`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.medico`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `cedula`, `id_ips`, `especialidad`, `subespecialidad`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `cedula` | `medico_id` |
| `id_ips` | `ips_medico_asociado_id` |

Agrega **Transformar Col** → **Columna = `especialidad`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `subespecialidad`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

La relación con IPS es la asociación disponible del médico y carece de vigencia histórica. La subespecialidad puede ser nula.

Agrega **Mantener Cols** al final y conserva exactamente estas 4 columnas, en este orden:

```text
medico_id
ips_medico_asociado_id
especialidad
subespecialidad
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `medico_id`, `ips_medico_asociado_id`, `especialidad`, `subespecialidad` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **720 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_medico`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un médico`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `medico_id` | string | Sí | No |
| `ips_medico_asociado_id` | string | No | Sí |
| `especialidad` | string | No | Sí |
| `subespecialidad` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `ips_medico_asociado_id` | `web_dim_ips` | `ips_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_medico`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-5-a"></a>

### 4.5.A. `web_mapa_servicio`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Archivo Local**. Descarga o localiza  [mapeo_servicios.csv](planes_y_evidencia/carga_core/mapeo_servicios.csv) y selecciónalo. Procesa el archivo y continúa a **Transformación**. Comprueba que la cabecera se interpretó correctamente y no se usó una fila de datos como nombres de columna.

**B. Transformar, en este orden**

- En **Mantener Cols**, selecciona `servicio_id` y `tipo_servicio`. El CSV aporta únicamente la clasificación; la tarifa se leerá del origen en 4.5.B.

Agrega **Mantener Cols** al final y conserva exactamente estas 2 columnas, en este orden:

```text
servicio_id
tipo_servicio
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `servicio_id`, `tipo_servicio` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **67 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_mapa_servicio`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una clasificación por código de servicio`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `servicio_id` | string | Sí | No |
| `tipo_servicio` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_mapa_servicio`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-5-b"></a>

### 4.5.B. `web_dim_servicio`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.servicios_pos`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Debes haber completado 4.5.A: las partes A y B son dos tablas necesarias, en ese orden.

Agrega **Mantener Cols**: `id_servicio_pos`, `descripcion`, `costo`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `id_servicio_pos` | `servicio_id` |
| `costo` | `tarifa_catalogo` |

Agrega **Transformar Col** → **Columna = `descripcion`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_mapa_servicio`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"servicio_id"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

La clasificación viene del CSV; la tarifa se conserva del catálogo consultado en el origen. No sumes tarifas del CSV histórico.

Agrega **Mantener Cols** al final y conserva exactamente estas 4 columnas, en este orden:

```text
servicio_id
descripcion
tarifa_catalogo
tipo_servicio
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `servicio_id`, `descripcion`, `tipo_servicio` | `string` |
| `tarifa_catalogo` | `decimal` |

Pulsa **Actualizar vista previa**. Referencia histórica: **67 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_servicio`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un servicio POS`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `servicio_id` | string | Sí | No |
| `descripcion` | string | No | Sí |
| `tarifa_catalogo` | decimal; precisión `30`, escala `2` | No | Sí |
| `tipo_servicio` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, pulsa **Agregar comprobación** y configura:

| Columna | Regla | Severidad | minimum | maximum |
| --- | --- | --- | --- | --- |
| `tipo_servicio` | `not_null` | Bloquear | Vacío | Vacío |

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_servicio`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-6"></a>

### 4.6. `web_mapa_diagnostico`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Archivo Local**. Descarga o localiza  [clasificacion_diagnosticos.csv](planes_y_evidencia/carga_core/clasificacion_diagnosticos.csv) y selecciónalo. Procesa el archivo y continúa a **Transformación**. Comprueba que la cabecera se interpretó correctamente y no se usó una fila de datos como nombres de columna.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `diagnostico_normalizado`, `grupo_textual`, `clase_texto`, `validado_clinicamente`. Retira `diagnostico_id` del CSV: esta variante cruza por el texto normalizado.

Agrega **Transformar Col** → **Columna = `diagnostico_normalizado`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

La clasificación es textual, parcial y no validada clínicamente. Mantén los grupos desconocidos como nulos. `control_o_evolucion`, `seguimiento` y `no_clasificado` no representan enfermedades confirmadas. No clasifiques automáticamente con una búsqueda de la palabra “renal”.

Agrega **Mantener Cols** al final y conserva exactamente estas 4 columnas, en este orden:

```text
diagnostico_normalizado
grupo_textual
clase_texto
validado_clinicamente
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `diagnostico_normalizado`, `grupo_textual`, `clase_texto` | `string` |
| `validado_clinicamente` | `boolean` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **consulta el CSV vigente; el catálogo histórico tiene 87 textos diagnósticos filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_mapa_diagnostico`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una clasificación por texto diagnóstico normalizado`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `diagnostico_normalizado` | string | Sí | No |
| `grupo_textual` | string | No | Sí |
| `clase_texto` | string | No | Sí |
| `validado_clinicamente` | boolean | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_mapa_diagnostico`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-7-a"></a>

### 4.7.A. `web_aux_laboral`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.empresa_cotizante`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols** y selecciona `cotizante`, `empresa`.
- En **Renombrar**, añade `cotizante → usuario_origen` y `empresa → empresa_id`.

No elimines duplicados para ocultar relaciones múltiples. Si la PK no es válida, revisa si el origen permite varias empresas por cotizante antes de continuar.

Agrega **Mantener Cols** al final y conserva exactamente estas 2 columnas, en este orden:

```text
usuario_origen
empresa_id
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `usuario_origen`, `empresa_id` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **925 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_laboral`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una relación laboral por cotizante`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `usuario_origen` | string | Sí | No |
| `empresa_id` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_laboral`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-7-b"></a>

### 4.7.B. `web_aux_familia`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.cotizante_beneficiario`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols** y selecciona `beneficiario`, `cotizante`.
- En **Renombrar**, añade `beneficiario → usuario_origen` y `cotizante → titular_origen`.

La PK requiere un titular por beneficiario en esta fotografía. No elimines relaciones diferentes para forzar esa condición.

Agrega **Mantener Cols** al final y conserva exactamente estas 2 columnas, en este orden:

```text
usuario_origen
titular_origen
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `usuario_origen`, `titular_origen` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **3.316 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_familia`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un titular asociado por beneficiario`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `usuario_origen` | string | Sí | No |
| `titular_origen` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_familia`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-8"></a>

### 4.8. `web_aux_cotizante`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.cotizante`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `cedula`, `sexo`, `fecha_nacimiento`, `estracto`, `tipo_cotizante`, `nivel_escolaridad`, `proviene_otra_eps`, `fecha_afiliacion`, `id_ips`.
- Renombra:

En **Renombrar**, añade cada pareja mediante **Columna Original → Nuevo Nombre → Añadir renombre**; pulsa **Aplicar Operación** al terminar.

| Original | Nuevo nombre |
| --- | --- |
| `cedula` | `usuario_origen` |
| `estracto` | `estrato_propio` |
| `tipo_cotizante` | `tipo_cotizante_propio` |
| `nivel_escolaridad` | `escolaridad_propia` |
| `proviene_otra_eps` | `procedencia_original` |
| `fecha_afiliacion` | `fecha_afiliacion_titular` |
| `id_ips` | `ips_afiliacion_id` |

Agrega **Transformar Col** → **Columna = `sexo`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `tipo_cotizante_propio`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Transformar Col** → **Columna = `escolaridad_propia`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Conserva `estrato_propio` como texto; no lo normalices ni conviertas a entero. N/A de escolaridad permanece nulo.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_laboral`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Conserva los 1.100 cotizantes, incluidos 175 sin empresa.

- Crea:

| Campo nuevo | Expresión |
| --- | --- |
| `paciente_id` | `'C:' + str(usuario_origen).strip()` |
| `tipo_registro` | `'cotizante'` |
| `titular_origen` | `usuario_origen` |
| `familia_id` | `'F:' + str(usuario_origen).strip()` |
| `estrato_familiar` | `estrato_propio` |
| `tipo_cotizante_titular` | `tipo_cotizante_propio` |
| `proviene_otra_eps_propio` | `True if str(procedencia_original).strip() == '1' else (False if str(procedencia_original).strip() == '0' else None)` |

Agrega **Mantener Cols** al final y conserva exactamente estas 16 columnas, en este orden:

```text
paciente_id
usuario_origen
tipo_registro
titular_origen
sexo
fecha_nacimiento
familia_id
empresa_id
ips_afiliacion_id
estrato_propio
estrato_familiar
tipo_cotizante_propio
tipo_cotizante_titular
escolaridad_propia
proviene_otra_eps_propio
fecha_afiliacion_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `paciente_id`, `usuario_origen`, `tipo_registro`, `titular_origen`, `sexo`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `estrato_propio`, `estrato_familiar`, `tipo_cotizante_propio`, `tipo_cotizante_titular`, `escolaridad_propia` | `string` |
| `fecha_nacimiento`, `fecha_afiliacion_titular` | `datetime` |
| `proviene_otra_eps_propio` | `boolean` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **1.100 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_cotizante`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un cotizante`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `paciente_id` | string | Sí | No |
| `usuario_origen` | string | No | Sí |
| `tipo_registro` | string | No | Sí |
| `titular_origen` | string | No | Sí |
| `sexo` | string | No | Sí |
| `fecha_nacimiento` | date | No | Sí |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `estrato_propio` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_propio` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `escolaridad_propia` | string | No | Sí |
| `proviene_otra_eps_propio` | boolean | No | Sí |
| `fecha_afiliacion_titular` | date | No | Sí |

5. En **Claves UNIQUE**, añade una entrada con `usuario_origen`. Escribe nombres sin comillas ni corchetes. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_cotizante`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-9"></a>

### 4.9. `web_aux_perfil_titular`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_aux_cotizante`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `usuario_origen`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `estrato_familiar`, `tipo_cotizante_titular`, `fecha_afiliacion_titular`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `usuario_origen` | `titular_origen` |

La proyección evita copiar sexo o nacimiento del titular sobre los datos propios del beneficiario.

Agrega **Mantener Cols** al final y conserva exactamente estas 7 columnas, en este orden:

```text
titular_origen
familia_id
empresa_id
ips_afiliacion_id
estrato_familiar
tipo_cotizante_titular
fecha_afiliacion_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `titular_origen`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `estrato_familiar`, `tipo_cotizante_titular` | `string` |
| `fecha_afiliacion_titular` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **1.100 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_perfil_titular`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un perfil familiar por titular`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `titular_origen` | string | Sí | No |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `fecha_afiliacion_titular` | date | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_perfil_titular`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-10"></a>

### 4.10. `web_aux_beneficiario`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.beneficiario`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols**: `id_beneficiario`, `sexo`, `fecha_nacimiento`.

En **Renombrar**, crea cada pareja con **Columna Original**, **Nuevo Nombre** y **Añadir renombre**; al terminar pulsa **Aplicar Operación**:

| Original | Nuevo nombre |
| --- | --- |
| `id_beneficiario` | `usuario_origen` |

Agrega **Transformar Col** → **Columna = `sexo`** → **Expresión**:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

Pulsa **Aplicar Operación**.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_familia`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_perfil_titular`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"titular_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

En cada cruce deben mantenerse 3.316 filas en la fotografía de referencia.

Agrega una **Columna Calculada** por fila:

| Nueva columna | Expresión |
| --- | --- |
| `paciente_id` | `'B:' + str(usuario_origen).strip()` |
| `tipo_registro` | `'beneficiario'` |
| `estrato_propio` | `None` |
| `tipo_cotizante_propio` | `None` |
| `escolaridad_propia` | `None` |
| `proviene_otra_eps_propio` | `None` |

Escribe `None` sin comillas. El estrato familiar y tipo del titular heredados no son datos propios del beneficiario. Su procedencia propia es desconocida, no False.

Agrega **Mantener Cols** al final y conserva exactamente estas 16 columnas, en este orden:

```text
paciente_id
usuario_origen
tipo_registro
titular_origen
sexo
fecha_nacimiento
familia_id
empresa_id
ips_afiliacion_id
estrato_propio
estrato_familiar
tipo_cotizante_propio
tipo_cotizante_titular
escolaridad_propia
proviene_otra_eps_propio
fecha_afiliacion_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `paciente_id`, `usuario_origen`, `tipo_registro`, `titular_origen`, `sexo`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `estrato_propio`, `estrato_familiar`, `tipo_cotizante_propio`, `tipo_cotizante_titular`, `escolaridad_propia` | `string` |
| `fecha_nacimiento`, `fecha_afiliacion_titular` | `datetime` |
| `proviene_otra_eps_propio` | `boolean` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **3.316 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_beneficiario`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un beneficiario`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `paciente_id` | string | Sí | No |
| `usuario_origen` | string | No | Sí |
| `tipo_registro` | string | No | Sí |
| `titular_origen` | string | No | Sí |
| `sexo` | string | No | Sí |
| `fecha_nacimiento` | date | No | Sí |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `estrato_propio` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_propio` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `escolaridad_propia` | string | No | Sí |
| `proviene_otra_eps_propio` | boolean | No | Sí |
| `fecha_afiliacion_titular` | date | No | Sí |

5. En **Claves UNIQUE**, añade una entrada con `usuario_origen`. Escribe nombres sin comillas ni corchetes. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_beneficiario`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-11"></a>

### 4.11. `web_dim_paciente`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_aux_cotizante`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Unión Vertical**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_beneficiario`, espera la muestra y pulsa **Confirmar fuente secundaria**. Pulsa **Aplicar Operación**.

La unión apila las filas de cotizantes y beneficiarios. Comprueba 4.416 filas: 1.100 cotizantes y 3.316 beneficiarios, con 1.100 familias distintas.

La clave UNIQUE de `usuario_origen` permite enlazar los hechos, cuyos datos originales solo incluyen `id_usuario`. Si hay colisiones entre tipos de persona, revisa la ambigüedad del origen; no elijas una persona al azar ni quites la restricción.

Agrega **Mantener Cols** al final y conserva exactamente estas 16 columnas, en este orden:

```text
paciente_id
usuario_origen
tipo_registro
titular_origen
sexo
fecha_nacimiento
familia_id
empresa_id
ips_afiliacion_id
estrato_propio
estrato_familiar
tipo_cotizante_propio
tipo_cotizante_titular
escolaridad_propia
proviene_otra_eps_propio
fecha_afiliacion_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `paciente_id`, `usuario_origen`, `tipo_registro`, `titular_origen`, `sexo`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `estrato_propio`, `estrato_familiar`, `tipo_cotizante_propio`, `tipo_cotizante_titular`, `escolaridad_propia` | `string` |
| `fecha_nacimiento`, `fecha_afiliacion_titular` | `datetime` |
| `proviene_otra_eps_propio` | `boolean` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **4.416 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_paciente`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una persona distinguida por tipo de registro`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `paciente_id` | string | Sí | No |
| `usuario_origen` | string | No | Sí |
| `tipo_registro` | string | No | Sí |
| `titular_origen` | string | No | Sí |
| `sexo` | string | No | Sí |
| `fecha_nacimiento` | date | No | Sí |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `estrato_propio` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_propio` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `escolaridad_propia` | string | No | Sí |
| `proviene_otra_eps_propio` | boolean | No | Sí |
| `fecha_afiliacion_titular` | date | No | Sí |

5. En **Claves UNIQUE**, añade una entrada con `usuario_origen`. Escribe nombres sin comillas ni corchetes. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_paciente`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-12"></a>

### 4.12. `web_aux_paciente_hecho`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_dim_paciente`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Mantener Cols** y selecciona `usuario_origen`, `paciente_id`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `sexo`, `fecha_nacimiento`, `estrato_familiar`, `tipo_cotizante_titular`, `fecha_afiliacion_titular`.

Esta auxiliar ofrece una fila por usuario para enriquecer hechos sin multiplicar eventos. Las FK de los hechos apuntarán a la dimensión definitiva por `paciente_id`.

Agrega **Mantener Cols** al final y conserva exactamente estas 10 columnas, en este orden:

```text
usuario_origen
paciente_id
familia_id
empresa_id
ips_afiliacion_id
sexo
fecha_nacimiento
estrato_familiar
tipo_cotizante_titular
fecha_afiliacion_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `usuario_origen`, `paciente_id`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `sexo`, `estrato_familiar`, `tipo_cotizante_titular` | `string` |
| `fecha_nacimiento`, `fecha_afiliacion_titular` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **4.416 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_aux_paciente_hecho`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un perfil de persona para enriquecer hechos`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `usuario_origen` | string | Sí | No |
| `paciente_id` | string | No | Sí |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `sexo` | string | No | Sí |
| `fecha_nacimiento` | date | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `fecha_afiliacion_titular` | date | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_paciente_hecho`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-13-a"></a>

### 4.13.A. `web_aux_citas`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.citas_generales`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols**: `codigo_cita`, `id_usuario`, `id_medico`, `fecha_solicitud`, `hora_solicitud`, `fecha_atencion`, `hora_atencion`, `diagnostico`.
- En **Renombrar**, añade `codigo_cita → codigo_origen`, `id_usuario → usuario_origen`, `id_medico → medico_id`, `diagnostico → diagnostico_normalizado`.
- Agrega **Transformar Col**, columna `diagnostico_normalizado`, expresión:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

- Agrega **Columna Calculada**, nueva columna `servicio_id`, expresión `None`.
- Agrega una **Columna Calculada** por fila:

| Nueva columna | Expresión |
| --- | --- |
| `tipo_atencion` | `'cita_general'` |
| `atencion_id` | `'citas_generales:' + str(codigo_origen).strip()` |
| `timestamp_solicitud_local` | `str(fecha_solicitud)[:10] + ' ' + str(hora_solicitud)` |
| `timestamp_atencion_local` | `str(fecha_atencion)[:10] + ' ' + str(hora_atencion)` |

- Agrega **Cambiar Tipo** para `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Actualiza la vista previa y verifica que no aparezcan nuevos `NaT`.

Los prefijos de `atencion_id` evitan colisiones entre tablas. Conserva los eventos con espera negativa. Si faltan fechas u horas, no inventes `00:00`: revisa el origen antes de construir el timestamp.

Agrega **Mantener Cols** al final y conserva exactamente estas 11 columnas, en este orden:

```text
atencion_id
codigo_origen
tipo_atencion
usuario_origen
medico_id
servicio_id
diagnostico_normalizado
fecha_solicitud
fecha_atencion
timestamp_solicitud_local
timestamp_atencion_local
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `atencion_id`, `codigo_origen`, `tipo_atencion`, `usuario_origen`, `medico_id`, `servicio_id`, `diagnostico_normalizado` | `string` |
| `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **3.013 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_aux_citas`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un evento de citas_generales`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `atencion_id` | string | Sí | No |
| `codigo_origen` | string | No | Sí |
| `tipo_atencion` | string | No | Sí |
| `usuario_origen` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `servicio_id` | string | No | Sí |
| `diagnostico_normalizado` | string | No | Sí |
| `fecha_solicitud` | date | No | Sí |
| `fecha_atencion` | date | No | Sí |
| `timestamp_solicitud_local` | datetime, zona horaria desmarcada | No | Sí |
| `timestamp_atencion_local` | datetime, zona horaria desmarcada | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_citas`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-13-b"></a>

### 4.13.B. `web_aux_urgencias`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.urgencias`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols**: `codigo_urgencia`, `id_usuario`, `id_medico`, `fecha_solicitud`, `hora_solicitud`, `fecha_atencion`, `hora_atencion`, `diagnostico`.
- En **Renombrar**, añade `codigo_urgencia → codigo_origen`, `id_usuario → usuario_origen`, `id_medico → medico_id`, `diagnostico → diagnostico_normalizado`.
- Agrega **Transformar Col**, columna `diagnostico_normalizado`, expresión:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

- Agrega **Columna Calculada**, nueva columna `servicio_id`, expresión `None`.
- Agrega una **Columna Calculada** por fila:

| Nueva columna | Expresión |
| --- | --- |
| `tipo_atencion` | `'urgencia'` |
| `atencion_id` | `'urgencias:' + str(codigo_origen).strip()` |
| `timestamp_solicitud_local` | `str(fecha_solicitud)[:10] + ' ' + str(hora_solicitud)` |
| `timestamp_atencion_local` | `str(fecha_atencion)[:10] + ' ' + str(hora_atencion)` |

- Agrega **Cambiar Tipo** para `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Actualiza la vista previa y verifica que no aparezcan nuevos `NaT`.

Los prefijos de `atencion_id` evitan colisiones entre tablas. Conserva los eventos con espera negativa. Si faltan fechas u horas, no inventes `00:00`: revisa el origen antes de construir el timestamp.

Agrega **Mantener Cols** al final y conserva exactamente estas 11 columnas, en este orden:

```text
atencion_id
codigo_origen
tipo_atencion
usuario_origen
medico_id
servicio_id
diagnostico_normalizado
fecha_solicitud
fecha_atencion
timestamp_solicitud_local
timestamp_atencion_local
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `atencion_id`, `codigo_origen`, `tipo_atencion`, `usuario_origen`, `medico_id`, `servicio_id`, `diagnostico_normalizado` | `string` |
| `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **559 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_aux_urgencias`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un evento de urgencias`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `atencion_id` | string | Sí | No |
| `codigo_origen` | string | No | Sí |
| `tipo_atencion` | string | No | Sí |
| `usuario_origen` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `servicio_id` | string | No | Sí |
| `diagnostico_normalizado` | string | No | Sí |
| `fecha_solicitud` | date | No | Sí |
| `fecha_atencion` | date | No | Sí |
| `timestamp_solicitud_local` | datetime, zona horaria desmarcada | No | Sí |
| `timestamp_atencion_local` | datetime, zona horaria desmarcada | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_urgencias`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-13-c"></a>

### 4.13.C. `web_aux_hospitalizaciones`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.hospitalizaciones`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols**: `codigo_hospitalizacion`, `id_usuario`, `id_medico`, `fecha_solicitud`, `hora_solicitud`, `fecha_atencion`, `hora_atencion`, `diagnostico`.
- En **Renombrar**, añade `codigo_hospitalizacion → codigo_origen`, `id_usuario → usuario_origen`, `id_medico → medico_id`, `diagnostico → diagnostico_normalizado`.
- Agrega **Transformar Col**, columna `diagnostico_normalizado`, expresión:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

- Agrega **Columna Calculada**, nueva columna `servicio_id`, expresión `None`.
- Agrega una **Columna Calculada** por fila:

| Nueva columna | Expresión |
| --- | --- |
| `tipo_atencion` | `'hospitalizacion'` |
| `atencion_id` | `'hospitalizaciones:' + str(codigo_origen).strip()` |
| `timestamp_solicitud_local` | `str(fecha_solicitud)[:10] + ' ' + str(hora_solicitud)` |
| `timestamp_atencion_local` | `str(fecha_atencion)[:10] + ' ' + str(hora_atencion)` |

- Agrega **Cambiar Tipo** para `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Actualiza la vista previa y verifica que no aparezcan nuevos `NaT`.

Los prefijos de `atencion_id` evitan colisiones entre tablas. Conserva los eventos con espera negativa. Si faltan fechas u horas, no inventes `00:00`: revisa el origen antes de construir el timestamp. `duracion_hospitalizacion` queda fuera porque no hay una unidad confirmada para interpretarla como ocupación.

Agrega **Mantener Cols** al final y conserva exactamente estas 11 columnas, en este orden:

```text
atencion_id
codigo_origen
tipo_atencion
usuario_origen
medico_id
servicio_id
diagnostico_normalizado
fecha_solicitud
fecha_atencion
timestamp_solicitud_local
timestamp_atencion_local
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `atencion_id`, `codigo_origen`, `tipo_atencion`, `usuario_origen`, `medico_id`, `servicio_id`, `diagnostico_normalizado` | `string` |
| `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **893 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_aux_hospitalizaciones`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un evento de hospitalizaciones`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `atencion_id` | string | Sí | No |
| `codigo_origen` | string | No | Sí |
| `tipo_atencion` | string | No | Sí |
| `usuario_origen` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `servicio_id` | string | No | Sí |
| `diagnostico_normalizado` | string | No | Sí |
| `fecha_solicitud` | date | No | Sí |
| `fecha_atencion` | date | No | Sí |
| `timestamp_solicitud_local` | datetime, zona horaria desmarcada | No | Sí |
| `timestamp_atencion_local` | datetime, zona horaria desmarcada | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_hospitalizaciones`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-13-d"></a>

### 4.13.D. `web_aux_remisiones`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.remisiones`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Agrega **Mantener Cols**: `codigo_remision`, `id_usuario`, `id_medico`, `servicio_pos`, `fecha_remision`, `hora_remision`, `fecha_atencion`, `hora_atencion`, `diagnostico`.
- En **Renombrar**, añade `codigo_remision → codigo_origen`, `id_usuario → usuario_origen`, `id_medico → medico_id`, `diagnostico → diagnostico_normalizado`. Añade `fecha_remision → fecha_solicitud`, `hora_remision → hora_solicitud` y `servicio_pos → servicio_id`.
- Agrega **Transformar Col**, columna `diagnostico_normalizado`, expresión:

```python
None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()
```

- Conserva `servicio_id` del renombre.
- Agrega una **Columna Calculada** por fila:

| Nueva columna | Expresión |
| --- | --- |
| `tipo_atencion` | `'remision'` |
| `atencion_id` | `'remisiones:' + str(codigo_origen).strip()` |
| `timestamp_solicitud_local` | `str(fecha_solicitud)[:10] + ' ' + str(hora_solicitud)` |
| `timestamp_atencion_local` | `str(fecha_atencion)[:10] + ' ' + str(hora_atencion)` |

- Agrega **Cambiar Tipo** para `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Actualiza la vista previa y verifica que no aparezcan nuevos `NaT`.

Los prefijos de `atencion_id` evitan colisiones entre tablas. Conserva los eventos con espera negativa. Si faltan fechas u horas, no inventes `00:00`: revisa el origen antes de construir el timestamp.

Agrega **Mantener Cols** al final y conserva exactamente estas 11 columnas, en este orden:

```text
atencion_id
codigo_origen
tipo_atencion
usuario_origen
medico_id
servicio_id
diagnostico_normalizado
fecha_solicitud
fecha_atencion
timestamp_solicitud_local
timestamp_atencion_local
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `atencion_id`, `codigo_origen`, `tipo_atencion`, `usuario_origen`, `medico_id`, `servicio_id`, `diagnostico_normalizado` | `string` |
| `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **16.742 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_aux_remisiones`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un evento de remisiones`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `atencion_id` | string | Sí | No |
| `codigo_origen` | string | No | Sí |
| `tipo_atencion` | string | No | Sí |
| `usuario_origen` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `servicio_id` | string | No | Sí |
| `diagnostico_normalizado` | string | No | Sí |
| `fecha_solicitud` | date | No | Sí |
| `fecha_atencion` | date | No | Sí |
| `timestamp_solicitud_local` | datetime, zona horaria desmarcada | No | Sí |
| `timestamp_atencion_local` | datetime, zona horaria desmarcada | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_aux_remisiones`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-14"></a>

### 4.14. `web_fact_atencion`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_aux_citas`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

Agrega **Unión Vertical**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_urgencias`, espera la muestra y pulsa **Confirmar fuente secundaria**. Pulsa **Aplicar Operación**.

Total acumulado de referencia: **3.572**.

Agrega **Unión Vertical**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_hospitalizaciones`, espera la muestra y pulsa **Confirmar fuente secundaria**. Pulsa **Aplicar Operación**.

Total acumulado: **4.465**.

Agrega **Unión Vertical**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_remisiones`, espera la muestra y pulsa **Confirmar fuente secundaria**. Pulsa **Aplicar Operación**.

Total acumulado: **21.207**.

- Comprueba **21.207** filas antes de los cruces.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_paciente_hecho`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_dim_medico`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"medico_id"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_dim_servicio`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"servicio_id"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Conserva nulas las tarifas de citas, urgencias y hospitalizaciones.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_mapa_diagnostico`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"diagnostico_normalizado"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

- Renombra `tarifa_catalogo → tarifa_servicio_catalogo`.

Antes de crear edades, días o comparaciones, agrega **Cambiar Tipo** para `fecha_solicitud`, `fecha_atencion`, `fecha_nacimiento`, `timestamp_solicitud_local`, `timestamp_atencion_local`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Pulsa **Aplicar Operación** y actualiza la vista previa. No deben aparecer nuevos `NaT`. Esto evita el error `'str' object has no attribute 'year'`.

Agrega una **Columna Calculada** por fila:

| Campo nuevo | Expresión |
| --- | --- |
| `fecha_solicitud_id` | `str(fecha_solicitud)[:10].replace('-', '')` |
| `fecha_atencion_id` | `str(fecha_atencion)[:10].replace('-', '')` |
| `edad_al_evento` | `fecha_atencion.year - fecha_nacimiento.year - ((fecha_atencion.month, fecha_atencion.day) < (fecha_nacimiento.month, fecha_nacimiento.day))` |
| `edad_solicitud` | `fecha_solicitud.year - fecha_nacimiento.year - ((fecha_solicitud.month, fecha_solicitud.day) < (fecha_nacimiento.month, fecha_nacimiento.day))` |
| `dia_semana_atencion` | `fecha_atencion.weekday() + 1` |
| `dia_semana_solicitud` | `fecha_solicitud.weekday() + 1` |
| `mes_atencion` | `str(fecha_atencion)[:7]` |
| `espera_negativa` | `timestamp_atencion_local < timestamp_solicitud_local` |


Después de **cada** left join debe mantenerse el total. Un aumento de filas es señal de clave derecha duplicada; no lo arregles con un Eliminar Duplicados al final.

La espera se calculará en el servidor analítico como duración entre los timestamps. Así no se necesita materializar un resultado float ni una columna precalculada de promedios.

Agrega **Mantener Cols** al final y conserva exactamente estas 30 columnas, en este orden:

```text
atencion_id
codigo_origen
tipo_atencion
paciente_id
familia_id
empresa_id
ips_afiliacion_id
medico_id
ips_medico_asociado_id
servicio_id
tipo_servicio
tarifa_servicio_catalogo
diagnostico_normalizado
grupo_textual
clase_texto
fecha_solicitud
fecha_atencion
fecha_solicitud_id
fecha_atencion_id
timestamp_solicitud_local
timestamp_atencion_local
espera_negativa
sexo
estrato_familiar
tipo_cotizante_titular
edad_al_evento
edad_solicitud
dia_semana_atencion
dia_semana_solicitud
mes_atencion
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `atencion_id`, `codigo_origen`, `tipo_atencion`, `paciente_id`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `medico_id`, `ips_medico_asociado_id`, `servicio_id`, `tipo_servicio`, `diagnostico_normalizado`, `grupo_textual`, `clase_texto`, `fecha_solicitud_id`, `fecha_atencion_id`, `sexo`, `estrato_familiar`, `tipo_cotizante_titular`, `mes_atencion` | `string` |
| `tarifa_servicio_catalogo` | `decimal` |
| `fecha_solicitud`, `fecha_atencion`, `timestamp_solicitud_local`, `timestamp_atencion_local` | `datetime` |
| `espera_negativa` | `boolean` |
| `edad_al_evento`, `edad_solicitud`, `dia_semana_atencion`, `dia_semana_solicitud` | `integer` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **21.207 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula. Las tarifas ausentes permanecen nulas, sin sustituirlas por cero.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_fact_atencion`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un registro de atención de una tabla origen; no episodio único`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `atencion_id` | string | Sí | No |
| `codigo_origen` | string | No | Sí |
| `tipo_atencion` | string | No | Sí |
| `paciente_id` | string | No | No |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `ips_medico_asociado_id` | string | No | Sí |
| `servicio_id` | string | No | Sí |
| `tipo_servicio` | string | No | Sí |
| `tarifa_servicio_catalogo` | decimal; precisión `30`, escala `2` | No | Sí |
| `diagnostico_normalizado` | string | No | Sí |
| `grupo_textual` | string | No | Sí |
| `clase_texto` | string | No | Sí |
| `fecha_solicitud` | date | No | Sí |
| `fecha_atencion` | date | No | Sí |
| `fecha_solicitud_id` | string | No | Sí |
| `fecha_atencion_id` | string | No | Sí |
| `timestamp_solicitud_local` | datetime, zona horaria desmarcada | No | Sí |
| `timestamp_atencion_local` | datetime, zona horaria desmarcada | No | Sí |
| `espera_negativa` | boolean | No | Sí |
| `sexo` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |
| `edad_al_evento` | integer | No | Sí |
| `edad_solicitud` | integer | No | Sí |
| `dia_semana_atencion` | integer | No | Sí |
| `dia_semana_solicitud` | integer | No | Sí |
| `mes_atencion` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `paciente_id` | `web_dim_paciente` | `paciente_id` |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |
| `medico_id` | `web_dim_medico` | `medico_id` |
| `ips_medico_asociado_id` | `web_dim_ips` | `ips_id` |
| `servicio_id` | `web_dim_servicio` | `servicio_id` |
| `fecha_solicitud_id` | `web_dim_fecha` | `fecha_id` |
| `fecha_atencion_id` | `web_dim_fecha` | `fecha_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, pulsa **Agregar comprobación** y configura:

| Columna | Regla | Severidad | minimum | maximum |
| --- | --- | --- | --- | --- |
| `atencion_id` | `unique` | Bloquear | Vacío | Vacío |
| `paciente_id` | `not_null` | Bloquear | Vacío | Vacío |
| `edad_al_evento` | `range` | Bloquear | 0 | 120 |

No exijas que todas las esperas sean positivas. Se conservan los 497 eventos con espera negativa de la fotografía histórica; se excluyen únicamente al calcular duración válida.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_fact_atencion`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-15"></a>

### 4.15. `web_fact_pago`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.pagos`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `id_transaccion`, `fecha_pago`, `id_usuario`, `valor_pagado`.
- Renombra `id_usuario → usuario_origen`, `valor_pagado → valor_aporte`.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_paciente_hecho`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.
Antes del identificador, agrega **Cambiar Tipo** para `fecha_pago`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas; aplica la operación.

- Crea `fecha_pago_id = str(fecha_pago)[:10].replace('-', '')`.
- Conserva `id_transaccion`, `fecha_pago`, `fecha_pago_id`, `paciente_id`, `familia_id`, `empresa_id`, `ips_afiliacion_id`, `valor_aporte`.

Agrega **Mantener Cols** al final y conserva exactamente estas 8 columnas, en este orden:

```text
id_transaccion
fecha_pago
fecha_pago_id
paciente_id
familia_id
empresa_id
ips_afiliacion_id
valor_aporte
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `id_transaccion`, `fecha_pago_id`, `paciente_id`, `familia_id`, `empresa_id`, `ips_afiliacion_id` | `string` |
| `fecha_pago` | `datetime` |
| `valor_aporte` | `decimal` |

Pulsa **Actualizar vista previa**. Referencia histórica: **22.938 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos. Una empresa no informada permanece nula.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_fact_pago`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un pago del origen`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `id_transaccion` | string | Sí | No |
| `fecha_pago` | date | No | Sí |
| `fecha_pago_id` | string | No | Sí |
| `paciente_id` | string | No | Sí |
| `familia_id` | string | No | Sí |
| `empresa_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `valor_aporte` | decimal; precisión `30`, escala `2` | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `paciente_id` | `web_dim_paciente` | `paciente_id` |
| `empresa_id` | `web_dim_empresa` | `empresa_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |
| `fecha_pago_id` | `web_dim_fecha` | `fecha_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_fact_pago`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-16"></a>

### 4.16. `web_fact_formula`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.formulas_medicas`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `codigo_formula`, `id_usuario`, `id_medico`, `fecha`, `medicamentos_recetados`.
- Renombra usuario a `usuario_origen`, médico a `medico_id`, fecha a `fecha_formula`.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_paciente_hecho`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_dim_medico`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"medico_id"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.
Antes del identificador, agrega **Cambiar Tipo** para `fecha_formula`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas; aplica la operación.

- Crea `fecha_formula_id = str(fecha_formula)[:10].replace('-', '')`.
- Conserva `codigo_formula`, `paciente_id`, `medico_id`, `ips_medico_asociado_id`, `fecha_formula`, `fecha_formula_id`, `medicamentos_recetados`.

La cabecera se conserva aunque tenga un solo medicamento: aporta al denominador de coformulación. No borres esas recetas al formar pares.

Agrega **Mantener Cols** al final y conserva exactamente estas 7 columnas, en este orden:

```text
codigo_formula
paciente_id
medico_id
ips_medico_asociado_id
fecha_formula
fecha_formula_id
medicamentos_recetados
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `codigo_formula`, `paciente_id`, `medico_id`, `ips_medico_asociado_id`, `fecha_formula_id`, `medicamentos_recetados` | `string` |
| `fecha_formula` | `datetime` |

Pulsa **Actualizar vista previa**. Referencia histórica: **7.484 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_fact_formula`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una fórmula médica`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `codigo_formula` | string | Sí | No |
| `paciente_id` | string | No | Sí |
| `medico_id` | string | No | Sí |
| `ips_medico_asociado_id` | string | No | Sí |
| `fecha_formula` | date | No | Sí |
| `fecha_formula_id` | string | No | Sí |
| `medicamentos_recetados` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `paciente_id` | `web_dim_paciente` | `paciente_id` |
| `medico_id` | `web_dim_medico` | `medico_id` |
| `ips_medico_asociado_id` | `web_dim_ips` | `ips_id` |
| `fecha_formula_id` | `web_dim_fecha` | `fecha_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_fact_formula`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-17"></a>

### 4.17. `web_puente_formula_medicamento`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_fact_formula`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `codigo_formula`, `medicamentos_recetados`.
- **Dividir en Filas**: Columna `medicamentos_recetados`, Delimitador `;`, Nueva columna `medicamento_id`, Eliminar original activado.
- Transformar Col sobre medicamento: `str(x).strip()`.
- Eliminar Duplicados, subconjunto `codigo_formula,medicamento_id`.

Agrega **Mantener Cols** al final y conserva exactamente estas 2 columnas, en este orden:

```text
codigo_formula
medicamento_id
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `codigo_formula`, `medicamento_id` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **15.770 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_puente_formula_medicamento`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Una presencia de un medicamento en una fórmula`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `codigo_formula` | string | Sí | No |
| `medicamento_id` | string | Sí | No |

Marca ambas columnas como **Parte de PK**: forman una sola clave compuesta. No crees dos UNIQUE individuales.

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `codigo_formula` | `web_fact_formula` | `codigo_formula` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_puente_formula_medicamento`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

<a id="etl-4-18"></a>

### 4.18. `web_dim_medicamento`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable_dw_core`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.web_puente_formula_medicamento`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `medicamento_id`.
- Eliminar Duplicados sobre medicamento.

Agrega **Mantener Cols** al final y conserva exactamente estas 1 columnas, en este orden:

```text
medicamento_id
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `medicamento_id` | `string` |

Pulsa **Actualizar vista previa**. Referencia histórica: **166 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Dimensión**. Escribe **Tabla destino = `web_dim_medicamento`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un código de medicamento observado`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `medicamento_id` | string | Sí | No |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, deja la lista sin entradas.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_dim_medicamento`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

### 4.18.B. Completar las FK del puente sin cargar filas

Después de crear y confirmar `web_dim_medicamento`, añade su referencia al puente existente:

1. Si la carga anterior terminó con éxito, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. En **Extracción → Base de datos**, introduce la conexión PostgreSQL de `colombia_saludable_dw_core`; activa el agente híbrido si las bases están en tu PC. Conecta, selecciona `public.web_puente_formula_medicamento` y procesa la fuente.
2. En **Transformación**, deja la receta **vacía**. No agregues conversiones ni vuelvas a dividir medicamentos. Actualiza la vista previa: referencia **15.770 filas**.
3. En **Carga**, introduce la misma conexión, activa el agente si corresponde, elige **Hechos**, tabla destino `web_puente_formula_medicamento` y **Preparar estructura sin cargar filas (schema_only)**.
4. Pulsa **Configurar tipos y claves**. Grano: `Una presencia de un medicamento en una fórmula`.
5. Configura `codigo_formula` y `medicamento_id` como **string**, ambas **Parte de PK**, ambas sin permitir nulos. La PK es compuesta. Deja UNIQUE e índices adicionales vacíos.
6. En **FK físicas → Agregar FK física**, completa ambas filas; conserva también la FK ya existente de fórmula:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `codigo_formula` | `web_fact_formula` | `codigo_formula` |
| `medicamento_id` | `web_dim_medicamento` | `medicamento_id` |

7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Deja **Comprobaciones antes de escribir** sin entradas. Usa **FK físicas** del esquema explícito, no solamente el mapa tradicional de **Claves foráneas**.
8. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Verifica que el modo siga siendo **schema_only**.
9. Pulsa **Revisar impacto sin escribir**. Debe conservar la tabla y proponer la restricción que falta (`add_foreign_key`); no debe proponer crear/reemplazar la tabla ni insertar/borrar filas. Si aparece `create_table`, revisa la base/nombre antes de ejecutar.
10. Ejecuta **Iniciar carga en bodega de datos**. El resultado esperado es **cero filas enviadas** y el mismo total anterior/posterior. No uses append, replace ni reload.
11. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Comprueba las dos FK y la PK compuesta. Para contar filas, pulsa **Nuevo análisis avanzado**, selecciona `public.web_puente_formula_medicamento`, título `Control del puente después de añadir FK`, grano `Una presencia fórmula–medicamento`, zona `America/Bogota`, patrón **Indicadores, tasas y medias por entidad**. Deja filtros, relaciones, agrupaciones, población y cohortes vacíos; configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**, 20 grupos. Pulsa **Calcular análisis**: referencia **15.770**.
12. Si el reporte dice **unknown**, comprueba que la operación del agente haya terminado. Si están ambas FK y el total se conserva, el resultado esperado está presente aunque el reporte haya quedado incierto. Si falta la FK, revisa el registro del agente y que se aplicó el esquema con ambas referencias antes de reintentar en **schema_only**. No repitas una inserción para resolver una restricción pendiente.
13. Guarda el reporte y, al confirmar el resultado, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**.

<a id="etl-4-19"></a>

### 4.19. `web_fact_retiro`

**A. Extraer la fuente**

1. En la aplicación desplegada abre **Extracción → Base de datos**. Introduce motor PostgreSQL, host, puerto, usuario y contraseña de **`colombia_saludable`**. Si PostgreSQL está en tu equipo y usas la web desplegada, marca **Usar agente local híbrido** y comprueba que esté conectado; `localhost` se interpreta desde el agente. Pulsa **Conectar y listar tablas**, selecciona **`public.retiros`**, espera su muestra, procesa el origen y continúa a **Transformación**.

**B. Transformar, en este orden**

- Conserva `id_retiro`, `fecha_retiro`, `id_usuario`, `cambio_a_eps`.
- Renombra usuario a `usuario_origen`, cambio a `eps_destino`.
- Normaliza destino con la expresión `None if str(x).strip().casefold() in ('', 'n/a', 'nan', 'none', '<na>', 'nat') else ' '.join(str(x).split()).casefold()`: vacío debe quedar nulo.

Agrega **Unión Horizontal · Left**. En la fuente secundaria elige **Base de datos → Conexión guardada: Ingresar conexión manual**. Introduce la conexión de la bodega `colombia_saludable_dw_core`; si usas el agente local, activa **Usar agente local híbrido** y verifica que esté conectado. Pulsa **Conectar y listar tablas**, selecciona `web_aux_paciente_hecho`, espera la muestra y pulsa **Confirmar fuente secundaria**. En **Claves de cruce**, escribe `"usuario_origen"`, incluidas las comillas. Pulsa **Aplicar Operación**. Actualiza la vista previa: el total no debe aumentar ni disminuir.

Antes de las columnas calculadas, agrega **Cambiar Tipo** para `fecha_retiro`, `fecha_nacimiento`, `fecha_afiliacion_titular`: **Tipo de Tipo de datos = Texto**, **Tipo de datos = `datetime`**, sin comillas. Aplica y actualiza la preview; no deben aparecer nuevos `NaT`.

Agrega una **Columna Calculada** por fila:

| Campo | Expresión |
| --- | --- |
| `destino_informado` | `str(eps_destino).strip().casefold() not in ('', 'n/a', 'nan', 'none', '<na>', 'nat')` |
| `fecha_retiro_id` | `str(fecha_retiro)[:10].replace('-', '')` |
| `edad_al_retiro` | `fecha_retiro.year - fecha_nacimiento.year - ((fecha_retiro.month, fecha_retiro.day) < (fecha_nacimiento.month, fecha_nacimiento.day))` |
| `dias_afiliacion_al_retiro` | `(fecha_retiro - fecha_afiliacion_titular).days` |

- Conserva `id_retiro`, `paciente_id`, `familia_id`, `ips_afiliacion_id`, `fecha_retiro`, `fecha_retiro_id`, `eps_destino`, `destino_informado`, `edad_al_retiro`, `dias_afiliacion_al_retiro`, `sexo`, `estrato_familiar`, `tipo_cotizante_titular`.

Agrega **Mantener Cols** al final y conserva exactamente estas 13 columnas, en este orden:

```text
id_retiro
paciente_id
familia_id
ips_afiliacion_id
fecha_retiro
fecha_retiro_id
eps_destino
destino_informado
edad_al_retiro
dias_afiliacion_al_retiro
sexo
estrato_familiar
tipo_cotizante_titular
```

Agrega una operación **Cambiar Tipo por cada fila de esta tabla**. Selecciona las columnas indicadas, elige **Tipo de Tipo de datos = Texto**, escribe el tipo sin comillas en **Tipo de datos** y pulsa **Aplicar Operación**:

| Columnas | Tipo en Transformación |
| --- | --- |
| `id_retiro`, `paciente_id`, `familia_id`, `ips_afiliacion_id`, `fecha_retiro_id`, `eps_destino`, `sexo`, `estrato_familiar`, `tipo_cotizante_titular` | `string` |
| `fecha_retiro` | `datetime` |
| `destino_informado` | `boolean` |
| `edad_al_retiro`, `dias_afiliacion_al_retiro` | `integer` |

Para convertir booleanos escribe `boolean` como nombre del tipo; no elijas un parámetro constante **Booleano → true/false**. Conserva los nulos de campos desconocidos.

Pulsa **Actualizar vista previa**. Referencia histórica: **89 filas**. Comprueba el total, no el número de filas visibles de la muestra. Las conversiones no deben generar nuevos nulos/`NaT` ni quitar ceros iniciales de los códigos.

**C. Configurar Carga y el esquema**

1. Abre **Carga** e introduce la conexión PostgreSQL de la bodega **`colombia_saludable_dw_core`**, host, puerto, usuario y contraseña. Si utilizas el agente, marca también aquí **Usar agente local híbrido**; el agente debe tener habilitado **Permitir carga de datos en bases locales**.
2. Selecciona primero **Hechos**. Escribe **Tabla destino = `web_fact_retiro`**, sin `public.`. Después selecciona **Crear solo si no existe (fail)**: cambiar el tipo de tabla puede cambiar el modo predeterminado.
3. Pulsa **Configurar tipos y claves**. Escribe **Grano de la tabla = `Un evento de retiro`**. Deja desmarcado **Permitir agregar restricciones verificadas a una tabla existente** para esta carga inicial.
4. Configura todas las columnas de esta tabla. **Unidad** de columna puede quedar vacía; es distinta de la unidad obligatoria de las medidas de análisis.

| Columna | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- |
| `id_retiro` | string | Sí | No |
| `paciente_id` | string | No | Sí |
| `familia_id` | string | No | Sí |
| `ips_afiliacion_id` | string | No | Sí |
| `fecha_retiro` | date | No | Sí |
| `fecha_retiro_id` | string | No | Sí |
| `eps_destino` | string | No | Sí |
| `destino_informado` | boolean | No | Sí |
| `edad_al_retiro` | integer | No | Sí |
| `dias_afiliacion_al_retiro` | integer | No | Sí |
| `sexo` | string | No | Sí |
| `estrato_familiar` | string | No | Sí |
| `tipo_cotizante_titular` | string | No | Sí |

5. En **Claves UNIQUE**, deja la lista sin entradas; la PK ya asegura la unicidad necesaria. Deja **Índices adicionales** sin entradas.
6. En **FK físicas**, pulsa **Agregar FK física** una vez por fila y completa las tres columnas:

| Columna local | Tabla referenciada | Clave referenciada |
| --- | --- | --- |
| `paciente_id` | `web_dim_paciente` | `paciente_id` |
| `ips_afiliacion_id` | `web_dim_ips` | `ips_id` |
| `fecha_retiro_id` | `web_dim_fecha` | `fecha_id` |

Escribe los nombres sin comillas, sin corchetes y sin `public.`. El orden de las FK no afecta; sí afectan los nombres o filas incompletas. **Claves foráneas** del formulario tradicional de hechos no sustituye **FK físicas** del esquema explícito.

7. En **Comprobaciones antes de escribir**, deja la lista sin entradas.

**D. Aplicar, revisar y cargar**

1. Pulsa **Aplicar esquema**. Si dice “Contrato inválido”, revisa el grano, las columnas y las entradas UNIQUE/FK incompletas de esta tabla; conserva las transformaciones.
2. Vuelve a **Transformación → Actualizar vista previa**. El esquema activa lectura exacta y vuelve a ejecutar la receta. Comprueba el total y los tipos antes de regresar a Carga.
3. Pulsa **Revisar impacto sin escribir**. En la primera carga el destino debe tener cero filas y proponer `create_table` e `insert_rows` con el resultado esperado. Si la tabla ya existe, comprueba su contenido antes de decidir una recuperación; no uses append para ignorar el error.
4. Pulsa **Iniciar carga en bodega de datos**. Revisa que el estado confirme éxito, las filas enviadas y el total final. Descarga el reporte.
5. Si el estado es **unknown**, no confirma éxito ni fallo. Abre **Bodega de datos**, conecta a la misma bodega y pulsa **Conectar y leer catálogo**. Inspecciona la existencia, claves y total de `web_fact_retiro`; si falta información, revisa que la operación del agente terminó antes de reintentar. No repitas una carga a ciegas.
6. Cuando hayas confirmado la carga, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. Esto limpia la receta y las credenciales en memoria; conserva las tablas cargadas. Comienza la tabla siguiente con una receta nueva.

## 5. Validar la bodega sin modificar datos

Los controles siguientes son parte del cierre del ETL. Cada uno tiene todos los pasos de consulta; no configuran las respuestas del taller. Las referencias se comparan con la misma fotografía del origen. Si cambió, registra la diferencia y su causa antes de declarar la bodega conciliada.

### 5.1. Validación de pacientes y familias

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.1 — Validación de pacientes y familias |
| Qué representa una fila | Una fila de dim_paciente |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Filas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas | `COUNT_DISTINCT` | `Base · web_dim_paciente.paciente_id` | `count` | Grupo actual |
| `familias` | Familias | `COUNT_DISTINCT` | `Base · web_dim_paciente.familia_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: 4.416 filas, 4.416 personas y 1.100 familias. Grupos a mostrar = 20 no limita el conteo: sin agrupaciones hay una fila Total. Si devuelve 422, escribe de nuevo `count` en las tres unidades, aunque visualmente parezcan completas. En el caso documentado el problema era `unit: ""` en filas.

### 5.2. Tipos de paciente

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.2 — Tipos de paciente |
| Qué representa una fila | Una fila de dim_paciente |
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
| ID de agrupación | `tipo` |
| Nombre de agrupación | Tipo de paciente |
| Campo de agrupación | `Base · web_dim_paciente.tipo_registro` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Filas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `personas` | Personas | `COUNT_DISTINCT` | `Base · web_dim_paciente.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: 1.100 cotizantes y 3.316 beneficiarios. No cuentes las filas de la vista previa de Transformación como si fueran el total.

### 5.3. Cotizantes sin empresa conservados

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.3 — Cotizantes sin empresa conservados |
| Qué representa una fila | Una fila de dim_paciente |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `cotizante` |
| `Base · web_dim_paciente.empresa_id` | IS_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Cotizantes sin empresa | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 175 cotizantes. El Left join debe conservarlos; empresa desconocida permanece nula.

### 5.4. Procedencia propia nula de beneficiarios

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_paciente`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_paciente`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.4 — Procedencia propia nula de beneficiarios |
| Qué representa una fila | Una fila de dim_paciente |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_dim_paciente.tipo_registro` | EQ | `beneficiario` |
| `Base · web_dim_paciente.proviene_otra_eps_propio` | IS_NULL | Sin valor adicional |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Beneficiarios sin procedencia propia | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 3.316 beneficiarios. Si da cero por haber rellenado False, revisa la conversión/origen: no se puede interpretar el dato propio faltante como una procedencia negativa.

### 5.5. Total y unicidad de atenciones

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.5 — Total y unicidad de atenciones |
| Qué representa una fila | Una fila de fact_atencion |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `ids` | Identificadores de atención | `COUNT_DISTINCT` | `Base · web_fact_atencion.atencion_id` | `count` | Grupo actual |
| `personas` | Personas atendidas | `COUNT_DISTINCT` | `Base · web_fact_atencion.paciente_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: 21.207 eventos/IDs y 504 personas atendidas. Los 4.416 pacientes registrados son una población distinta.

### 5.6. Atenciones por origen

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.6 — Atenciones por origen |
| Qué representa una fila | Una fila de fact_atencion |
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
| ID de agrupación | `tipo` |
| Nombre de agrupación | Tipo de atención |
| Campo de agrupación | `Base · web_fact_atencion.tipo_atencion` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Eventos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencias: cita_general 3.013, urgencia 559, hospitalizacion 893, remision 16.742. Un aumento después de un cruce suele indicar una clave derecha duplicada; no lo ocultes deduplicando al final.

### 5.7. Esperas negativas conservadas

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_atencion`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_atencion`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.7 — Esperas negativas conservadas |
| Qué representa una fila | Una fila de fact_atencion |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

En **Filtros · todas las condiciones (AND)** pulsa **Agregar filtro** una vez por fila y completa:

| Columna de filtro | Operador | Valor / inicio y fin |
| --- | --- | --- |
| `Base · web_fact_atencion.espera_negativa` | EQ | `true` |

Escribe los valores sin comillas. Las condiciones se cumplen simultáneamente. `BETWEEN` incluye ambos días; `LT` significa “menor que”, `LTE` “menor o igual”, `EQ` “igual a”. En filtros booleanos, `true` se selecciona como **Sí** y `false` como **No**. Los marcadores entre `< >` se sustituyen por valores copiados de la bodega.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Pulsa **Agregar agrupación** y configura:

| Campo | Valor |
| --- | --- |
| ID de agrupación | `tipo` |
| Nombre de agrupación | Tipo de atención |
| Campo de agrupación | `Base · web_fact_atencion.tipo_atencion` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Eventos con espera negativa | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 497, todas remisiones. Se conservan en hechos y se excluyen solo al calcular duración válida; no usar valor absoluto de la espera.

### 5.8.A. Total de pagos del origen

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL del origen **`colombia_saludable`** con host, puerto, usuario y contraseña del origen. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.pagos`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.pagos`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.8.A — Total de pagos del origen |
| Qué representa una fila | Una fila de pagos |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `total_pagado` | Total pagado | `SUM` | `Base · pagos.valor_pagado` | `origen_money` | Grupo actual |
| `filas` | Pagos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Guarda los dos valores exactos del origen. No hay filtros, relaciones ni agrupaciones: la conciliación compara toda la carga. Referencias: 22.938 pagos y 8.548.421.149,00 unidades monetarias del origen.

### 5.8.B. Total de pagos cargados

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_pago`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_pago`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.8.B — Total de pagos cargados |
| Qué representa una fila | Una fila de fact_pago |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `total_aporte` | Total de aportes | `SUM` | `Base · web_fact_pago.valor_aporte` | `origen_money` | Grupo actual |
| `filas` | Pagos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `ids` | Transacciones distintas | `COUNT_DISTINCT` | `Base · web_fact_pago.id_transaccion` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Compara SUM(valor_aporte) con SUM(pagos.valor_pagado) de 5.8.A: deben coincidir exactamente, incluidos decimales; compara también filas (referencia 22.938). Conciliar significa comprobar esa igualdad. Si difieren, revisa filtros, conversiones, cruces y cambios de origen; no ajustes valores para forzar coincidencia.

### 5.9. Cabeceras de recetas

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_formula`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_formula`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.9 — Cabeceras de recetas |
| Qué representa una fila | Una fila de fact_formula |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Recetas | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `ids` | Fórmulas distintas | `COUNT_DISTINCT` | `Base · web_fact_formula.codigo_formula` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 7.484 en ambas medidas. Incluye recetas de un solo medicamento.

### 5.10. Presencias de medicamentos

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_puente_formula_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_puente_formula_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.10 — Presencias de medicamentos |
| Qué representa una fila | Una fila de puente_formula_medicamento |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Presencias | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `medicamentos` | Códigos distintos | `COUNT_DISTINCT` | `Base · web_puente_formula_medicamento.medicamento_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 15.770 presencias y 166 códigos. La PK conjunta codigo_formula + medicamento_id garantiza una presencia por pareja.

### 5.11. Códigos de medicamento

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_dim_medicamento`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_dim_medicamento`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.11 — Códigos de medicamento |
| Qué representa una fila | Una fila de dim_medicamento |
| Zona horaria del análisis | `America/Bogota` |

**2. Relaciones y filtros de Eventos a medir**

Deja **Relaciones** sin entradas.

Deja **Filtros** sin condiciones.

**3. Población y cohortes**

Deja **Población de referencia y denominadores** sin configurar y **Cohortes** sin entradas.

**4. Agrupaciones, medidas e indicadores**

Deja **Dimensiones y clasificaciones** sin agrupaciones.

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Códigos | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |
| `ids` | Códigos distintos | `COUNT_DISTINCT` | `Base · web_dim_medicamento.medicamento_id` | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 166 filas y 166 códigos distintos. No hay precios ni cantidades.

### 5.12. Destino de los retiros

**1. Abrir y configurar el análisis**

1. Abre la aplicación desplegada y entra en **Bodega de datos**. Introduce la conexión PostgreSQL de **`colombia_saludable_dw_core`** con host, puerto, usuario y contraseña de tu bodega. Si está en tu PC, activa **Usar agente local híbrido** y comprueba que el agente esté conectado; `localhost` se interpreta desde ese agente. Pulsa **Conectar y leer catálogo**.
2. Selecciona **`public.web_fact_retiro`** en la consulta sencilla y pulsa **Nuevo análisis avanzado**. En **Eventos a medir → Tabla de eventos a medir**, verifica **`public.web_fact_retiro`**. Haz la selección de tabla antes del resto: cambiarla restablece el formulario.
3. Selecciona **Patrón de análisis = Indicadores, tasas y medias por entidad** y completa:

| Campo | Valor |
| --- | --- |
| Título del análisis | 5.12 — Destino de los retiros |
| Qué representa una fila | Una fila de fact_retiro |
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
| ID de agrupación | `destino` |
| Nombre de agrupación | Destino informado |
| Campo de agrupación | `Base · web_fact_retiro.destino_informado` |
| Período de agrupación | `Valor exacto` |
| Edad a fecha de agrupación | Sin configurar |
| Edad a corte fijo de agrupación | Sin configurar |

En **Medidas y componentes**, edita el componente inicial y pulsa **Agregar componente** para las filas adicionales. Completa también cada **Nombre**. Configura el alcance antes de seleccionar el valor, porque cambiarlo limpia la selección de columna.

| ID | Nombre | Agregación | Valor | Unidad | Alcance |
| --- | --- | --- | --- | --- | --- |
| `filas` | Retiros | `COUNT_ROWS` | No requiere columna | `count` | Grupo actual |

Escribe explícitamente cada unidad, aunque el formulario parezca mostrar un valor por defecto. Una unidad vacía (`unit: ""`) provoca error 422. En `COUNT_ROWS` no selecciones columna.

En las medidas que no son duraciones, deja **Multiplicar valor por** y **Fecha final** en **Sin configurar**. Deja vacías las **Condiciones propias** de cada componente: los filtros de este panel están en su selección.

Deja **Indicadores calculados** sin entradas.

**5. Calcular, revisar y guardar**

1. Deja **Completar calendario** sin configurar para el cálculo inicial.
2. En **Grupos a mostrar**, escribe **`20`**. En **Orden del análisis**, selecciona **Orden estable de dimensiones**. El límite acota grupos devueltos; no reduce las filas que cuenta el indicador global.
3. Pulsa **Calcular análisis**. Comprueba título, período, tabla y componentes en **Definición reproducible, filtros y denominadores**. Revisa cobertura, excluidos y truncamiento antes de interpretar.
4. En **Representación del análisis**, revisa la tabla de resultados. Cambiar de representación no repite la consulta; cambiar filtros exige calcular otra vez.
5. Si aparece **Resultado de una definición anterior**, el resultado visible conserva otra ejecución. Sube al inicio de Bodega de datos y lee **No se pudo completar la operación**; corrige el campo indicado, verifica unidades no vacías y fechas completas, y pulsa **Calcular análisis** otra vez. No uses la tabla anterior para validar este panel.
6. Descarga **este resultado JSON** y **esta tabla CSV**. Pulsa **Agregar esta definición al reporte**. El reporte admite hasta ocho paneles: exporta y guarda el lote antes de empezar otro. Los resultados exportados conservan el Top N y los límites de esta ejecución.

**Lectura del resultado:** Referencia: 48 true/Sí y 41 false/No, total 89. Desconocido no significa mora.

### 5.13. Cierre de la carga

Las transacciones son por tabla: si una falla, las anteriores pueden existir. Conserva los reportes confirmados y registra qué tabla quedó pendiente. Un estado unknown se contrasta con catálogo, restricciones y conteos antes de reintentar. Una repetición de fail sobre una tabla existente debe rechazarse; esta guía no prescribe vaciar el destino ni una recarga global.

## 6. Preparar claves de la bodega del cuaderno sin recargar filas

Este apartado se utiliza únicamente para tablas existentes **sin prefijo web_** cuando el catálogo actual carece de una PK/UNIQUE física necesaria para las relaciones. La evidencia del cuaderno documenta claves lógicas verificadas, sin restricciones físicas en aquella carga. Si la clave ya aparece en el catálogo actual, no hace falta preparar esa tabla.

No se prepara fact_atencion: sus agregados como tabla base no requieren PK y contiene columnas SQL TIME que el editor de esquema explícito no representa. No conviertas esas horas a texto ni omitas columnas para forzar un esquema.

### 6.1. Preparar `dim_ips`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.dim_ips`** existe y si ya muestra PK/UNIQUE **`ips_id`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.dim_ips` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **86 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Dimensión**, tabla destino **`dim_ips`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Una IPS`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `ips_id`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `ips_id` | text | string | Sí | No |
| `nombre` | text | string | No | Sí |
| `tipo_ips_original` | text | string | No | Sí |
| `nivel_original` | text | string | No | Sí |
| `municipio_original` | text | string | No | Sí |
| `departamento_original` | text | string | No | Sí |
| `tipo_ips` | text | string | No | Sí |
| `nivel` | text | string | No | Sí |
| `municipio` | text | string | No | Sí |
| `departamento` | text | string | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `ips_id`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `ips_id`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.dim_ips`, título `Control después de preparar dim_ips`, grano `Una IPS`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

### 6.2. Preparar `dim_empresa`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.dim_empresa`** existe y si ya muestra PK/UNIQUE **`empresa_id`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.dim_empresa` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **21 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Dimensión**, tabla destino **`dim_empresa`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Una empresa`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `empresa_id`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `empresa_id` | text | string | Sí | No |
| `nombre` | text | string | No | Sí |
| `actividad_economica_original` | text | string | No | Sí |
| `ciudad_original` | text | string | No | Sí |
| `total_empleados` | bigint | integer | No | Sí |
| `ciudad` | text | string | No | Sí |
| `actividad_economica` | text | string | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `empresa_id`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `empresa_id`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.dim_empresa`, título `Control después de preparar dim_empresa`, grano `Una empresa`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

### 6.3. Preparar `dim_paciente`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.dim_paciente`** existe y si ya muestra PK/UNIQUE **`paciente_id`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.dim_paciente` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **4.416 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Dimensión**, tabla destino **`dim_paciente`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Una persona distinguida por tipo de registro`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `paciente_id`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `paciente_id` | text | string | Sí | No |
| `usuario_origen` | text | string | No | Sí |
| `tipo_registro` | text | string | No | Sí |
| `tipo_documento_original` | text | string | No | Sí |
| `parentesco_original` | text | string | No | Sí |
| `sexo_original` | text | string | No | Sí |
| `fecha_nacimiento` | timestamp without time zone | datetime, zona horaria desmarcada | No | Sí |
| `estado_civil_original` | text | string | No | Sí |
| `tipo_discapacidad_original` | text | string | No | Sí |
| `familia_id` | text | string | No | Sí |
| `paciente_titular_id` | text | string | No | Sí |
| `empresa_id` | text | string | No | Sí |
| `ips_afiliacion_id` | text | string | No | Sí |
| `estrato_original` | text | string | No | Sí |
| `estrato_propio` | text | string | No | Sí |
| `estrato_familiar` | text | string | No | Sí |
| `tipo_cotizante_original` | text | string | No | Sí |
| `tipo_cotizante_propio` | text | string | No | Sí |
| `tipo_cotizante_titular` | text | string | No | Sí |
| `escolaridad_original` | text | string | No | Sí |
| `escolaridad_propia` | text | string | No | Sí |
| `proviene_otra_eps_original` | text | string | No | Sí |
| `proviene_otra_eps_propio` | boolean | boolean | No | Sí |
| `salario_base_propio` | bigint | integer | No | Sí |
| `fecha_afiliacion_propia` | timestamp without time zone | datetime, zona horaria desmarcada | No | Sí |
| `fecha_afiliacion_titular` | timestamp without time zone | datetime, zona horaria desmarcada | No | Sí |
| `perfil_familiar_heredado` | boolean | boolean | No | Sí |
| `sexo` | text | string | No | Sí |
| `estado_civil` | text | string | No | Sí |
| `tipo_discapacidad` | text | string | No | Sí |
| `atribucion_familiar_sin_historia` | boolean | boolean | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `paciente_id`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `paciente_id`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.dim_paciente`, título `Control después de preparar dim_paciente`, grano `Una persona distinguida por tipo de registro`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

### 6.4. Preparar `dim_fecha`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.dim_fecha`** existe y si ya muestra PK/UNIQUE **`fecha_id`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.dim_fecha` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **1.096 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Dimensión**, tabla destino **`dim_fecha`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Un día del calendario`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `fecha_id`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `fecha` | timestamp without time zone | datetime, zona horaria desmarcada | No | Sí |
| `anio` | integer | integer | No | Sí |
| `mes` | integer | integer | No | Sí |
| `dia` | integer | integer | No | Sí |
| `semana_anio` | bigint | integer | No | Sí |
| `dia_semana` | integer | integer | No | Sí |
| `nombre_dia` | text | string | No | Sí |
| `nombre_mes` | text | string | No | Sí |
| `trimestre` | integer | integer | No | Sí |
| `es_fin_de_semana` | boolean | boolean | No | Sí |
| `es_festivo` | boolean | boolean | No | Sí |
| `nombre_festivo` | text | string | No | Sí |
| `fecha_id` | text | string | Sí | No |
| `temporada_convencional` | text | string | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `fecha_id`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `fecha_id`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.dim_fecha`, título `Control después de preparar dim_fecha`, grano `Un día del calendario`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

### 6.5. Preparar `dim_diagnostico`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.dim_diagnostico`** existe y si ya muestra PK/UNIQUE **`diagnostico_id`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.dim_diagnostico` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **87 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Dimensión**, tabla destino **`dim_diagnostico`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Un texto diagnóstico normalizado`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `diagnostico_id`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `diagnostico_id` | text | string | Sí | No |
| `diagnostico_normalizado` | text | string | No | Sí |
| `grupo_textual` | text | string | No | Sí |
| `clase_texto` | text | string | No | Sí |
| `validado_clinicamente` | boolean | boolean | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `diagnostico_id`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `diagnostico_id`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.dim_diagnostico`, título `Control después de preparar dim_diagnostico`, grano `Un texto diagnóstico normalizado`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

### 6.6. Preparar `fact_formula`

1. En la aplicación desplegada abre **Bodega de datos**, conecta a PostgreSQL **`colombia_saludable_dw_core`** con sus credenciales, activa **Usar agente local híbrido** si la base está en tu equipo y pulsa **Conectar y leer catálogo**. Comprueba que **`public.fact_formula`** existe y si ya muestra PK/UNIQUE **`codigo_formula`**. Si ya tiene esa clave, termina esta preparación sin ejecutar una carga.
2. Si falta la clave, en **Extracción → Base de datos** conecta a esa misma bodega, selecciona `public.fact_formula` y procesa el origen. No selecciones `colombia_saludable`.
3. En **Transformación**, deja la receta vacía, sin proyecciones, conversiones ni cálculos. Actualiza la vista previa: referencia histórica **7.484 filas**. El contrato debe describir todas las columnas existentes.
4. En **Carga**, conecta a la misma bodega, elige **Hechos**, tabla destino **`fact_formula`** sin `public.`, y modo **Preparar estructura sin cargar filas (schema_only)**. Si usas agente, habilítalo también aquí con permiso de carga.
5. Pulsa **Configurar tipos y claves**. Escribe **Grano = `Una fórmula médica`**. Configura **todas** las columnas conforme a la tabla siguiente. Marca **Parte de PK** únicamente en `codigo_formula`, sin permitir nulos; conserva las demás como nullable. Mantén las restricciones ya existentes si el catálogo las muestra.

| Columna | Tipo SQL documentado | Tipo en Carga | Parte de PK | Permitir nulos |
| --- | --- | --- | --- | --- |
| `codigo_formula` | text | string | Sí | No |
| `medico_id` | text | string | No | Sí |
| `usuario_origen` | text | string | No | Sí |
| `fecha_formula` | date | date | No | Sí |
| `medicamentos_recetados_original` | text | string | No | Sí |
| `paciente_id` | text | string | No | Sí |
| `familia_id` | text | string | No | Sí |
| `empresa_id` | text | string | No | Sí |
| `ips_afiliacion_id` | text | string | No | Sí |
| `ips_medico_asociado_id` | text | string | No | Sí |
| `fecha_formula_id` | text | string | No | Sí |
| `edad_al_evento` | bigint | integer | No | Sí |
| `grupo_etario` | text | string | No | Sí |

6. Los tipos de la tabla corresponden al [diccionario documentado](planes_y_evidencia/carga_core/diccionario_bodega.csv). Si el catálogo vigente difiere, revisa su estructura antes de aplicar el contrato. No conviertas un timestamp existente a date ni agregues restricciones NOT NULL innecesarias. Deja Unidad vacía, UNIQUE, índices, FK físicas y comprobaciones adicionales sin entradas nuevas.
7. Marca **Permitir agregar restricciones verificadas a una tabla existente**. Pulsa **Aplicar esquema**, vuelve a **Transformación → Actualizar vista previa** y regresa a Carga. Comprueba que el modo siga siendo **schema_only**.
8. Pulsa **Revisar impacto sin escribir**. Debe proponer `preserve_schema` y la PK que falte (`add_primary_key`); no debe proponer `drop_table`, `create_table`, `delete_rows`, `append_rows` ni `insert_rows`. Si aparece crear una tabla vacía, revisa nombre/base y no ejecutes ese plan.
9. Ejecuta **Iniciar carga en bodega de datos**. Debe confirmar **cero filas enviadas** y el mismo total anterior/posterior. Ante duplicados/nulos de `codigo_formula`, detente y revisa el origen del problema; no borres filas para imponer una PK.
10. Vuelve a **Bodega de datos**, introduce la misma conexión y pulsa **Conectar y leer catálogo**. Comprueba la clave `codigo_formula`. Para el total, pulsa **Nuevo análisis avanzado**, selecciona `public.fact_formula`, título `Control después de preparar fact_formula`, grano `Una fórmula médica`, zona `America/Bogota`. Mantén patrón **Indicadores, tasas y medias por entidad**, sin relaciones, filtros, agrupaciones, población ni cohortes. Configura medida ID `filas`, nombre `Filas`, agregación **COUNT_ROWS**, unidad escrita `count`, alcance **Grupo actual**; deja valor/multiplicación/fecha final sin configurar, 20 grupos. Pulsa **Calcular análisis** y compara con el total previo, no solo con la referencia histórica.
11. Si el estado de preparación es **unknown**, revisa que el agente haya terminado y contrasta clave y conteo en el catálogo antes de reintentar. Mantén **schema_only** si falta la clave; no uses append, replace ni reload.
12. Guarda el reporte confirmado. Si vas a otra tabla, pulsa **Limpiar pipeline → Reiniciar e ir a Extracción**. No elimina tablas de la bodega.

## 7. Referencias y alcance de la documentación

- [Taller original](Taller_Colombia_Saludable.pdf).
- [Diagnóstico del origen](planes_y_evidencia/analisis_origen.md) y [diccionario original](planes_y_evidencia/diagnostico_pre_etl/diccionario_origen.csv).
- [Implementación del ETL del cuaderno](planes_y_evidencia/implementacion_etl_core.md), [modelo](planes_y_evidencia/carga_core/modelo_bodega.json) y [diccionario de la bodega](planes_y_evidencia/carga_core/diccionario_bodega.csv).
- [Contratos y capacidades de la aplicación](../docs/general-etl-analytics.md) y [agente híbrido](../docs/hybrid-load.md).
- [Respuestas del taller en la interfaz](GUIA_RESPUESTAS_TALLER_WEB.md) y [finalidad de cada tabla](DICCIONARIO_Y_PROPOSITO_TABLAS.md).

Las recetas son manuales por tabla. Trabajos ETL no admite las operaciones con expresiones Python de este recorrido; no se puede importar la guía íntegra como un job declarativo. Esta edición contrasta documentación, conversaciones y código; no ejecuta las cargas ni modifica bases de datos.
