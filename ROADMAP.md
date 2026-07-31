# Property Partners Intelligence Platform - Roadmap de programación y pruebas

Última actualización: 30 de julio de 2026, 23:46 CLT  
Período: 31 de julio al 25 de agosto de 2026  
Duración: 18 días hábiles  
Estado inicial: 98% de avance contractual estimado

## Objetivo del período

Completar el cierre funcional y de aceptación de la plataforma, corregir hallazgos de pruebas, consolidar la documentación de entrega y dejar la versión productiva preparada para validación final del Cliente.

El objetivo de 100% depende de dos condiciones externas:

1. Ejecución y aprobación del QA visual autenticado.
2. Entrega o aprobación por parte del Cliente de las definiciones de negocio y fuentes pendientes.

## Principios de ejecución

- Cada cambio debe quedar en `main`, con build aprobado y deployment `READY`.
- No se declarará una prueba como aprobada sin evidencia verificable.
- Las pruebas con datos QA deben ser reversibles y no alterar información real.
- Las métricas canónicas deben diferenciarse de la operación viva de Supabase.
- No se inventarán reglas de ranking, umbrales, captaciones ni fuentes faltantes.
- Todo defecto crítico o alto bloquea el cierre hasta su corrección y nueva prueba.

## Resultados esperados al día 18

- Tres vistas por perfil depuradas: CEO, dirección y ejecutiva.
- QA funcional, de autorización, RLS, responsive y accesibilidad documentado.
- Flujo completo propiedad - valorización - revisión - corrección - decisión validado.
- Reportes y PDF revisados.
- Matriz contrato/anexo actualizada con evidencia final.
- Documentación técnica, funcional y operativa consolidada.
- Lista formal de definiciones y documentos pendientes del Cliente.
- Acta de aceptación preparada para firma o registro de observaciones.

---

# Plan diario

## Día 1 - Viernes 31 de julio

### Objetivo
Establecer la línea base técnica y funcional del período.

### Programación
- Confirmar estado de `main`, deployments, alias productivo y variables de entorno.
- Revisar las tres vistas de personas y registrar componentes, APIs y fuentes de datos.
- Crear matriz de trazabilidad entre contrato, anexo, rutas, APIs y tablas.
- Identificar duplicaciones, datos sin fuente y reglas provisionales.

### Pruebas
- Smoke test público y autenticado de rutas críticas.
- Revisión de errores de build y runtime de las últimas 24 horas.
- Confirmación de cuentas QA y alcance sin modificar cuentas reales.

### Entregable
- Línea base del proyecto y backlog priorizado por severidad.

### Criterio de aceptación
- No existen fallos críticos desconocidos y cada pendiente tiene responsable, evidencia y prioridad.

---

## Día 2 - Lunes 3 de agosto

### Objetivo
Cerrar la arquitectura de datos visible en CEO, dirección y ejecutiva.

### Programación
- Consolidar la separación entre datos canónicos y datos operacionales vivos.
- Estandarizar etiquetas de período, procedencia, actualización y calidad de datos.
- Revisar estados vacíos y mensajes cuando no existe información operacional.
- Eliminar cualquier resumen duplicado restante.

### Pruebas
- Validar que cada perfil sólo reciba entidades autorizadas.
- Comparar resultados visibles con la fuente canónica y Supabase.

### Entregable
- Vistas por perfil con procedencia clara y sin duplicaciones funcionales.

### Criterio de aceptación
- Cada indicador visible identifica fuente, período y alcance.

---

## Día 3 - Martes 4 de agosto

### Objetivo
Validar y corregir la vista CEO.

### Programación
- Revisar consolidado global, oficinas, metas, MoM, YoY, evolución y cartera.
- Revisar centro de decisiones y enlaces a oficina, persona, caso, tarea y reporte.
- Marcar rankings y alertas como provisionales hasta definición oficial.
- Mejorar estados `n/d` y observaciones de calidad.

### Pruebas
- Validar totales globales y desglose por oficina.
- Validar navegación CEO - oficina - expediente - reporte.
- Validar ausencia de datos fuera de alcance.

