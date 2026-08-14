# Matriz de titularidad, administración y costos de terceros

## Objetivo

Definir quién es titular, administrador y responsable de pago de cada servicio de terceros necesario para operar la plataforma después del cierre contractual.

## Regla de seguridad

Este documento registra nombres de servicios, cuentas responsables y canales de administración. No debe contener contraseñas, tokens, claves privadas, cookies, secretos, códigos de recuperación ni valores de variables de entorno.

## Campos por servicio

Registrar para cada servicio:

- servicio;
- finalidad;
- ambiente;
- titular contractual de la cuenta;
- organización o workspace;
- administrador principal;
- administradores secundarios;
- responsable financiero;
- plan vigente;
- moneda y periodicidad;
- límite o presupuesto aprobado;
- medio de pago bajo custodia de;
- fecha de renovación;
- dependencia técnica;
- procedimiento de alta y baja de administradores;
- procedimiento de soporte;
- procedimiento de transferencia, cuando aplique;
- estado de aceptación.

## Servicios mínimos a confirmar

### Vercel

- titular de la cuenta o team;
- proyecto de producción;
- dominios;
- responsable de deployments;
- responsable de costos;
- política de previews y retención.

### Supabase

- titular de la organización;
- proyecto de producción;
- responsable de base de datos, Auth y Storage;
- responsable de backups y recuperación;
- responsable de costos;
- procedimiento para service role y secretos sin documentar valores.

### GitHub

- titular del repositorio;
- administradores;
- responsables de ramas protegidas y Actions;
- política de colaboradores;
- alcance exacto de cualquier transferencia futura.

### Correo y entrega de reportes

- proveedor;
- dominio remitente;
- responsable de reputación y DNS;
- responsable de costos;
- procedimiento para altas, bajas y suspensión.

### Fuentes y proveedores de datos

- licencia o autorización de uso;
- titular del contrato;
- responsable de renovación;
- restricciones de reutilización y redistribución.

## Criterio de cierre

El frente puede considerarse definido cuando cada servicio crítico tiene titular, administrador, responsable financiero y procedimiento de continuidad documentados y aceptados. Cualquier transferencia de control administrativo requiere autorización explícita y un plan separado de rotación de credenciales.