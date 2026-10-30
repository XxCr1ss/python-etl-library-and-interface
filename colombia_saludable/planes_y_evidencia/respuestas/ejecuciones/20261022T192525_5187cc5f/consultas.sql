-- calidad_seleccion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COUNT(*) AS eventos,
 COUNT(DISTINCT paciente_id) AS pacientes_atendidos,COUNT(*) FILTER(WHERE espera_negativa) AS esperas_negativas,
 COUNT(*) FILTER(WHERE espera_incompleta) AS esperas_incompletas,
 COUNT(*) FILTER(WHERE espera_valida_min IS NOT NULL) AS esperas_validas,
 COUNT(*) FILTER(WHERE tarifa_informada) AS eventos_con_tarifa,
 ROUND(100.0*COUNT(*) FILTER(WHERE tarifa_informada)/NULLIF(COUNT(*),0),2) AS cobertura_tarifa_pct FROM A;

-- totales_seleccion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT (SELECT COUNT(*) FROM S) AS solicitudes,
 (SELECT COUNT(*) FROM F) AS formulas,(SELECT COUNT(*) FROM P) AS pagos,
 (SELECT SUM(valor_aporte)::text FROM P) AS aportes,(SELECT COUNT(*) FROM R) AS retiros;

-- p01_esperas
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT
 CASE WHEN tipo_atencion='cita_general' THEN 'Cita general' ELSE 'Cirugía (remisión)' END AS servicio,
 COUNT(*) AS eventos,COUNT(espera_valida_min) AS validos,
 COUNT(*)-COUNT(espera_valida_min) AS excluidos,
 ROUND(AVG(espera_valida_min),2) AS media_min,
 ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY espera_valida_min))::numeric,2) AS mediana_min,
 ROUND((PERCENTILE_CONT(0.9) WITHIN GROUP(ORDER BY espera_valida_min))::numeric,2) AS p90_min
 FROM A WHERE tipo_atencion='cita_general' OR tipo_servicio='cirugia' GROUP BY 1 ORDER BY 1;

-- p01_distribucion_espera
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT
 CASE WHEN tipo_atencion='cita_general' THEN 'Cita general' ELSE 'Cirugía (remisión)' END AS servicio,
 CASE WHEN espera_valida_min<60 THEN 1 WHEN espera_valida_min<360 THEN 2 WHEN espera_valida_min<1440 THEN 3
 WHEN espera_valida_min<4320 THEN 4 WHEN espera_valida_min<10080 THEN 5 WHEN espera_valida_min<20160 THEN 6 ELSE 7 END AS tramo,
 COUNT(*) AS eventos FROM A WHERE espera_valida_min IS NOT NULL
 AND (tipo_atencion='cita_general' OR tipo_servicio='cirugia') GROUP BY 1,2 ORDER BY 1,2;

-- p02_prestadores
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT ips_nombre AS prestador,departamento,municipio,
 COUNT(*) AS eventos,COUNT(DISTINCT paciente_id) AS pacientes FROM A GROUP BY 1,2,3 ORDER BY eventos DESC,prestador;

-- p02_aportes_afiliado
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT ROW_NUMBER() OVER(ORDER BY SUM(valor_aporte) DESC) AS posicion,
 COUNT(*) AS transacciones,SUM(valor_aporte)::text AS aporte_total FROM P GROUP BY paciente_id ORDER BY SUM(valor_aporte) DESC;

-- p02_aportes_familia
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT ROW_NUMBER() OVER(ORDER BY z.aporte DESC) AS posicion,
 z.transacciones,z.aporte::text AS aporte_total,d.numero_miembros
 FROM (SELECT familia_id,COUNT(*) AS transacciones,SUM(valor_aporte) AS aporte FROM P GROUP BY familia_id) z
 JOIN public.dim_familia d ON d.familia_id=z.familia_id ORDER BY z.aporte DESC;

-- p02_aportes_empresa
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(e.nombre,'Sin empresa registrada') AS empresa,
 COUNT(*) AS transacciones,COUNT(DISTINCT p.paciente_id) AS cotizantes,SUM(p.valor_aporte)::text AS aporte_total
 FROM P p LEFT JOIN public.dim_empresa e ON e.empresa_id=p.empresa_id GROUP BY 1 ORDER BY SUM(p.valor_aporte) DESC;