### Entregable
- Vista CEO lista para aceptación funcional.

### Criterio de aceptación
- Los datos coinciden con las fuentes y las reglas no confirmadas están explícitamente identificadas.

---

## Día 4 - Miércoles 5 de agosto

### Objetivo
Validar y corregir la vista de dirección.

### Programación
- Revisar métricas de oficina y tabla de equipo.
- Revisar fichas individuales, tareas y valorizaciones en revisión.
- Verificar creación, actualización y cierre de tareas.
- Confirmar que la dirección sólo administra perfiles visibles de su oficina.

### Pruebas
- Ejecutar matriz positiva y negativa de oficina.
- Probar Lo Beltrán contra Nueva Costanera y Santa María.
- Validar que RLS bloquee lecturas y escrituras cruzadas.

### Entregable
- Vista dirección validada por alcance de oficina.

### Criterio de aceptación
- Ninguna lectura o escritura cruza el límite autorizado de oficina.

---

## Día 5 - Jueves 6 de agosto

### Objetivo
Validar y corregir la vista ejecutiva.

### Programación
- Revisar métricas personales, metas, YoY y procedencia.
- Revisar propiedades asignadas, valorizaciones, tareas y observaciones.
- Mostrar asignaciones pausadas con estado, sin ocultarlas del historial.
- Mejorar estados vacíos de perfiles sin operación vigente.

### Pruebas
- Validar aislamiento entre las tres ejecutivas QA.
- Confirmar que una ejecutiva no puede abrir tareas o casos de otra persona.
- Validar inicio y finalización de tareas propias.

### Entregable
- Vista ejecutiva lista para recorrido funcional.

### Criterio de aceptación
- Cada ejecutiva sólo visualiza y modifica su propia operación autorizada.

---

## Día 6 - Viernes 7 de agosto

### Objetivo
Cerrar el flujo de propiedades y asignaciones.

### Programación
- Revisar administración de propiedades y asignación por perfil y oficina.
- Mejorar validaciones de propiedad, responsable, estado y notas.
- Confirmar trazabilidad desde propiedad de mercado hasta asignación.
- Revisar tratamiento de identidad operacional versus identidad canónica.

### Pruebas
- Asignación válida dentro de la oficina con rollback.
- Rechazo de asignación cruzada por RLS.
- Validación de propiedades activas, pausadas y sin identidad confirmada.

### Entregable
- Flujo de asignación con evidencia de seguridad y trazabilidad.

### Criterio de aceptación
- Toda asignación válida queda trazada y toda asignación no autorizada es rechazada.

---

## Día 7 - Lunes 10 de agosto

### Objetivo
Cerrar el flujo de valorización inicial.

### Programación
- Revisar creación de caso desde propiedad asignada.
- Validar precarga de dirección, tipo, superficie y características.
- Revisar selección de comparables y ajustes.
- Confirmar cálculo de mediana ponderada, rango y confianza.

### Pruebas
- Crear un caso QA reversible.
- Probar mínimo de comparables, límites de ajuste y valores incompletos.
- Verificar persistencia de versión y metodología.

### Entregable
- Caso de valorización reproducible desde propiedad asignada.

### Criterio de aceptación
- El cálculo se reproduce con la misma evidencia y reglas documentadas.

---

## Día 8 - Martes 11 de agosto

### Objetivo
Cerrar revisión, devolución, corrección y reenvío.

### Programación
- Revisar cambios de estado permitidos.
- Validar devolución a borrador con motivo obligatorio.
- Confirmar creación o reapertura de tarea de corrección.
- Confirmar cierre de tarea al reenviar.

### Pruebas
- Ejecutar ciclo completo ejecutiva - dirección - ejecutiva.
- Probar transiciones inválidas y doble decisión.
- Verificar historial y versión del caso.

### Entregable
- Ciclo de corrección completo con trazabilidad.

### Criterio de aceptación
- No existe transición de estado sin autorización, motivo o registro histórico.

---

## Día 9 - Miércoles 12 de agosto

