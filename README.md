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
pnpm install
pnpm dev
```

Abrir `http://localhost:3000`.

## Validación

```bash
pnpm audit:legacy
pnpm lint
pnpm access:verify
pnpm market:identity:verify
pnpm valuation:model:verify
pnpm valuation:workflow:verify
pnpm valuation:condition:verify
pnpm management:scoring:verify
pnpm build
```

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

## Roles y seguridad

Los roles vigentes son CEO/administrador, director, subdirector y partner o agente. El acceso debe validarse en la interfaz, en el servidor y mediante políticas RLS de Supabase.

## Trazabilidad contractual

La matriz de alcance y cumplimiento se mantiene en `docs/CONTRACTUAL_SCOPE_MATRIX.md`. Todo cambio funcional debe asociarse a un requisito, una fuente, una pantalla y una prueba de aceptación.

## Confidencialidad

No deben incorporarse secretos, credenciales, documentos contractuales, datos personales ni datasets confidenciales al repositorio. Los datos de producción se mantienen en servicios privados y con acceso por rol.
