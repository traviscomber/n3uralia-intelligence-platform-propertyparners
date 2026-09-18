# Property Partners — Plan UAT contractual

Fecha base: 16 de agosto de 2026
Entorno objetivo: `https://ppartnersgroup.app`
Estado: PREPARADO — ejecución con usuarios Property Partners pendiente

## 1. Objetivo

Validar con usuarios autorizados de Property Partners que los tres pilares contractuales cumplen el flujo operativo esperado antes de la aceptación final:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión y Automatización de Reportes.

Este UAT valida resultados de negocio y operación dentro del alcance aprobado: ventas de casas en Vitacura. Departamentos y arriendos quedan fuera de los criterios de aceptación. No reemplaza QA técnico ni autoriza a inventar KPI, destinatarios, calendarios o reglas aún no aprobadas por el Cliente.

## 2. Roles UAT

Jerarquía funcional vigente:

- **Admin:** N3uralia / Travis. Sólo administración técnica.
- **CEO:** Pedro Pablo, último eslabón y validador final de negocio.
- **Director:** Director de Cuenta; revisa, devuelve y eleva.
- **Ejecutivo:** usuario comercial/operativo; prepara y ejecuta dentro de su alcance.

Cadena canónica de decisión:

**Ejecutivo → Director → Pedro Pablo.**

N3uralia prueba la plataforma y conserva evidencia técnica. Ejecutivo y Director ejecutan el proceso. **Pedro Pablo valida el resultado final de negocio de los tres pilares antes de la aceptación contractual.**

El criterio de **Business Intelligence / Gestión fue definido por Pedro Pablo**. Por tanto, la validación final de métricas, prioridades, rankings, alertas, reportes y lectura ejecutiva debe recaer en él; ninguna definición provisional se vuelve oficial sin su aprobación.

No usar cuentas compartidas. Cada participante debe ingresar con su propia cuenta autorizada.

## 3. Reglas de evidencia

Cada caso debe registrar:

- ID del caso UAT;
- participante y rol;
- fecha/hora;
- resultado: `PASS`, `FAIL` o `BLOCKED_EXTERNAL`;
- captura o referencia de evidencia cuando aplique;
- identificador del registro creado o consultado;
- defecto asociado, si existe;
- observación de negocio.

No usar `PASS` si el caso no fue ejecutado por el rol requerido.

## 4. Severidad de hallazgos

- **P0:** corrupción/pérdida de datos, bypass de autorización, operación irreversible insegura o plataforma inutilizable.
- **P1:** flujo contractual principal roto o resultado de negocio incorrecto.
- **P2:** degradación importante con workaround.
- **P3:** detalle menor de experiencia, copy o presentación.

Salida UAT aceptable: P0 = 0, P1 = 0; P2/P3 documentados y aceptados o con corrección acordada.

---

## 2.1 Regla de validación final

Los casos individuales pueden ser ejecutados por Director/Ejecutivo según corresponda, pero cada pilar termina con revisión de Pedro Pablo:

- **Mercado:** valida que fuentes, lectura y conclusiones representen correctamente la realidad comercial de Property Partners.
- **Valorización:** valida el expediente ya revisado por Director, aprueba con AAL2/MFA y emite el PDF final.
- **Business Intelligence / Gestión:** valida que la inteligencia, métricas, prioridades, rankings, alertas y reportes respondan al criterio que él definió.

Pedro Pablo no repite QA técnica. Recibe un producto ya probado por N3uralia y una operación ya preparada por los roles anteriores.

---

# Pilar 1 — Inteligencia de Mercado

## UAT-MKT-01 — Inventario actual

**Rol:** CEO / Director / Ejecutivo con acceso de mercado.

**Pasos**
1. Abrir `/dashboard/market`.
2. Confirmar fecha de corte/frescura visible.
3. Revisar oferta actual y propiedades canónicas.
4. Confirmar que la referencia histórica de Portal esté identificada como referencia y no como inventario vivo.

**Esperado**
- la pantalla carga sin error;
- la fecha de observación es visible;
- inventario vivo y referencia histórica se distinguen claramente;
- no se presenta dato faltante como cero inventado.

## UAT-MKT-02 — Casas en venta en Vitacura