### Objetivo
Cerrar comparables e inteligencia de mercado.

### Programación
- Revisar selector de propiedades de mercado como comparables.
- Confirmar referencia, fecha observada, precio, UF/m² y notas de ajuste.
- Diferenciar publicación observada de venta confirmada.
- Revisar backlog de identidad y datos faltantes de barrio.

### Pruebas
- Añadir y retirar comparable en transacción reversible.
- Probar propiedad sin identidad canónica.
- Validar que no se presente publicación como compraventa confirmada.

### Entregable
- Flujo mercado - comparable - valorización validado.

### Criterio de aceptación
- Cada comparable conserva evidencia de origen y estado de identidad.

---

## Día 10 - Jueves 13 de agosto

### Objetivo
Cerrar reportes y documentos imprimibles.

### Programación
- Revisar reporte de valorización y reporte ejecutivo.
- Mejorar saltos de página, tablas, títulos y secciones imprimibles.
- Confirmar metodología, evidencia, historial y justificación final.
- Revisar salida PDF desde navegador.

### Pruebas
- Generar PDF de un caso QA.
- Comparar valores del reporte contra el expediente.
- Revisar ausencia de texto cortado, solapamientos y páginas vacías.

### Entregable
- Reporte PDF listo para presentación y archivo.

### Criterio de aceptación
- El PDF contiene la misma información del expediente y es legible en impresión.

---

## Día 11 - Viernes 14 de agosto

### Objetivo
Completar seguridad y regresión de APIs.

### Programación
- Auditar APIs de administración, perfiles, reportes y configuración.
- Reemplazar guards heredados por capacidades centrales donde corresponda.
- Revisar validaciones de URL, texto, identificadores y estados.
- Confirmar que `team` y `role` no sean editables por el usuario.

### Pruebas
- Pruebas 401, 403, 404 y validación de payload.
- Matriz de roles CEO, dirección y ejecutiva.
- Verificación de service role sólo detrás de autorización central.

### Entregable
- Inventario de APIs críticas con evidencia de autorización.

### Criterio de aceptación
- Ninguna API crítica depende de validación de rol local o datos enviados por el cliente.

---

## Día 12 - Lunes 17 de agosto

### Objetivo
Ejecutar QA visual autenticado de escritorio.

### Programación
- Configurar Secrets QA fuera del repositorio.
- Ejecutar workflow manual de Puppeteer.
- Capturar CEO, dirección y ejecutivas en escritorio.
- Registrar consola, errores de página, estructura semántica y overflow.

### Pruebas
- Login y navegación completa por perfil.
- Revisión de dashboard, tablas, formularios, expediente y PDF.
- Registro de hallazgos con severidad y captura.

### Entregable
- Artefacto de QA visual y manifiesto de resultados.

### Criterio de aceptación
- No existen defectos críticos de uso en escritorio.

### Dependencia
- Secrets QA configurados en GitHub Actions o ejecución equivalente segura.

---

## Día 13 - Martes 18 de agosto

### Objetivo
Completar QA responsive y accesibilidad básica.

### Programación
- Corregir hallazgos de escritorio.
- Revisar navegación móvil y tableta.
- Corregir overflow, tablas, menús y formularios.
- Mejorar nombres accesibles, roles, alertas y foco visible.

### Pruebas
- Viewports móvil, tableta y escritorio.
- Navegación con teclado.
- Zoom 200% y orden de foco.
- Auditoría de controles sin nombre y estructura `main`/`h1`.

### Entregable
- Evidencia responsive y accesibilidad corregida.

### Criterio de aceptación
- No hay bloqueo de navegación, contenido inaccesible ni overflow crítico.

---

## Día 14 - Miércoles 19 de agosto

### Objetivo
Ejecutar pruebas integrales end-to-end.

### Programación
- Preparar escenarios contractuales por perfil.
- Automatizar los flujos que sean estables.
- Corregir errores de integración entre módulos.

### Pruebas
- CEO: consolidado - oficina - ejecutiva - caso - reporte.
- Dirección: alerta - tarea - revisión - devolución - aprobación.
- Ejecutiva: asignación - valorización - comparables - reenvío.
- Verificar que los datos QA sean revertidos o identificados.