-- p02_aportes_municipio
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT municipio,COUNT(*) AS transacciones,SUM(valor_aporte)::text AS aporte_total FROM P GROUP BY 1 ORDER BY SUM(valor_aporte) DESC;

-- p02_aportes_departamento
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT departamento,COUNT(*) AS transacciones,SUM(valor_aporte)::text AS aporte_total FROM P GROUP BY 1 ORDER BY SUM(valor_aporte) DESC;

-- p02_tarifa_familiar
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT ROW_NUMBER() OVER(ORDER BY SUM(tarifa_servicio_catalogo) DESC) AS posicion,
 COUNT(*) AS remisiones,COUNT(DISTINCT paciente_id) AS miembros_con_remision,SUM(tarifa_servicio_catalogo)::text AS tarifa_total
 FROM A WHERE tarifa_informada GROUP BY familia_id ORDER BY SUM(tarifa_servicio_catalogo) DESC;

-- p03_tarifa_estrato_familiar
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(estrato_familiar,'desconocido') AS segmento,
 COUNT(*) AS remisiones,COUNT(DISTINCT paciente_id) AS pacientes,SUM(tarifa_servicio_catalogo)::text AS tarifa_total,
 ROUND(AVG(tarifa_servicio_catalogo),2)::text AS tarifa_media_evento FROM A WHERE tarifa_informada GROUP BY 1 ORDER BY SUM(tarifa_servicio_catalogo) DESC;

-- p03_tarifa_tipo_cotizante_titular
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(tipo_cotizante_titular,'desconocido') AS segmento,
 COUNT(*) AS remisiones,COUNT(DISTINCT paciente_id) AS pacientes,SUM(tarifa_servicio_catalogo)::text AS tarifa_total,
 ROUND(AVG(tarifa_servicio_catalogo),2)::text AS tarifa_media_evento FROM A WHERE tarifa_informada GROUP BY 1 ORDER BY SUM(tarifa_servicio_catalogo) DESC;

-- p03_tarifa_grupo_etario_atencion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(grupo_etario_atencion,'desconocido') AS segmento,
 COUNT(*) AS remisiones,COUNT(DISTINCT paciente_id) AS pacientes,SUM(tarifa_servicio_catalogo)::text AS tarifa_total,
 ROUND(AVG(tarifa_servicio_catalogo),2)::text AS tarifa_media_evento FROM A WHERE tarifa_informada GROUP BY 1 ORDER BY SUM(tarifa_servicio_catalogo) DESC;

-- p03_frecuencia_medicamentos
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT b.medicamento_id AS codigo,
 COUNT(DISTINCT f.codigo_formula) AS recetas,ROUND(100.0*COUNT(DISTINCT f.codigo_formula)/NULLIF((SELECT COUNT(*) FROM F),0),2) AS recetas_pct
 FROM F f JOIN public.puente_formula_medicamento b ON b.codigo_formula=f.codigo_formula GROUP BY b.medicamento_id ORDER BY recetas DESC,codigo;

-- p04_coformulacion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT b1.medicamento_id AS codigo_a,b2.medicamento_id AS codigo_b,
 COUNT(*) AS recetas_juntas,ROUND(100.0*COUNT(*)/NULLIF((SELECT COUNT(*) FROM F),0),2) AS soporte_pct
 FROM F f JOIN public.puente_formula_medicamento b1 ON b1.codigo_formula=f.codigo_formula
 JOIN public.puente_formula_medicamento b2 ON b2.codigo_formula=f.codigo_formula AND b1.medicamento_id<b2.medicamento_id
 GROUP BY 1,2 ORDER BY recetas_juntas DESC,codigo_a,codigo_b;

-- p05_utilizacion_global
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COUNT(*) AS eventos,
 COUNT(DISTINCT paciente_id) AS pacientes_atendidos,
 ROUND(COUNT(*)::numeric/NULLIF(COUNT(DISTINCT paciente_id),0),4) AS eventos_por_atendido FROM A;

-- p05_utilizacion_sexo
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(sexo,'desconocido') AS grupo,
 COUNT(*) AS eventos,COUNT(DISTINCT paciente_id) AS pacientes_atendidos,
 ROUND(COUNT(*)::numeric/NULLIF(COUNT(DISTINCT paciente_id),0),4) AS eventos_por_atendido FROM A
 GROUP BY 1 ORDER BY eventos DESC;

