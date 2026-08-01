# Property Partners Intelligence Platform

Plataforma tecnológica integrada para PL Real Estate SpA, licenciatario de Property Partners Chile S.A.

## Alcance contractual vigente

La aplicación productiva se limita a tres módulos interoperables:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión Comercial.

Los copilotos, sistemas multiagente, grafos ejecutivos, ML Lab, memoria corporativa experimental y otras capacidades de Versión 2 fueron retirados del runtime. Las migraciones ya aplicadas y la trazabilidad histórica se conservan para no alterar el estado de la base de datos.

## Stack principal

- Next.js 16 y React 19.
- TypeScript y Tailwind CSS.
- Supabase y PostgreSQL.
- Recharts, MapLibre y Leaflet para visualización.
- Generación de PDF, DOCX y XLSX.

## Desarrollo local

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Abrir `http://localhost:3000`.

## Validación

```bash
pnpm audit:legacy
pnpm lint
pnpm access:verify
pnpm market:identity:verify
pnpm market:contract:verify
pnpm valuation:model:verify
pnpm valuation:workflow:verify
pnpm valuation:condition:verify
pnpm management:scoring:verify
pnpm management:reports:verify
pnpm management:persisted:verify
pnpm build
```

La QA autenticada y RLS se ejecuta con `pnpm qa:roles` o mediante el workflow manual `Authenticated role QA`; requiere cuentas `QA_*` autorizadas.

Los scripts que dependen de datasets o variables privadas deben ejecutarse únicamente en ambientes autorizados.

## Rutas principales

- `/dashboard`: portada del alcance vigente.
- `/dashboard/market`: inteligencia de mercado.
- `/dashboard/valuation`: creación de una valorización.
- `/dashboard/valuations`: registro y expedientes de valorización.
- `/dashboard/control`: control de gestión comercial.
- `/dashboard/ceo`: consolidado ejecutivo autorizado.
- `/dashboard/director`: gestión de oficina y equipo.
- `/dashboard/partner`: desempeño y operación personal.
- `/dashboard/reportes/autonomos`: reportes contractuales autorizados.

Las rutas antiguas `/dashboard/valorizador` y `/dashboard/agente` se mantienen únicamente como redirecciones de compatibilidad hacia las rutas canónicas.

## Datos de control de gestión

`/api/management/summary` conserva el corte documental 2026 como fallback identificado. Cuando existen valores en `management_approved_metric_values`, el dashboard sustituye únicamente las métricas equivalentes que estén verificadas, reconciliadas y aprobadas. Las metas se usan sólo cuando contienen aprobación registrada. El acceso a entidades y valores se mantiene bajo RLS.

## Automatización de reportes

Vercel ejecuta `/api/cron/management-monthly` según `vercel.json`. La ruta requiere `CRON_SECRET` en Production. CEO y administración disponen de recuperación autenticada mediante `POST /api/management/reports/run`, que procesa únicamente programaciones vencidas y conserva idempotencia por programación y período.

## Roles y seguridad

Los roles vigentes son CEO/administrador, director, subdirector y partner o agente. El acceso debe validarse en la interfaz, en el servidor y mediante políticas RLS de Supabase.

Las vistas contractuales son `security_invoker`, no conceden acceso a `anon` y sólo permiten lectura a usuarios autenticados. Las funciones privilegiadas mantienen `search_path` fijo y permisos explícitos.

## Documentación de operación y transferencia

- `docs/operations/INSTALLATION_RECOVERY_RUNBOOK.md`
- `docs/architecture/DATA_MODEL_AND_DICTIONARY.md`
- `docs/manuals/ROLE_USER_MANUAL.md`
- `docs/manuals/ADMINISTRATION_MANUAL.md`
- `docs/transfer/TRANSFER_ACCEPTANCE_PACKAGE.md`

La existencia de estos documentos no reemplaza la prueba limpia de reconstrucción, la capacitación ni la aceptación del Cliente.

## Trazabilidad contractual

La matriz de alcance y cumplimiento se mantiene en `docs/CONTRACTUAL_SCOPE_MATRIX.md`. Todo cambio funcional debe asociarse a un requisito, una fuente, una pantalla y una prueba de aceptación.

## Confidencialidad

No deben incorporarse secretos, credenciales, documentos contractuales, datos personales ni datasets confidenciales al repositorio. Los datos de producción se mantienen en servicios privados y con acceso por rol.