**Rol:** Director / Ejecutivo.

**Pasos**
1. Filtrar exclusivamente casas en venta ubicadas en Vitacura.
2. Abrir al menos tres registros reales disponibles.
3. Verificar dirección, barrio, precio UF, superficie construida, terreno y programa cuando la fuente los entregue.
4. Confirmar fuente y fecha de observación.

**Esperado**
- los resultados corresponden a casas en venta en Vitacura;
- departamentos, proyectos y arriendos no forman parte de este caso de aceptación;
- los campos desconocidos permanecen N/D o equivalentes;
- no se mezclan atributos de otra propiedad;
- la fuente y fecha son trazables.

## UAT-MKT-03 — Barrios y KML

**Rol:** CEO / Director.

**Pasos**
1. Revisar clasificación territorial de Vitacura.
2. Abrir barrios/zonas relevantes.
3. Contrastar al menos tres propiedades conocidas por Property Partners.

**Esperado**
- las zonas se muestran con nomenclatura entendible;
- la asignación territorial coincide con la operación real o la observación queda registrada;
- no se crea asignación geográfica cuando falta evidencia.

## UAT-MKT-04 — Oferta vs ventas CBRS

**Rol:** CEO / Director.

**Pasos**
1. Abrir `/dashboard/market/inteligencia`.
2. Comparar oferta actual contra ventas/transactions CBRS disponibles.
3. Revisar UF/m², volumen y período.
4. Verificar que ventas confirmadas y oferta Portal estén semánticamente separadas.

**Esperado**
- la UI no presenta oferta como venta cerrada;
- la fuente CBRS queda identificada;
- los períodos y unidades son entendibles;
- valores faltantes se mantienen N/D.

## UAT-MKT-05 — Estado sin datos / dato desactualizado

**Rol:** Director.

**Pasos**
1. Navegar a una combinación sin cobertura suficiente, si existe.
2. Revisar mensajes de falta de evidencia o frescura.

**Esperado**
- el sistema no fabrica métricas;
- el estado vacío/desactualizado es explícito y accionable.

---

# Pilar 2 — Valorización de Propiedades

## UAT-VAL-01 — Identificación de propiedad

**Rol:** Ejecutivo.

**Pasos**
1. Abrir `/dashboard/valuation`.
2. Buscar una casa real en venta conocida por Property Partners y ubicada en Vitacura.
3. Confirmar sujeto, dirección, barrio, ROL, superficie construida, terreno y atributos disponibles.
4. Corregir únicamente datos actuales que correspondan.

**Esperado**
- la propiedad canónica puede identificarse;
- datos no disponibles no aparecen inventados;
- el flujo permite continuar sólo con los mínimos requeridos.

## UAT-VAL-02 — Comparables y decisión profesional

**Rol:** Ejecutivo.

**Pasos**
1. Ejecutar análisis de mercado.
2. Revisar comparables sugeridos.
3. Seleccionar mínimo 3 comparables trazables.
4. Excluir al menos uno indicando motivo cuando corresponda.
5. Confirmar tasa profesional o ancla válida.

**Esperado**
- la selección es humana;
- el sistema no avanza con menos de 3 comparables seleccionados;
- cada comparable mantiene fuente, referencia, dirección y valor trazable;
- la tasa no se adopta automáticamente sin confirmación humana.

## UAT-VAL-03 — Guardado y envío a revisión

**Rol:** Ejecutivo.

**Pasos**
1. Completar justificación profesional.
2. Guardar el caso.
3. Enviar a revisión.

**Esperado**
- se crea un expediente con ID estable;
- queda versión/historial;
- no puede aprobarse directamente por el Ejecutivo.

## UAT-VAL-04 — Devolución por Dirección

**Rol:** Director.

**Pasos**
1. Abrir el caso enviado a revisión.
2. Revisar evidencia y cálculo.
3. Devolver el caso indicando motivo.

**Esperado**
- sólo un rol autorizado puede devolver;
- el motivo es obligatorio;
- la devolución queda auditada;
- el Ejecutivo puede volver a trabajar la versión devuelta.

## UAT-VAL-05 — Corrección y reenvío

**Rol:** Ejecutivo.