-- p05_utilizacion_grupo_etario_atencion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(grupo_etario_atencion,'desconocido') AS grupo,
 COUNT(*) AS eventos,COUNT(DISTINCT paciente_id) AS pacientes_atendidos,
 ROUND(COUNT(*)::numeric/NULLIF(COUNT(DISTINCT paciente_id),0),4) AS eventos_por_atendido FROM A
 GROUP BY 1 ORDER BY eventos DESC;

-- p05_utilizacion_tipo_atencion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COALESCE(tipo_atencion,'desconocido') AS grupo,
 COUNT(*) AS eventos,COUNT(DISTINCT paciente_id) AS pacientes_atendidos,
 ROUND(COUNT(*)::numeric/NULLIF(COUNT(DISTINCT paciente_id),0),4) AS eventos_por_atendido FROM A
 GROUP BY 1 ORDER BY eventos DESC;

-- p05_utilizacion_registrados
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, usos AS (
       SELECT paciente_id,COUNT(*) AS n FROM A GROUP BY paciente_id)
       SELECT COUNT(*) AS afiliados_registrados,COUNT(*) FILTER(WHERE u.n IS NULL) AS sin_eventos,
       SUM(COALESCE(u.n,0)) AS eventos,ROUND(AVG(COALESCE(u.n,0)),4) AS eventos_por_registrado
       FROM public.dim_paciente p LEFT JOIN usos u ON u.paciente_id=p.paciente_id WHERE TRUE ;

-- p06_temporadas
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, cal AS (
 SELECT temporada_convencional AS temporada,COUNT(*) AS dias_calendario FROM D GROUP BY 1),
 act AS (SELECT d.temporada_convencional AS temporada,COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes
         FROM A a JOIN public.dim_fecha d ON d.fecha_id=a.fecha_atencion_id GROUP BY 1)
 SELECT c.temporada,c.dias_calendario,COALESCE(a.eventos,0) AS eventos,COALESCE(a.pacientes,0) AS pacientes,
 ROUND(COALESCE(a.eventos,0)::numeric/c.dias_calendario,3) AS eventos_por_dia_calendario
 FROM cal c LEFT JOIN act a USING(temporada) ORDER BY eventos_por_dia_calendario DESC;

-- p06_hospitales
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT a.ips_nombre AS hospital,d.temporada_convencional AS temporada,
 COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes
 FROM A a JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
 JOIN public.dim_fecha d ON d.fecha_id=a.fecha_atencion_id WHERE i.tipo_ips='hospital'
 GROUP BY 1,2 ORDER BY eventos DESC,hospital;

-- p06_medicos
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, base AS (
 SELECT a.medico_id,d.temporada_convencional AS temporada,COUNT(*) AS eventos
 FROM A a JOIN public.dim_fecha d ON d.fecha_id=a.fecha_atencion_id GROUP BY 1,2),
 ranking AS (SELECT medico_id,ROW_NUMBER() OVER(ORDER BY SUM(eventos) DESC,medico_id) AS posicion FROM base GROUP BY medico_id)
 SELECT r.posicion,b.temporada,b.eventos FROM base b JOIN ranking r USING(medico_id) ORDER BY r.posicion,b.temporada;

-- p06_estancia
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COUNT(*) AS hospitalizaciones,
 MIN(duracion_hospitalizacion) AS minimo,MAX(duracion_hospitalizacion) AS maximo,
 ROUND(AVG(duracion_hospitalizacion),2) AS duracion_media_original FROM A WHERE tabla_origen='hospitalizaciones';

-- p07_meses
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, meses AS (SELECT DISTINCT TO_CHAR(fecha,'YYYY-MM') AS mes FROM D),
 at AS (SELECT TO_CHAR(fecha_atencion,'YYYY-MM') AS mes,COUNT(*) AS atenciones,
 COUNT(DISTINCT paciente_id) AS pacientes,COUNT(espera_valida_min) AS esperas_validas,
 ROUND(AVG(espera_valida_min),2) AS espera_media_min FROM A GROUP BY 1),
 sol AS (SELECT TO_CHAR(fecha_solicitud,'YYYY-MM') AS mes,COUNT(*) AS solicitudes FROM S GROUP BY 1),
 dx AS (SELECT TO_CHAR(a.fecha_atencion,'YYYY-MM') AS mes,COUNT(DISTINCT a.paciente_id) AS pacientes_dx_clasificado
 FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id) WHERE d.clase_texto='diagnostico_observado' GROUP BY 1)
 SELECT m.mes,COALESCE(s.solicitudes,0) AS solicitudes,COALESCE(a.atenciones,0) AS atenciones,
 COALESCE(a.pacientes,0) AS pacientes,COALESCE(a.esperas_validas,0) AS esperas_validas,a.espera_media_min,
 COALESCE(x.pacientes_dx_clasificado,0) AS pacientes_dx_clasificado
 FROM meses m LEFT JOIN at a USING(mes) LEFT JOIN sol s USING(mes) LEFT JOIN dx x USING(mes) ORDER BY m.mes;

