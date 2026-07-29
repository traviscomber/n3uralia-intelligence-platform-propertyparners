# Matriz de alcance contractual

## Regla de control

Toda funcionalidad de la versión vigente debe relacionarse con:

1. requisito contractual;
2. fuente de datos;
3. pantalla o proceso;
4. cálculo o transformación;
5. prueba de aceptación;
6. responsable de validación.

Las capacidades sin respaldo contractual se mantienen en Versión 2 y no se presentan como entregables de la primera versión.

## Módulo I — Inteligencia de Mercado

| Requisito | Ruta principal | Estado inicial | Evidencia de aceptación |
|---|---|---:|---|
| Integración CBRS | `/dashboard/market` | Parcial | Conteos conciliados y fecha de corte visible |
| Oferta Portal Inmobiliario | `/dashboard/market` | Parcial | Publicaciones normalizadas y universo declarado |
| Deduplicación | Mercado / propiedades | Pendiente | Reglas, coincidencias y propiedad canónica |
| Barrios y microbarrios KML | Mercado / fuentes | Parcial | Asignación reproducible y excepciones visibles |
| Ventas recientes adicionales | Fuentes | Pendiente de cliente | Fuente registrada y proceso de carga |
| Normalización | Pipeline de mercado | Parcial | Esquema común y reporte de calidad |
| Historial de propiedades | Propiedades | Pendiente | Cambios de estado, precio y publicación |
| Base única de mercado | Mercado | Pendiente | Relación propiedad–publicación–transacción |
| Comparables | Mercado / valorizador | Pendiente | Selección por barrio, área y distancia |
| Estadísticas | Mercado | Parcial | Fórmula, período y universo visibles |
| Velocidad de venta | Mercado | Pendiente | Días en mercado con regla documentada |
| Absorción | Mercado | Pendiente | Inventario y ventas del mismo período |
| Oferta versus ventas | Mercado | Pendiente | Serie temporal conciliada |
| Evolución histórica | Mercado | Parcial | Serie temporal y cortes identificados |
| Exportación | Mercado | Pendiente | CSV/XLSX/PDF según vista |

## Módulo II — Valorización de Propiedades

| Requisito | Ruta principal | Estado inicial | Evidencia de aceptación |
|---|---|---:|---|
| Variables objetivas completas | `/dashboard/valorizador` | Parcial | Ficha persistida con campos contractuales |
| Variables subjetivas | Valorizador | Pendiente | Ajustes por conservación, orientación, vista, ruido y otros |
| Comparables utilizados | Valorizador | Pendiente | Tabla, mapa, selección y exclusión justificada |
| Valor comercial sugerido | Valorizador | Parcial | Cálculo reproducible |
| Rango de valorización | Valorizador | Pendiente | Límite inferior, central y superior |
| Ajustes efectuados | Valorizador | Pendiente | Registro por usuario y versión |
| Justificación | Valorizador | Pendiente | Texto basado en datos y ajustes aprobados |
| Informe exportable | Valorizador | Pendiente | PDF/DOCX con trazabilidad |
| Historial de versiones | Valorizador | Pendiente | Borrador, revisión, aprobado y emitido |

## Módulo III — Control de Gestión Comercial

| Requisito | Ruta principal | Estado inicial | Evidencia de aceptación |
|---|---|---:|---|
| Dashboard CEO | `/dashboard/ceo` | Parcial | Consolidado y detalle por oficina |
| Dashboard director | `/dashboard/director` | Parcial | Oficina, equipo y partners |
| Dashboard subdirector | Vista director | Pendiente | Acceso y alcance equivalente definido |
| Dashboard agente/partner | Dashboard personal | Parcial | Métricas personales y ranking |
| Captaciones | Control | Parcial | Total, oficina y persona |
| Ventas | Control | Parcial | Total, oficina y persona |
| Seguimiento | Control | Parcial | Actividad y tareas por rol |
| Conversión | Control | Parcial | Definición única y período |
| Productividad | Control | Pendiente | Fórmula acordada |
| Cumplimiento de metas | Control | Parcial | Metas versus resultado |
| Variación MoM | Control | Pendiente | Comparación mensual consistente |
| Variación YoY | Control | Pendiente | Comparación anual consistente |
| Rankings | Control | Parcial | Oficina, equipo y persona |
| Alertas | Control | Pendiente | Regla, severidad y responsable |

## Automatizaciones

| Requisito | Estado inicial | Evidencia de aceptación |
|---|---:|---|
| Dashboard interactivo | Parcial | Filtros y datos respaldados |
| Presentación ejecutiva | Parcial | Archivo generado y registrado |
| Presentación por oficina | Parcial | Archivo por oficina |
| Indicadores mensuales | Parcial | Período cerrado y reproducible |
| Indicadores acumulados | Parcial | YTD conciliado |
| Reportes periódicos | Pendiente | Programación, historial y distribución |

## Arquitectura y entregables

| Requisito | Estado inicial | Evidencia de aceptación |
|---|---:|---|
| PostgreSQL o equivalente | Implementado | Esquema y migraciones documentadas |
| ETL | Parcial | Jobs, registros y manejo de errores |
| APIs | Parcial | Inventario y contratos |
| Autenticación | Implementado | Pruebas de acceso |
| Perfiles y permisos | Parcial | Matriz CEO/director/subdirector/partner |
| Infraestructura cloud | Implementado | Inventario y ambientes |
| Repositorio Git | Implementado | Historial y acceso administrativo |
| Scripts de instalación | Pendiente | Instalación reproducible |
| Modelo de datos | Pendiente | Diagrama y diccionario |
| Documentación técnica | Parcial | Arquitectura, operación y despliegue |
| Documentación funcional | Parcial | Flujos y reglas |
| Manual de usuario | Pendiente | Procedimientos por rol |
| Manual de administración | Pendiente | Usuarios, fuentes, respaldos y configuración |
| Capacitación | Pendiente | Sesión, material y registro |

## Versión 2

Se mantienen fuera de los criterios de aceptación vigentes:

- copilotos por rol;
- casos ejecutivos;
- grafos de decisión;
- razonamiento avanzado;
- ML Lab;
- conocimiento corporativo;
- automatizaciones experimentales no descritas en el contrato.

## Definition of Done

Un requisito sólo puede marcarse como completo cuando:

- opera con datos reales o muestra explícitamente que la fuente está pendiente;
- conserva procedencia, período y metodología;
- respeta permisos por rol;
- tiene una prueba verificable;
- no depende de una funcionalidad de Versión 2;
- está documentado para operación y transferencia.