### Entregable
- Matriz E2E con resultado y evidencia por escenario.

### Criterio de aceptación
- Todos los escenarios críticos terminan sin error y respetan alcance y trazabilidad.

---

## Día 15 - Jueves 20 de agosto

### Objetivo
Cerrar calidad de datos y reglas de negocio.

### Programación
- Revisar diccionario de KPI y reglas derivadas.
- Implementar reglas oficiales recibidas del Cliente.
- Mantener `n/d` cuando no exista fuente confirmada.
- Revisar período, moneda, UF, metas y comparaciones.

### Pruebas
- Recalcular indicadores con casos conocidos.
- Comparar cifras con presentaciones y fuentes aprobadas.
- Validar captaciones sólo si existe fuente separada.

### Entregable
- Diccionario final de KPI y reglas implementadas o marcadas como pendientes.

### Criterio de aceptación
- Ningún indicador se presenta como oficial sin definición y fuente aprobadas.

### Dependencias del Cliente
- Regla oficial de ranking.
- Umbrales oficiales de alertas.
- Definición y fuente de captaciones brutas.
- Metas y fórmulas oficiales por rol y oficina.

---

## Día 16 - Viernes 21 de agosto

### Objetivo
Consolidar documentación técnica, funcional y operativa.

### Programación
- Actualizar arquitectura, modelo de datos, RLS y matriz de capacidades.
- Documentar despliegue, variables, integraciones y recuperación.
- Actualizar manuales por perfil.
- Consolidar runbooks de QA y soporte.

### Pruebas
- Validar que los documentos correspondan a la versión productiva.
- Probar instrucciones de despliegue y recuperación en ambiente seguro.

### Entregable
- Paquete documental versionado.

### Criterio de aceptación
- Un tercero autorizado puede comprender, operar y mantener la solución con la documentación entregada.

---

## Día 17 - Lunes 24 de agosto

### Objetivo
Preparar aceptación del Cliente y liberación final.

### Programación
- Congelar alcance de la versión candidata.
- Corregir últimos hallazgos críticos y altos.
- Preparar acta de aceptación y lista de observaciones.
- Crear respaldo de configuración y migraciones.

### Pruebas
- Regresión completa de rutas críticas.
- Revisión de build, TypeScript, migrations y runtime.
- Validación del deployment candidato y alias.

### Entregable
- Release candidate y paquete de aceptación.

### Criterio de aceptación
- Cero defectos críticos o altos abiertos; defectos medios documentados y aceptados.

---

## Día 18 - Martes 25 de agosto

### Objetivo
Cerrar el período y entregar la versión final.

### Programación
- Incorporar observaciones finales aprobadas.
- Actualizar `ROADMAP.md`, checklist y acta ejecutiva.
- Etiquetar commit o release final.
- Confirmar producción y plan de soporte.

### Pruebas
- Smoke test posterior al deployment.
- Revisión de logs de runtime.
- Confirmación de permisos, RLS y rutas principales.
- Verificación final de documentos y enlaces.

### Entregable
- Versión final productiva, paquete documental y acta de cierre o lista formal de dependencias pendientes.

### Criterio de aceptación
- Plataforma estable en producción y aceptación registrada, o cierre condicionado exclusivamente a entregables pendientes del Cliente.

---

# Hitos de control

| Hito | Fecha | Resultado esperado |
|---|---|---|
| H1 | 6 de agosto | Tres vistas por perfil funcionalmente depuradas |
| H2 | 13 de agosto | Flujo completo de valorización y reporte validado |
| H3 | 19 de agosto | QA visual, responsive y E2E ejecutado |
| H4 | 21 de agosto | Documentación y reglas de negocio consolidadas |
| H5 | 25 de agosto | Release final y aceptación preparada |

# Indicadores de avance