-- p07_dias
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, dias AS (
 SELECT fecha::date AS fecha,dia_semana,nombre_dia FROM D), sol AS (
 SELECT fecha_solicitud AS fecha,COUNT(*) AS eventos FROM S GROUP BY 1)
 SELECT d.dia_semana,d.nombre_dia,COUNT(*) AS dias_calendario,SUM(COALESCE(s.eventos,0)) AS solicitudes,
 ROUND(AVG(COALESCE(s.eventos,0)),3) AS solicitudes_por_dia FROM dias d LEFT JOIN sol s USING(fecha)
 GROUP BY 1,2 ORDER BY solicitudes_por_dia DESC;

-- p07_mes_dia
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, sol AS (
 SELECT fecha_solicitud AS fecha,COUNT(*) AS eventos FROM S GROUP BY 1)
 SELECT d.mes,d.dia_semana,COUNT(*) AS dias_calendario,SUM(COALESCE(s.eventos,0)) AS solicitudes,
 ROUND(AVG(COALESCE(s.eventos,0)),3) AS solicitudes_por_dia
 FROM D d LEFT JOIN sol s ON s.fecha=d.fecha::date GROUP BY 1,2 ORDER BY 1,2;

-- p08_estimacion_tarifa
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COUNT(*) AS eventos_totales,
 COUNT(DISTINCT paciente_id) AS pacientes_atendidos,COUNT(tarifa_servicio_catalogo) AS remisiones_tarifadas,
 COUNT(DISTINCT paciente_id) FILTER(WHERE tarifa_informada) AS pacientes_con_tarifa,
 SUM(tarifa_servicio_catalogo)::text AS tarifa_total,ROUND(AVG(tarifa_servicio_catalogo),2)::text AS tarifa_media_remision,
 ROUND(SUM(tarifa_servicio_catalogo)/NULLIF(COUNT(DISTINCT paciente_id) FILTER(WHERE tarifa_informada),0),2)::text AS tarifa_por_paciente_con_tarifa,
 ROUND(100.0*COUNT(tarifa_servicio_catalogo)/NULLIF(COUNT(*),0),2) AS cobertura_eventos_pct FROM A;

-- p09_cohortes
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, cohortes AS (
 SELECT DISTINCT d.grupo_textual AS grupo,a.paciente_id FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id)
 WHERE d.clase_texto='diagnostico_observado' AND d.grupo_textual IN ('vih_sida','deficiencia_renal','cancer','diabetes')),
 directos AS (SELECT d.grupo_textual AS grupo,COUNT(*) AS eventos_diagnostico,
 COUNT(a.tarifa_servicio_catalogo) AS eventos_dx_tarifados,SUM(a.tarifa_servicio_catalogo) AS tarifa_eventos_diagnostico
 FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id) WHERE d.clase_texto='diagnostico_observado' GROUP BY 1)
 SELECT c.grupo,COUNT(DISTINCT c.paciente_id) AS pacientes_cohorte,COUNT(*) AS eventos_cohorte,
 COUNT(a.tarifa_servicio_catalogo) AS remisiones_tarifadas,
 COUNT(DISTINCT c.paciente_id) FILTER(WHERE a.tarifa_informada) AS pacientes_con_tarifa,
 SUM(a.tarifa_servicio_catalogo)::text AS tarifa_cohorte,
 ROUND(SUM(a.tarifa_servicio_catalogo)/NULLIF(COUNT(DISTINCT c.paciente_id) FILTER(WHERE a.tarifa_informada),0),2)::text AS tarifa_por_paciente_con_tarifa,
 MAX(d.eventos_diagnostico) AS eventos_diagnostico,MAX(d.eventos_dx_tarifados) AS eventos_dx_tarifados,
 MAX(d.tarifa_eventos_diagnostico)::text AS tarifa_eventos_diagnostico
 FROM cohortes c JOIN A a USING(paciente_id) JOIN directos d USING(grupo)
 GROUP BY c.grupo ORDER BY SUM(a.tarifa_servicio_catalogo) DESC NULLS LAST;

