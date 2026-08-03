# Plantilla de inventario de variables de entorno

## Objetivo

Documentar las variables necesarias por ambiente sin registrar valores secretos.

## Registro por variable

- nombre;
- propósito;
- ambiente: desarrollo, preview o producción;
- obligatoria u opcional;
- componente consumidor;
- propietario del secreto;
- canal de entrega;
- fecha de última rotación;
- fecha de próxima revisión;
- impacto si falta;
- clasificación: pública, privada o credencial.

## Reglas

- Nunca incluir valores en este documento.
- Ninguna credencial privada puede usar prefijo público.
- Las variables obsoletas deben eliminarse después de verificar que no tienen consumidores.
- Toda transferencia de control debe incluir rotación autorizada y revocación de credenciales anteriores.
- Los ambientes deben mantener valores y permisos separados.

## Validación

- Inventario revisado por responsable técnico: [COMPLETAR]
- Producción reconciliada: [COMPLETAR]
- Preview reconciliado: [COMPLETAR]
- Fecha: [COMPLETAR]
