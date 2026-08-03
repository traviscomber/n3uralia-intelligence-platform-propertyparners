# Checklist de transferencia de accesos

## Objetivo

Controlar cualquier cambio de custodia administrativa sin exponer secretos ni alterar la propiedad contractual de los activos.

## Alcance

Aplicar a GitHub, Vercel, Supabase, correo transaccional, dominios, proveedores de datos y otros servicios utilizados por la plataforma.

## Condiciones previas

- autorización explícita de las partes;
- identificación del responsable receptor;
- clasificación de propiedad revisada;
- inventario de accesos vigente;
- respaldo y rollback disponibles;
- canal seguro definido para credenciales;
- UAT y aceptación registradas o pendientes formalmente aceptados.

## Registro por servicio

| Servicio | Cuenta o proyecto | Custodio actual | Custodio objetivo | Nivel de acceso | Acción | Fecha | Evidencia | Estado |
|---|---|---|---|---|---|---|---|---|
| GitHub | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [transferir/invitar/revocar] | [COMPLETAR] | [COMPLETAR] | pending |
| Vercel | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | pending |
| Supabase | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | [COMPLETAR] | pending |

## Verificaciones obligatorias

- no incluir valores secretos en este documento;
- confirmar MFA para cuentas administrativas;
- aplicar principio de mínimo privilegio;
- verificar que los accesos anteriores queden revocados cuando corresponda;
- registrar fecha, responsable y evidencia de cada cambio;
- confirmar que no se transfieren módulos clasificados como `n3uralia-proprietary` salvo acuerdo expreso;
- confirmar que los materiales `client-owned-canonical` permanecen bajo control del Cliente.

## Cierre

La transferencia se considera completa únicamente cuando cada servicio tenga custodio identificado, acceso probado, accesos obsoletos revocados y aceptación registrada.