-- p10_demanda
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT departamento,COUNT(*) AS solicitudes,
 COUNT(DISTINCT paciente_id) AS pacientes_solicitantes FROM S GROUP BY 1 ORDER BY solicitudes DESC,departamento;

-- p10_retiros
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT COUNT(*) AS retiros,
 COUNT(*) FILTER(WHERE destino_informado) AS con_eps_destino,
 COUNT(*) FILTER(WHERE NOT destino_informado) AS destino_desconocido FROM R;

-- p11_cobertura
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT (SELECT COUNT(*) FROM F) AS formulas,
 COUNT(*) AS presencias_formula_codigo,COUNT(DISTINCT b.medicamento_id) AS codigos,
 COUNT(DISTINCT b.medicamento_id) FILTER(WHERE m.nombre IS NOT NULL) AS codigos_con_nombre,
 COUNT(DISTINCT b.medicamento_id) FILTER(WHERE m.precio IS NOT NULL) AS codigos_con_precio
 FROM F f JOIN public.puente_formula_medicamento b USING(codigo_formula)
 JOIN public.dim_medicamento m USING(medicamento_id);

-- p12_grupos
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT procedencia,COUNT(*) AS cotizantes FROM PC GROUP BY 1 ORDER BY 1;

-- p12_perfil
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, perfiles AS (
 SELECT p.procedencia,v.atributo,COALESCE(v.categoria,'desconocido') AS categoria,COUNT(*) AS cotizantes
 FROM PC p CROSS JOIN LATERAL (VALUES ('sexo',p.sexo),('estrato',p.estrato_propio),('tipo_cotizante',p.tipo_cotizante_propio),
 ('escolaridad',p.escolaridad_propia),('grupo_etario',p.grupo_corte)) v(atributo,categoria) GROUP BY 1,2,3)
 SELECT *,ROUND(100.0*cotizantes/SUM(cotizantes) OVER(PARTITION BY procedencia,atributo),2) AS grupo_pct
 FROM perfiles ORDER BY atributo,procedencia,cotizantes DESC,categoria;

-- p13_cobertura
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT d.clase_texto,COUNT(*) AS eventos,
 COUNT(DISTINCT a.paciente_id) AS pacientes FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id)
 GROUP BY 1 ORDER BY eventos DESC;

-- p13_frecuencia
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT d.grupo_textual AS grupo,
 COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id)
 WHERE d.clase_texto='diagnostico_observado' GROUP BY 1 ORDER BY pacientes DESC,eventos DESC;

-- p13_por_sexo
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT d.grupo_textual AS grupo,
 COALESCE(a.sexo,'desconocido') AS segmento,COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes
 FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id) WHERE d.clase_texto='diagnostico_observado'
 GROUP BY 1,2 ORDER BY grupo,pacientes DESC;

-- p13_por_grupo_etario_atencion
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT d.grupo_textual AS grupo,
 COALESCE(a.grupo_etario_atencion,'desconocido') AS segmento,COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes
 FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id) WHERE d.clase_texto='diagnostico_observado'
 GROUP BY 1,2 ORDER BY grupo,pacientes DESC;

-- p13_por_estrato_familiar
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT d.grupo_textual AS grupo,
 COALESCE(a.estrato_familiar,'desconocido') AS segmento,COUNT(*) AS eventos,COUNT(DISTINCT a.paciente_id) AS pacientes
 FROM A a JOIN public.dim_diagnostico d USING(diagnostico_id) WHERE d.clase_texto='diagnostico_observado'
 GROUP BY 1,2 ORDER BY grupo,pacientes DESC;

-- p14_destino
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT eps_destino,COUNT(*) AS retiros,
 COUNT(DISTINCT paciente_id) AS pacientes,ROUND(AVG(edad_al_retiro),2) AS edad_media_retiro,
 ROUND(AVG(dias_afiliacion_al_retiro),2) AS dias_afiliacion_media FROM R WHERE destino_informado
 GROUP BY 1 ORDER BY retiros DESC,eps_destino;