**Pasos**
1. Abrir caso devuelto.
2. Aplicar la corrección acordada.
3. Reenviar a revisión.

**Esperado**
- la versión anterior no se pierde;
- la nueva versión conserva trazabilidad;
- el caso vuelve al estado de revisión correspondiente.

## UAT-VAL-06 — Aprobación CEO con MFA

**Rol:** CEO.

**Precondición:** sesión AAL2/MFA válida.

**Pasos**
1. Abrir caso en revisión apto para aprobación.
2. Revisar comparables, tasa, rango y justificación.
3. Aprobar.

**Esperado**
- sólo CEO puede aprobar;
- sin AAL2 la aprobación debe bloquearse;
- con AAL2 y evidencia válida el caso pasa a aprobado;
- queda auditado actor, fecha y versión.

## UAT-VAL-07 — Emisión, PDF e historial

**Rol:** CEO.

**Pasos**
1. Emitir caso aprobado.
2. Abrir reporte/PDF emitido.
3. Revisar valor, comparables y metodología.
4. Volver al expediente e inspeccionar historial/versiones.

**Esperado**
- sólo una valorización aprobada puede emitirse;
- el PDF se genera desde el snapshot exacto emitido;
- cambios posteriores de datos vivos no alteran el documento emitido;
- historial y decisiones permanecen trazables.

---

# Pilar 3 — Control de Gestión y Automatización de Reportes

## UAT-GES-01 — Visibilidad por rol

**Roles:** CEO, Director, Ejecutivo.

**Pasos**
1. Ingresar con cada rol.
2. Abrir superficies de control de gestión autorizadas.
3. Confirmar alcance de métricas/entidades.

**Esperado**
- CEO ve alcance global autorizado;
- Director ve sólo su alcance;
- Ejecutivo no accede a información de gestión fuera de su alcance;
- Admin técnico no se interpreta como rol organizacional del Cliente.

## UAT-GES-02 — Métricas y procedencia

**Rol:** CEO / Director.

**Pasos**
1. Revisar métricas disponibles.
2. Abrir procedencia/reconciliación donde exista.
3. Revisar estado de publicación.

**Esperado**
- métricas no aprobadas oficialmente permanecen provisionales;
- la UI no presenta un KPI provisional como definición contractual final;
- fuente/período/unidad son trazables cuando existen.

## UAT-GES-03 — Reporte manual

**Rol:** CEO / Director autorizado.

**Pasos**
1. Generar o abrir un reporte manual/persistido válido.
2. Revisar período, entidad, métricas y snapshot.
3. Abrir el PDF.

**Esperado**
- PDF coincide con el snapshot persistido;
- no depende de recalcular datos vivos al abrirlo;
- errores no exponen secretos ni trazas internas al usuario final.

## UAT-GES-04 — Programación recurrente bloqueada por dependencias

**Rol:** CEO.

**Precondición:** `kpi-dictionary` y/o `reporting-approval` siguen pendientes.

**Pasos**
1. Abrir `/dashboard/control/schedules`.
2. Intentar crear una programación.

**Esperado**
- la UI explica las dependencias pendientes;
- los controles permanecen deshabilitados;
- no se crea un schedule mientras KPI/reporting no estén aprobados o eximidos formalmente.

Resultado esperado actual: `PASS` si permanece bloqueado.

## UAT-GES-05 — Distribución controlada

**Rol:** CEO / Admin técnico.

**Estado inicial:** `BLOCKED_EXTERNAL` hasta contar con destinatarios y reglas aprobadas.

**Una vez aprobados:**
1. Registrar programación con destinatario autorizado.
2. Ejecutar entrega controlada.
3. Verificar recepción, asunto, PDF y provider message ID.

**Esperado**
- sólo destinatarios aprobados reciben el informe;
- queda evidencia de distribución y proveedor;
- retries no duplican silenciosamente el envío.

---

# 5. Matriz de ejecución

