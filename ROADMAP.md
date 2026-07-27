# N3uralia Intelligence Platform — Roadmap 2026

Última actualización: 27 de julio de 2026

## Estado general

**Avance estimado del roadmap de 8 semanas: 65%**

| Semana | Enfoque | Avance |
|---|---|---:|
| 1 | Base documental y evidencia normalizada | 100% |
| 2 | Integración Documents/RAG en el motor | 100% |
| 3 | Copilotos por rol y autorización | 100% |
| 4 | Memoria de feedback y trazabilidad | 80% |
| 5 | Fuentes de datos y actualización operativa | 55% |
| 6 | Seguridad, observabilidad y operación | 20% |
| 7 | QA integral, rendimiento y UX | 10% |
| 8 | Preparación de lanzamiento y traspaso | 0% |

> El porcentaje es una estimación técnica basada en el estado actual del repositorio, historial de commits y funcionalidades desplegadas. No reemplaza validación funcional ni aprobación de negocio.

## Estado actual de producción

- Rama de producción: `main`.
- Stack desplegado: Next.js 16, Supabase y Vercel cron.
- Reportes semanales persistidos en `weekly_reports`.
- Pipeline de scraping para Portal Inmobiliario, TOCTOC, icasas.cl, Yapo y Chilepropiedades.
- Salud de scraping persistida y visible en `Fuentes de Datos`.
- Entrega semanal por email y enlaces de WhatsApp Web.
- Reintentos de email y escalamiento a destinatarios de respaldo.
- Estrategia de inteligencia de mercado enfocada en Vitacura documentada en `docs/PP_MARKET_INTELLIGENCE_STRATEGY.md`.
- Dashboard con plano de control de IA, bucle de agentes y reglas de escalamiento.
- Feedback de recomendaciones persistido y agregado por audiencia y barrio.
- Framework formal de medición con fórmulas, responsables, cadencias y umbrales.
- Copilotos CEO, Director de Cuenta y Partner operativos con autorización y trazabilidad completas.
- 77 pruebas automatizadas pasando (documentos, roles, trazabilidad, ranking, e2e).
- Pipeline de razonamiento ejecutivo end-to-end verificado con datos reales de Property Partners.

## Enlaces del proyecto

| Plataforma | Enlace |
|---|---|
| Repositorio GitHub | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners |
| Rama principal | https://github.com/traviscomber/n3uralia-intelligence-platform-propertyparners/tree/main |
| Producción | https://n3uralia-intelligence-platform.vercel.app |
| Proyecto Vercel | https://vercel.com/travis-projects-c14a785a/n3uralia-intelligence-platform |
| Proyecto Supabase | `orfncinmhymhhoxbxgjb` |

## Principios de ejecución

1. Trabajar directamente sobre `main`.
2. Cada cambio coherente debe terminar en commit y push.
3. Verificar que Vercel quede en estado `READY` antes de continuar.
4. No inventar roles, permisos, entidades, procesos ni terminología de negocio.
5. Mantener separados los identificadores técnicos y los nombres visibles de negocio.
6. Para el rol actual:
   - identificadores técnicos: `director`, `directorio`, `sucursal`;
   - nombre visible: **Director de Cuenta**.

---

## Semana 1 — Base documental y evidencia normalizada

**Estado: completada — 100%**

### Implementado

- Contrato reutilizable de evidencia documental.
- IDs determinísticos de documentos y fragmentos.
- Hash de contenido y deduplicación.
- Validación, normalización y ordenamiento determinístico.
- Metadatos y referencias.
- Normalización de presentaciones como documentos.
- Suite documental de 31 pruebas.

### Artefactos principales

- `lib/document-evidence.ts`
- `lib/presentations-2026.ts`
- `scripts/test-document-evidence.mjs`

### Pendiente

- Nada bloqueante para cerrar esta semana.

---

## Semana 2 — Integración Documents/RAG en el motor de inteligencia

**Estado: completada — 100%**

### Implementado

- Dominio `documents` integrado al motor de inteligencia.
- Evidencia documental incorporada a `buildClientEvidence()`.
- Consumo automático por el contexto del CEO.
- Compatibilidad mantenida con CRM, mercado, valoración y evidencia ejecutiva.
- Base compartida para futuros pipelines RAG.

### Artefactos principales

- `lib/n3uralia-intelligence-engine.ts`
- `lib/document-evidence.ts`
- `lib/presentations-2026.ts`
- `app/api/ceo/question/route.ts`

### Pendiente

- Conectar nuevas fuentes documentales reales cuando estén definidas y aprobadas.
- Añadir recuperación semántica persistente solo si existe una decisión de arquitectura documentada.

---

## Semana 3 — Copilotos por rol y autorización centralizada

**Estado: completada — 100%**

### Implementado

