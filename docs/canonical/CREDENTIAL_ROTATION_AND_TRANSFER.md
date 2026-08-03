# Rotación de credenciales y transferencia operativa

## Objetivo

Permitir que Property Partners continúe operando la plataforma conforme al contrato, sin transferir secretos reutilizables, cuentas maestras ni credenciales propietarias de N3uralia.

## Principio

La continuidad operativa del Cliente y la protección de la propiedad intelectual de N3uralia se resuelven separando credenciales por titularidad y función. Ningún secreto de N3uralia se entrega dentro del repositorio, historial Git, variables públicas, documentación, logs o archivos exportados.

## Secuencia obligatoria

1. Congelar cambios de infraestructura durante la ventana de rotación.
2. Inventariar todas las credenciales activas en Vercel, Supabase, Resend, proveedores de IA, GitHub Actions y servicios externos.
3. Clasificar cada credencial según `config/credential-rotation-manifest.json`.
4. Crear credenciales nuevas en cuentas controladas por el titular correspondiente.
5. Instalar las credenciales nuevas únicamente en variables de entorno server-side.
6. Desplegar preview y ejecutar pruebas funcionales, de autorización, correo, cron, reportes y runtime.
7. Promover a producción sólo después de validar continuidad contractual.
8. Revocar las credenciales antiguas.
9. Revisar logs y alertas para confirmar que no existen usos residuales.
10. Registrar fecha, responsable, proveedor, alcance y resultado de cada rotación sin almacenar el valor del secreto.

## Separación por titularidad

### N3uralia

Permanecen bajo control exclusivo de N3uralia:

- token del runtime propietario;
- credenciales maestras de modelos y agentes reutilizables;
- cuentas de observabilidad del motor N3uralia;
- secretos de despliegue del runtime privado;
- claves que permitan acceder a código, prompts, reglas, memoria o datos de otros clientes.

La plataforma Property Partners sólo recibe una credencial de servicio limitada, revocable, con alcance exclusivo al tenant autorizado y sin capacidad administrativa sobre el runtime.

### Property Partners

Deben quedar en cuentas o entornos operables por Property Partners, según el contrato:

- Supabase específico del proyecto;
- dominio y DNS del proyecto;
- cuenta o subcuenta de correo transaccional;
- secreto de cron del proyecto;
- variables de aplicación específicas del cliente;
- credenciales necesarias para operar funciones entregadas que no revelen el motor N3uralia.

## Requisitos del token del runtime N3uralia

El token de servicio debe:

- estar ligado al tenant Property Partners;
- tener permisos mínimos;
- ser revocable sin afectar otros clientes;
- aplicar rate limits y cuotas contractuales;
- registrar uso por tenant y operación;
- impedir acceso a prompts, trazas, reglas internas y administración;
- rotarse ante transferencia, incidente o cambio de responsables;
- almacenarse únicamente en Vercel server-side.

## Evidencia de cierre

La rotación se considera terminada sólo cuando existen:

- pruebas de producción aprobadas;
- confirmación de revocación de secretos anteriores;
- ausencia de secretos en Git e historial entregable;
- validación de que el frontend no contiene variables privilegiadas;
- registro de responsables y fecha;
- confirmación de continuidad de correo, cron, autenticación, reportes y runtime;
- aprobación técnica de N3uralia y aceptación operativa del Cliente.

## Restricción

Este documento no autoriza publicar ni copiar valores secretos. La rotación real debe ejecutarse directamente en cada proveedor. Los valores nunca deben agregarse a commits, pull requests, issues, capturas, chats o documentación canónica.