| ID | Pilar | Rol principal | Estado inicial |
|---|---|---|---|
| UAT-MKT-01 | Mercado | CEO/Director | READY |
| UAT-MKT-02 | Mercado | Director/Ejecutivo | READY |
| UAT-MKT-03 | Mercado | CEO/Director | READY |
| UAT-MKT-04 | Mercado | CEO/Director | READY |
| UAT-MKT-05 | Mercado | Director | READY |
| UAT-VAL-01 | Valorización | Ejecutivo | READY |
| UAT-VAL-02 | Valorización | Ejecutivo | READY |
| UAT-VAL-03 | Valorización | Ejecutivo | READY |
| UAT-VAL-04 | Valorización | Director | READY |
| UAT-VAL-05 | Valorización | Ejecutivo | READY |
| UAT-VAL-06 | Valorización | CEO + MFA | READY con cuenta autorizada |
| UAT-VAL-07 | Valorización | CEO + MFA | READY con cuenta autorizada |
| UAT-GES-01 | Gestión | CEO/Director/Ejecutivo | READY |
| UAT-GES-02 | Gestión | CEO/Director | READY |
| UAT-GES-03 | Gestión | CEO/Director | READY |
| UAT-GES-04 | Gestión | CEO | READY |
| UAT-GES-05 | Gestión | CEO/Admin | BLOCKED_EXTERNAL |

# 6. Datos UAT

Preferir datos reales conocidos por Property Partners y evitar contaminar operación.

- Valorización: usar una casa real identificable en Vitacura y registrar que el caso corresponde a UAT; no usar departamentos, arriendos ni fixtures.
- Mercado: sólo lectura; no modificar fuentes canónicas durante la sesión salvo que el caso UAT sea explícitamente administrativo.
- Gestión: no crear metas/KPI ficticios para hacer pasar la prueba.
- Reportes: no enviar a emails no aprobados.

# 7. Registro de defecto

Formato mínimo:

```text
ID: UAT-DEF-###
Caso UAT: UAT-...
Severidad: P0/P1/P2/P3
Rol:
Ambiente:
Pasos:
Esperado:
Actual:
Evidencia:
Registro/ID afectado:
Responsable corrección:
Estado: OPEN / FIXED / RETESTED / ACCEPTED
```

# 8. Acta de resultado por pilar

## Inteligencia de Mercado

- Casos ejecutados:
- PASS:
- FAIL:
- BLOCKED_EXTERNAL:
- P0/P1 abiertos:
- P2/P3 aceptados:
- Resultado: `ACCEPTED` / `CORRECTIONS_REQUIRED` / `NOT_EXECUTED`
- Aprobador Property Partners: Pedro Pablo
- Fecha:

## Valorización de Propiedades

- Casos ejecutados:
- PASS:
- FAIL:
- BLOCKED_EXTERNAL:
- P0/P1 abiertos:
- P2/P3 aceptados:
- Resultado: `ACCEPTED` / `CORRECTIONS_REQUIRED` / `NOT_EXECUTED`
- Aprobador Property Partners: Pedro Pablo
- Fecha:

## Control de Gestión y Reportes

- Casos ejecutados:
- PASS:
- FAIL:
- BLOCKED_EXTERNAL:
- P0/P1 abiertos:
- P2/P3 aceptados:
- Resultado: `ACCEPTED` / `CORRECTIONS_REQUIRED` / `NOT_EXECUTED`
- Aprobador Property Partners: Pedro Pablo
- Fecha:

# 9. Criterio de cierre de Fase 3

La Fase 3 puede cerrarse cuando:

1. los casos READY hayan sido ejecutados por roles autorizados;
2. P0 = 0 y P1 = 0;
3. P2/P3 estén corregidos, aceptados o programados sin afectar el flujo contractual;
4. cada pilar tenga aceptación o una lista cerrada de correcciones;
5. los casos `BLOCKED_EXTERNAL` estén vinculados a dependencias explícitas del Cliente y no se reporten como defectos del producto;
6. Pedro Pablo haya realizado la validación final de negocio de Mercado, Valorización y Business Intelligence/Gestión.

## Dependencias externas actualmente relevantes

- responsable y participantes UAT;
- fecha/ventana UAT;
- diccionario KPI oficial;
- metas/umbrales/reglas de ranking y alertas;
- calendario y destinatarios de reportes;
- formato/canales definitivos de distribución cuando apliquen.

Estas dependencias no autorizan a N3uralia a inventar datos para completar el UAT.