- Copilotos para CEO, Director de Cuenta y Partner.
- Rutas de preguntas por rol.
- Widgets condicionales en el dashboard (CEO naranja, Director azul, Partner verde).
- Autorización centralizada con `requireCopilotRole` en los tres endpoints.
- Motor de política de acceso `IntelligenceAccessPolicy` con filtrado de evidencia por dominio.
- Pipeline de razonamiento ejecutivo con `rankEvidence` y guard de respuesta.
- Guard de respuesta ejecutiva con validación de trazabilidad.
- Feedback persistido con auditoría endurecida.
- Endpoint de feedback para Director de Cuenta.
- Módulo canónico de ranking de evidencia (`lib/evidence-ranking.ts`, 7 pruebas).
- IDs determinísticos para evidencia de mercado, valoración y documentos.
- Clasificación de fuentes de evidencia (`lib/evidence-source-class.ts`).
- Validación end-to-end completa: 19 pruebas cubriendo todo el flujo CEO.
- Build sin errores — 77 pruebas pasando en total (31 + 12 + 10 + 7 + 19).

### Artefactos principales

- `app/api/ceo/question/route.ts`
- `app/api/director/question/route.ts`
- `app/api/director/feedback/route.ts`
- `app/api/partner/question/route.ts`
- `components/ceo/ceo-ai-assistant-widget.tsx`
- `components/director/director-ai-assistant-widget.tsx`
- `components/partner/partner-ai-assistant-widget.tsx`
- `lib/copilot-authorization.ts`
- `lib/copilot-feedback.ts`
- `lib/executive-reasoning-pipeline.ts`
- `lib/executive-response-guard.ts`
- `lib/intelligence-access-policy.ts`
- `lib/evidence-ranking.ts`
- `lib/evidence-id.ts`
- `lib/evidence-source-class.ts`
- `scripts/test-director-partner-copilots.mjs`
- `scripts/test-pipeline-end-to-end.mjs`

### Pendiente

- Nada bloqueante. Auditoría de accesibilidad del widget diferida a Semana 7.

---

## Semana 4 — Memoria de feedback y trazabilidad de decisiones

**Estado: avanzada — 80%**

### Ya implementado

- Servicio compartido de feedback.
- Feedback persistido en Supabase con auditoría endurecida.
- Agregación por audiencia y barrio.
- Repriorización de recomendaciones a partir del feedback.
- Orquestador conversacional del CEO.
- IDs de respuesta y fuentes de contexto.
- Entrega semanal con reintentos y destinatarios de respaldo.
- Validador de trazabilidad (`lib/traceability-validator.ts`, 10 pruebas).
- Guard de respuesta con validación completa de trazabilidad y confianza.
- IDs de evidencia determinísticos y clasificación de fuentes.
- Política de acceso centralizada que preserva trazabilidad por rol.

### Falta

- Confirmar esquema canónico de memoria de decisiones y resultados.
- Unificar lectura y escritura de memoria para CEO, Director de Cuenta y Partner.
- Añadir estados explícitos de persistencia y errores recuperables en UI.
- Crear pruebas de integración contra Supabase (feedback real en producción).
- Documentar exactamente cómo el feedback afecta respuestas y reportes futuros.

### Criterio de cierre

- Feedback persistido, consultable y trazable.
- Decisiones y resultados enlazados mediante IDs estables.
- Pruebas de integración y autorización pasando.

---

## Semana 5 — Fuentes de datos y actualización operativa

**Estado: desarrollo avanzado, auditoría pendiente — 55%**

### Ya implementado

- Dashboard de mercado y mapas geoespaciales.
- Datos y estrategia para Vitacura.
- Scrapers para múltiples portales.
- Persistencia de ejecuciones en `scrape_runs`.
- Salud de fuentes y detección de anomalías.
- Snapshots históricos en `neighborhood_market_data`.
- Benchmark externo de Realtor International.
- Comparables ponderados para el Valorizador.
- Refresh nocturno mediante Vercel cron.
- Reportes semanales y variantes ejecutivas.
- Descargas PDF y vistas de drill-down para Director de Cuenta.

### Falta

- Auditar qué fuentes siguen activas y cuáles son demo, sintéticas o históricas.
- Identificar explícitamente datos reales versus sintéticos.
- Registrar procedencia, fecha y calidad en toda evidencia.
- Hacer visible el flujo canónico de deduplicación en UI.
- Añadir trail de auditoría por fuente para merges de alto riesgo.
- Crear pruebas de calidad de datos y cobertura.
- Definir formalmente qué fuentes consume cada rol.

### Criterio de cierre

- Catálogo de fuentes vigente.
- Actualización reproducible y observable.
- Evidencia con procedencia, fecha y calidad.
- Datos sintéticos identificados.

---

## Semana 6 — Seguridad, observabilidad y operación

**Estado: inicial — 20%**

### Ya existe

- Autenticación con Supabase.
- Renderizado condicional por rol.
- Helper compartido de autorización.
- Despliegue continuo en Vercel.
- Logs básicos.
- Cron jobs de actualización.
- Detección de anomalías de operación y scraping.

