# Guía de reconstrucción en ambiente limpio

## Objetivo

Demostrar que la versión aceptada puede instalarse y ejecutarse desde el repositorio y la documentación, sin depender de archivos locales ocultos.

## Prerrequisitos

- commit o tag aprobado;
- Node y pnpm en las versiones declaradas;
- acceso autorizado al repositorio;
- variables de entorno por nombre, entregadas mediante canal seguro;
- proyecto Supabase y migraciones aplicables;
- acceso al proyecto Vercel cuando corresponda.

## Procedimiento

1. Crear un ambiente limpio sin `node_modules`, `.next` ni cachés.
2. Obtener el commit exacto aprobado.
3. Instalar dependencias con lockfile congelado.
4. Configurar sólo las variables requeridas para el ambiente.
5. Aplicar o verificar migraciones no destructivas.
6. Ejecutar verificadores de seguridad, propiedad y cierre contractual.
7. Ejecutar build de producción.
8. Iniciar la aplicación y validar rutas críticas.
9. Registrar commit, fecha, operador, resultado y observaciones.

## Criterio de aprobación

La reconstrucción se considera aprobada sólo si el build termina correctamente, las rutas críticas funcionan y no se requieren archivos o secretos no documentados.
