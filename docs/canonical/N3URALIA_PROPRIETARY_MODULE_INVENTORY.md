# Inventario verificado de módulos propietarios N3uralia

## Propósito

Este documento clasifica los módulos que deben separarse del repositorio operado por Property Partners. No autoriza eliminaciones antes de validar la continuidad del servicio.

## Implementación propietaria confirmada

### `lib/n3uralia-intelligence-engine.ts`

Clasificación: `n3uralia-proprietary`.

El archivo contiene lógica ejecutable del motor, incluyendo construcción de señales, interpretación, riesgos, acciones, priorización, confianza y decisiones ejecutivas. También combina evidencia CRM, metas, mercado, valorización y documentos. Por esta razón no debe permanecer en el repositorio transferible después de completar la migración.

## Entradas específicas de Property Partners

Las siguientes rutas alimentan la operación del cliente, pero no deben incorporarse como datasets reutilizables de N3uralia:

- `lib/crm-snapshot*`
- `lib/targets-2026*`
- `lib/presentations-2026*`
- `lib/market-snapshot*` cuando contenga evidencia específica del tenant
- `lib/valuation-snapshot*` cuando contenga evidencia específica del tenant
- `data/**`
- `docs/canonical/**` asociados a Property Partners

El runtime recibirá sólo datos mínimos autorizados, con tenant y procedencia explícitos.

## Contratos compartidos permitidos

- `lib/n3uralia-runtime-contract.ts`
- `lib/n3uralia-runtime-client.ts`

Estos archivos pueden contener tipos, DTO, versión de protocolo, transporte, timeout y manejo de errores. No pueden contener lógica de inferencia, scoring, priorización ni reglas internas.

## Frontera objetivo

El repositorio Property Partners conserva UI, autenticación, acceso a sus datos, preparación de solicitudes y presentación de resultados.

El runtime privado N3uralia conserva señales, inferencias, riesgos, recomendaciones, scoring, priorización, agentes, orquestación y reglas internas.

## Secuencia obligatoria

1. Crear el repositorio privado del runtime.
2. Migrar `lib/n3uralia-intelligence-engine.ts` y adaptar sus entradas al contrato DTO.
3. Mantener los datos Property Partners fuera del repositorio del runtime.
4. Desplegar un endpoint autenticado y versionado.
5. Comparar resultados locales y remotos.
6. Sustituir consumidores locales por `lib/n3uralia-runtime-client.ts` mediante feature flag.
7. Verificar continuidad funcional.
8. Retirar la implementación propietaria del repositorio cliente.
9. Limpiar el historial transferible.
10. Rotar credenciales y registrar el commit exacto de transferencia.

## Criterio de salida

La separación termina cuando el repositorio transferible no contiene implementación del motor, la plataforma opera mediante el contrato remoto, los datos del cliente permanecen aislados y el historial entregable no permite recuperar el código retirado.