### Falta

- Auditoría completa de permisos en páginas, APIs y acciones del servidor.
- Pruebas negativas entre roles.
- Revisión de políticas RLS.
- Eliminar o bloquear cualquier bypass de desarrollo en producción.
- Logs estructurados con request ID y severidad.
- Monitoreo de latencia y errores críticos.
- Alertas de deploy y runtime.
- Revisión de secretos, variables y dependencias.
- Rate limiting y protección antiabuso en rutas de IA.

### Criterio de cierre

- Matriz técnica de acceso validada.
- RLS revisada.
- Errores y latencia observables.
- Pruebas de seguridad automatizadas.

---

## Semana 7 — QA integral, rendimiento y experiencia de usuario

**Estado: no iniciada formalmente — 10%**

### Ya existe

- Suites específicas de verificación.
- Historial de mejoras responsive y UI.
- Estados de carga, error y vacíos.
- Mejoras previas de accesibilidad y consistencia visual.

### Falta

- Suite E2E de autenticación y navegación.
- Flujos E2E para CEO, Director de Cuenta y Partner.
- Pruebas de feedback y fallas de red.
- QA responsive en móvil, tablet y escritorio.
- Auditoría de accesibilidad.
- Presupuesto y medición de rendimiento.
- Revisión de bundles y consultas repetidas.
- Validación de contenido con usuarios internos autorizados.
- Registro y priorización de incidencias.

### Criterio de cierre

- Flujos críticos E2E pasando.
- Sin errores bloqueantes conocidos.
- Métricas base de rendimiento y accesibilidad registradas.

---

## Semana 8 — Preparación de lanzamiento y traspaso

**Estado: pendiente — 0%**

### Falta

- Checklist final de producción.
- Verificación de dominio, ambientes y variables.
- Procedimiento de rollback probado.
- Runbook de incidentes.
- Manual técnico de operación.
- Guía de administración de usuarios y roles basada en documentación aprobada.
- Inventario de fuentes y responsables técnicos.
- Resumen de arquitectura actualizado.
- Criterios de soporte y mantenimiento.
- Aprobación final de negocio y técnica.

### Criterio de cierre

- Producción estable.
- Documentación operativa completa.
- Responsables y procedimientos confirmados.
- Lanzamiento aprobado.

---

## Inventario resumido: lo que tenemos

1. Aplicación Next.js desplegada en Vercel.
2. Autenticación y perfiles en Supabase.
3. Dashboard ejecutivo y analítica.
4. Mapa de mercado y capas geoespaciales.
5. CRM, mercado, valoración, documentos y evidencia ejecutiva.
6. Base documental y RAG.
7. Copilotos CEO, Director de Cuenta y Partner.
8. Pipeline ejecutivo compartido.
9. Autorización y guard de respuestas.
10. Feedback persistido y agregado.
11. Scrapers multi-fuente y salud operacional.
12. Reportes semanales, PDF y distribución por email/WhatsApp Web.
13. Cron jobs de actualización nocturna.
14. Históricos de mercado por barrio.
15. Flujo de commit, push y validación de producción.

## Inventario resumido: lo que falta

1. Completar memoria de decisiones y feedback unificado entre roles (Semana 4).
2. Auditar fuentes reales, sintéticas y deduplicación (Semana 5).
3. Completar seguridad, RLS, rate limits y observabilidad (Semana 6).
4. Añadir E2E, QA integral y métricas de rendimiento (Semana 7).
5. Preparar runbooks, rollback, operación y lanzamiento (Semana 8).

## Riesgos técnicos actuales

1. La definición original de las semanas 4 a 8 no está completamente documentada; su alcance debe validarse antes de implementar reglas de negocio nuevas.
2. Algunas fuentes y datos pueden ser históricos, demo o sintéticos y requieren clasificación explícita.
3. Los refactors pueden dejar imports heredados; ya ocurrió con el módulo de feedback del CEO.
4. La nomenclatura visible y los identificadores técnicos deben mantenerse separados.
5. El estado `READY` de Vercel confirma despliegue, pero no reemplaza pruebas funcionales ni de datos.

## Próxima acción

Avanzar la **Semana 4** al cierre:

1. Confirmar esquema canónico de memoria de decisiones (`decision_history`) en Supabase.
2. Unificar lectura y escritura de memoria para los tres roles.
3. Crear prueba de integración de feedback contra Supabase.
4. Documentar el contrato entre feedback, respuestas futuras y reportes.
5. Verificar `READY` en Vercel después del último merge.
6. Actualizar este documento con resultados.

## Notas operativas existentes

- `OPENAI_API_KEY` se usa directamente para generación de reportes.
- WhatsApp actualmente abre `web.whatsapp.com` con un mensaje precargado.
- El cron de entrega semanal está programado para los lunes a las 06:00 en Vercel.
