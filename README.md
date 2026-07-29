# Property Partners Intelligence Platform

Plataforma tecnológica integrada para PL Real Estate SpA, licenciatario de Property Partners Chile S.A.

## Alcance de la versión contractual

La versión actual se limita a tres módulos interoperables:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión Comercial.

Las capacidades adicionales de razonamiento, copilotos, grafos de decisión, ML Lab y conocimiento corporativo se conservan separadas como Versión 2 y no forman parte del alcance funcional vigente.

## Stack principal

- Next.js 16
- React 19
- Supabase y PostgreSQL
- TypeScript
- Tailwind CSS
- Recharts
- MapLibre, Leaflet y React Leaflet
- Generación de PDF, DOCX y XLSX

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Validaciones disponibles

```bash
npm run lint
npm run build
npm run access:verify
npm run data:provenance
npm run crm:verify
npm run targets:verify
npm run market-sources:verify
npm run valuation:verify
npm run valuation:model:verify
```

Los scripts que dependen de datasets o variables privadas deben ejecutarse únicamente en ambientes autorizados.

## Estructura funcional

- `/dashboard`: portada del alcance vigente.
- `/dashboard/market`: inteligencia de mercado.
- `/dashboard/valorizador`: valorización de propiedades.
- `/dashboard/control`: control de gestión comercial.
- `/dashboard/reportes/autonomos`: reportes.
- `/dashboard/version-2`: capacidades futuras separadas.

## Roles

- CEO / administrador.
- Director.
- Subdirector.
- Partner o agente.

El acceso a rutas y datos debe validarse tanto en interfaz como en servidor y políticas de Supabase.

## Trazabilidad contractual

La matriz de alcance y cumplimiento se mantiene en `docs/CONTRACTUAL_SCOPE_MATRIX.md`. Todo cambio funcional debe asociarse a un requisito, una fuente, una pantalla y una prueba de aceptación.

## Seguridad y confidencialidad

El proyecto contiene desarrollos y estructuras específicas de Property Partners. No deben incorporarse secretos, credenciales, documentos contractuales, datos personales ni datasets confidenciales al repositorio. Los datos de producción deben mantenerse en servicios privados y con acceso por rol.