| Indicador | Meta al día 18 |
|---|---:|
| Build y TypeScript | 100% aprobados |
| Deployments productivos | 100% `READY` |
| Casos críticos E2E | 100% aprobados |
| Matriz de autorización/RLS | 100% aprobada |
| QA visual de perfiles | 100% ejecutado |
| Defectos críticos abiertos | 0 |
| Defectos altos abiertos | 0 |
| Documentación técnica y funcional | 100% actualizada |
| Requerimientos contractuales implementables | 100% cubiertos |

# Documentación y definiciones requeridas del Cliente

Para completar el proyecto sin supuestos y dejar todas las reglas perfectamente definidas, el Cliente debe entregar o aprobar:

1. **Diccionario oficial de KPI**: nombre, fórmula, fuente, frecuencia, responsable, meta y tratamiento de valores faltantes.
2. **Regla oficial de ranking**: métricas consideradas, ponderaciones, desempates, período y exclusiones.
3. **Umbrales de alertas**: valores de advertencia y criticidad para cierres, UF, cartera, seguimiento, conversión, tareas y valorizaciones.
4. **Definición de captaciones brutas**: eventos incluidos, exclusiones, fecha de reconocimiento y fuente oficial.
5. **Metas oficiales**: compañía, oficina, dirección y ejecutiva, con vigencia y periodicidad.
6. **Fuentes de mercado aprobadas**: publicaciones, ventas confirmadas, CBR, archivos de terceros y condiciones de uso.
7. **Reglas de valorización**: zonas, comparables válidos, antigüedad máxima, ajustes permitidos, ponderaciones y aprobaciones.
8. **KML o delimitación geográfica oficial** de oficinas, barrios, zonas y subzonas.
9. **Matriz final de usuarios y roles**: CEO, administración, directores, subdirectores, ejecutivas y reemplazos.
10. **Cuenta o identidad QA de subdirector**, sólo si se requiere aceptación diferenciada.
11. **Calendario de reportes**: destinatarios, periodicidad, canal, formato, horario y responsable.
12. **Reglas de notificación y escalamiento**: quién recibe alertas, plazos, reintentos y vencimientos.
13. **Criterios de aceptación UAT** y representantes autorizados para aprobar cada módulo.
14. **Política de conservación de datos**: retención, archivo, eliminación, respaldo y recuperación.
15. **Política de privacidad y tratamiento de datos personales** aplicable a usuarios, clientes, propiedades y contactos.
16. **Credenciales o accesos de integraciones** pendientes, entregados por un canal seguro y no versionado.
17. **Identidad visual final**: logos, tipografías, colores, plantillas de correo, PDF y presentación, cuando corresponda.
18. **Datos contractuales y administrativos faltantes**: responsables, fechas, anexos, costos de terceros y procedimiento formal de aceptación.

## Regla para dependencias del Cliente

Cuando una definición no haya sido entregada o aprobada:

- la plataforma mantendrá la regla provisional claramente identificada;
- la métrica podrá mostrarse como `n/d` cuando no exista fuente válida;
- el pendiente no se considerará defecto técnico;
- el cierre quedará condicionado a la entrega o aprobación correspondiente.

# Gestión de defectos

| Severidad | Definición | Tratamiento |
|---|---|---|
| Crítica | Pérdida de datos, acceso no autorizado, caída productiva o cálculo materialmente incorrecto | Corrección inmediata; bloquea release |
| Alta | Flujo contractual principal inutilizable o información clave incorrecta | Corrección antes de aceptación |
| Media | Función secundaria degradada con alternativa disponible | Planificada y documentada |
| Baja | Ajuste visual, texto o mejora no bloqueante | Backlog posterior |

# Criterio de cierre del roadmap

El roadmap se considera completado cuando:

1. Todos los requerimientos implementables del contrato y anexo están cubiertos y trazados.
2. No existen defectos críticos o altos abiertos.
3. Las matrices de autorización y RLS están aprobadas.
4. El QA visual y E2E está ejecutado con evidencia.
5. La documentación corresponde a la versión productiva.
6. El Cliente aprueba las reglas de negocio o acepta formalmente los pendientes bajo su responsabilidad.
7. Producción permanece estable después del deployment final.
