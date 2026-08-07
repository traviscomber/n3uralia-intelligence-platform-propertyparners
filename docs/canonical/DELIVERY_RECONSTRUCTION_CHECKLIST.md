# Checklist de reconstrucción limpia

## Propósito

Preparar una reconstrucción verificable del entregable sin incorporar secretos, dumps productivos ni payloads del Cliente al repositorio. Este checklist no cambia la data canónica ni sustituye UAT, capacitación o aceptación.

## Fuente de reconstrucción

- Repositorio: `traviscomber/n3uralia-intelligence-platform-propertyparners`.
- Rama de referencia: `main`.
- Runtime: Node.js compatible con Next.js 16.
- Gestor: pnpm `10.17.1` mediante Corepack.
- Dependencias: `pnpm-lock.yaml` con instalación congelada.

## Secuencia limpia

1. Clonar el repositorio en un directorio vacío.
2. Fijar el commit aprobado de entrega.
3. Ejecutar `corepack enable`.
4. Ejecutar `pnpm install --frozen-lockfile`.
5. Crear `.env.local` únicamente a partir de `.env.example`; cargar secretos desde el custodio autorizado, nunca desde Git.
6. Ejecutar los verificadores contractuales y de seguridad definidos por `prebuild`.
7. Ejecutar `pnpm build`.
8. Verificar que no existan `.env`, claves privadas, tokens, dumps productivos, logs sensibles, `.next` ni `node_modules` dentro del paquete transferible.
9. Desplegar el commit validado al proyecto Vercel autorizado.
10. Verificar rutas críticas y ausencia de errores runtime.
11. Registrar commit, deployment, fecha, ejecutor y resultado.

## Base de datos

La reconstrucción no autoriza restaurar, sobrescribir ni resembrar producción. Las migraciones versionadas sirven para reconstruir estructura en un entorno autorizado. La data canónica productiva permanece bajo custodia de Supabase y sólo puede manipularse mediante procedimientos explícitamente autorizados.

## Criterios de aprobación

La reconstrucción se considera `passed` únicamente cuando:

- instalación congelada completa sin alterar lockfile;
- verificadores de IP, credenciales, exposición, tenant, contrato y trust boundaries pasan;
- build de producción finaliza correctamente;
- deployment de referencia queda `READY`;
- no existen errores runtime en la validación posterior;
- el inventario del paquete no contiene materiales excluidos;
- la evidencia registra commit y deployment exactos.

## Evidencia

El resultado debe registrarse en `config/delivery-package-inventory.json`. El checksum SHA-256 corresponde al artefacto ZIP final y no debe inventarse ni calcularse sobre una lista parcial. Mientras no exista el ZIP final, `checksumSha256` permanece `null` y el paquete no puede declararse `verified`.
