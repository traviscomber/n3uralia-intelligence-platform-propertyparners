# Instalación, despliegue y recuperación

Fecha de verificación documental: 1 de agosto de 2026.

## 1. Objetivo y alcance

Este runbook permite reconstruir el runtime contractual de Property Partners en un entorno autorizado. Cubre los tres módulos vigentes:

1. Inteligencia de Mercado.
2. Valorización de Propiedades.
3. Control de Gestión Comercial.

No incluye datasets del Cliente, credenciales, copias de producción ni capacidades experimentales retiradas de V1.

## 2. Requisitos previos

- Git con acceso al repositorio privado.
- Node.js 22.
- Corepack habilitado.
- pnpm 10.17.1.
- Proyecto Supabase autorizado.
- Proyecto Vercel autorizado.
- Dominio y cuentas de correo bajo control del responsable del Cliente cuando corresponda.
- Acceso administrativo separado para GitHub, Supabase y Vercel.

## 3. Variables y secretos

| Variable | Entorno | Obligatoria | Uso |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Local, Preview, Production | Sí | URL pública del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local, Preview, Production | Sí | Cliente autenticado sujeto a RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview, Production | Sí para automatizaciones | Operaciones internas del cron. Nunca exponer al navegador. |
| `CRON_SECRET` | Production | Sí para cron | Autenticación de `/api/cron/management-monthly`. |
| `OPENAI_API_KEY` | Opcional | No para V1 | Sólo servicios experimentales o heredados fuera del runtime contractual. |
| `QA_*` | Local o GitHub Actions | Sólo QA autenticada | Cuentas de prueba. Nunca escribirlas en artefactos. |

Reglas:

- No almacenar valores reales en Git.
- Separar Production, Preview y Development.
- Rotar secretos al transferir control o al detectar exposición.
- Tratar `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` como secretos críticos.

## 4. Instalación local

```bash
corepack enable
git clone <REPOSITORY_URL>
cd n3uralia-intelligence-platform-propertyparners
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Completar `.env.local` con valores del entorno autorizado y ejecutar:

```bash
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
pnpm dev
```

La aplicación local queda disponible en `http://localhost:3000`.

## 5. Reconstrucción de Supabase

### 5.1 Proyecto nuevo

1. Crear un proyecto Supabase en la organización autorizada.
2. Guardar URL, anon key y service role key en el gestor de secretos.
3. Instalar o ejecutar Supabase CLI.
4. Vincular el proyecto.
5. Aplicar las migraciones en el orden lexicográfico de `supabase/migrations`.

Ejemplo:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>
npx supabase@latest db push
```

### 5.2 Verificaciones posteriores

- Todas las migraciones terminan sin error.
- RLS está habilitado en tablas expuestas.
- Las vistas contractuales usan `security_invoker=true`.
- `anon` no tiene acceso a vistas contractuales.
- Las funciones `SECURITY DEFINER` sólo pueden ejecutarse por roles autorizados.
- Auth contiene únicamente usuarios autorizados para el entorno.
- No se importan datos productivos durante una prueba de reconstrucción.

### 5.3 Datos iniciales

Las migraciones pueden crear catálogos, definiciones y estructura. Los datos del Cliente deben ingresarse mediante los flujos autorizados:

- `/api/market/contract-import` para fuentes contractuales de mercado;
- `/api/management/import` para métricas de gestión;
- interfaces administrativas para metas, reglas y programaciones.

Cada carga debe registrar fuente, período, hash o referencia, conteos y resultado de validación.

## 6. Despliegue en Vercel

1. Importar el repositorio privado.
2. Seleccionar Next.js como framework.
3. Mantener `pnpm install` con lockfile congelado.
4. Configurar variables por entorno.
5. Desplegar primero a Preview.
6. Verificar CI y Preview.
7. Promover o fusionar a `main` para Production.

La configuración de cron se toma desde `vercel.json`. Después de configurar `CRON_SECRET`, realizar una ejecución controlada y confirmar:

- respuesta HTTP `200`;
- ausencia de `unauthorized cron request`;
- actualización de `last_run_at` y `next_run_at`;
- no duplicación del mismo reporte por programación y período;
- creación de distribuciones pendientes cuando existan destinatarios.

La entrega efectiva por correo requiere un proveedor adicional y no se considera validada sólo por registrar una distribución `pending`.

## 7. Verificación de despliegue

### Técnica

- GitHub Actions en estado exitoso.
- Vercel deployment `READY`.
- Sin errores `error` o `fatal` nuevos en runtime.
- Login funcional para cada rol configurado.
- `/api/management/summary` responde dentro del alcance RLS.
- Creación y consulta de un caso reversible de valorización en staging.
- Importación de una muestra no confidencial o sintética en staging.

### Autorización

Ejecutar manualmente el workflow `Authenticated role QA` cuando estén configurados los secretos `QA_*`. El artefacto debe probar:

- CEO o administración con alcance global;
- dirección y subdirección limitadas a su oficina;
- partner limitado a su propia entidad;
- métricas, metas y alertas dentro del conjunto de entidades visible;
- valorizaciones y asignaciones sin exposición transversal.

## 8. Recuperación

### 8.1 Fallo de aplicación

1. Identificar el deployment estable anterior.
2. Revisar build y runtime logs.
3. Usar rollback de Vercel cuando el fallo sea de código o configuración.
4. Confirmar que los aliases productivos apuntan al deployment estable.
5. Registrar el incidente y la causa.

### 8.2 Fallo de base de datos

1. Detener importaciones y automatizaciones que escriben datos.
2. No ejecutar migraciones destructivas durante el diagnóstico.
3. Usar los mecanismos de backup y point-in-time recovery contratados en Supabase.
4. Restaurar primero en un entorno aislado.
5. Verificar conteos, relaciones, RLS y funciones.
6. Promover la recuperación sólo después de aprobación del responsable.

### 8.3 Secreto comprometido

1. Revocar o rotar el secreto afectado.
2. Redeploy de los entornos que lo consumen.
3. Invalidar sesiones cuando corresponda.
4. Revisar logs de acceso y acciones administrativas.
5. Documentar alcance, tiempos y medidas correctivas.

## 9. Prueba de reconstrucción independiente

El cierre de transferencia requiere una prueba ejecutada por una persona que no haya preparado el entorno original:

- clonar desde cero;
- instalar con lockfile congelado;
- crear o vincular Supabase de staging;
- aplicar migraciones;
- configurar secretos sin copiar archivos locales del equipo original;
- desplegar Preview;
- ejecutar CI y QA;
- documentar duración, errores y correcciones.

No marcar `ARC-08` o la transferencia completa como aceptados hasta conservar esta evidencia.

## 10. Evidencia mínima por ejecución

- commit y branch;
- workflow y resultado;
- deployment ID y estado;
- project ref de staging, sin secretos;
- versión de Node y pnpm;
- migraciones aplicadas;
- manifiesto de QA;
- observaciones y responsable;
- fecha de aprobación.