-- p14_perfil
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
, perfiles AS (
 SELECT CASE WHEN r.destino_informado THEN 'Cambio informado' ELSE 'Destino desconocido' END AS grupo_retiro,
 v.atributo,COALESCE(v.categoria,'desconocido') AS categoria,COUNT(*) AS retiros
 FROM R r CROSS JOIN LATERAL (VALUES ('sexo',r.sexo),('estrato',r.estrato_propio),
 ('tipo_cotizante',r.tipo_cotizante_propio),('grupo_etario',CASE WHEN (r.edad_al_retiro) IS NULL OR (r.edad_al_retiro)<0 THEN 'desconocido' WHEN (r.edad_al_retiro)<=4 THEN '0-4' WHEN (r.edad_al_retiro)<=14 THEN '5-14' WHEN (r.edad_al_retiro)<=24 THEN '15-24' WHEN (r.edad_al_retiro)<=44 THEN '25-44' WHEN (r.edad_al_retiro)<=64 THEN '45-64' ELSE '65+' END)) v(atributo,categoria)
 GROUP BY 1,2,3) SELECT *,ROUND(100.0*retiros/SUM(retiros) OVER(PARTITION BY grupo_retiro,atributo),2) AS grupo_pct
 FROM perfiles ORDER BY atributo,grupo_retiro,retiros DESC;

-- p14_resumen
WITH
 A AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_atencion BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 S AS (SELECT a.*,p.sexo,p.estrato_familiar,p.tipo_cotizante_titular,i.nombre AS ips_nombre,i.departamento,i.municipio
   FROM public.fact_atencion a JOIN public.dim_paciente p ON p.paciente_id=a.paciente_id
   JOIN public.dim_ips i ON i.ips_id=a.ips_medico_asociado_id
   WHERE a.fecha_solicitud BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 F AS (SELECT f.*,p.sexo,i.departamento,i.municipio FROM public.fact_formula f
   JOIN public.dim_paciente p ON p.paciente_id=f.paciente_id JOIN public.dim_ips i ON i.ips_id=f.ips_medico_asociado_id
   WHERE f.fecha_formula BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 P AS (SELECT v.*,p.sexo,i.departamento,i.municipio FROM public.fact_pago v
   JOIN public.dim_paciente p ON p.paciente_id=v.paciente_id JOIN public.dim_ips i ON i.ips_id=v.ips_afiliacion_id
   WHERE v.fecha_pago BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 R AS (SELECT r.*,p.sexo,p.estrato_propio,p.tipo_cotizante_propio,i.departamento,i.municipio FROM public.fact_retiro r
   JOIN public.dim_paciente p ON p.paciente_id=r.paciente_id JOIN public.dim_ips i ON i.ips_id=r.ips_afiliacion_id
   WHERE r.fecha_retiro BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 D AS (SELECT * FROM public.dim_fecha WHERE fecha::date BETWEEN DATE '2006-01-01' AND DATE '2008-12-31'),
 PC AS (SELECT p.*, EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int AS edad_corte,CASE WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int) IS NULL OR (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<0 THEN 'desconocido' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=4 THEN '0-4' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=14 THEN '5-14' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=24 THEN '15-24' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=44 THEN '25-44' WHEN (EXTRACT(YEAR FROM AGE(DATE '2008-12-09',p.fecha_nacimiento))::int)<=64 THEN '45-64' ELSE '65+' END AS grupo_corte,
   CASE WHEN p.proviene_otra_eps_propio IS TRUE THEN 'Proviene de otra EPS'
        WHEN p.proviene_otra_eps_propio IS FALSE THEN 'No proviene de otra EPS' ELSE 'Sin dato' END AS procedencia
   FROM public.dim_paciente p JOIN public.dim_ips i ON i.ips_id=p.ips_afiliacion_id
   WHERE p.tipo_registro='cotizante' AND p.fecha_afiliacion_propia::date<=DATE '2008-12-09'
     AND TRUE)
SELECT
 CASE WHEN destino_informado THEN 'Cambio informado' ELSE 'Destino desconocido' END AS grupo_retiro,
 COUNT(*) AS retiros,COUNT(DISTINCT paciente_id) AS pacientes,
 ROUND(AVG(edad_al_retiro),2) AS edad_media_retiro,ROUND(AVG(dias_afiliacion_al_retiro),2) AS dias_afiliacion_media
 FROM R GROUP BY 1 ORDER BY 1;