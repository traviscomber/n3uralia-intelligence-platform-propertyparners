# Manual de usuario — Property Partners

Estado: operativo

## 1. Propósito

Este manual describe el uso actual de la plataforma según el rol autenticado. La navegación y las acciones disponibles se resuelven por capacidades; una función que no aparece para un usuario no debe asumirse como disponible.

## 2. Roles y alcance

### CEO

Alcance global sobre la organización. Puede consultar el consolidado ejecutivo, mercado, propiedades, valorizaciones, control de gestión e informes. También puede gestionar metas y alertas, asignaciones y aprobar valorizaciones.

Ruta inicial: `/dashboard/ceo`.

### Director y Subdirector

Alcance limitado a su oficina. Pueden consultar desempeño, propiedades, valorizaciones y control de gestión de su oficina; asignar propiedades dentro de su alcance, gestionar metas/alertas de oficina y revisar valorizaciones.

Ruta inicial: `/dashboard/director`.

### Partner

Alcance personal. Puede consultar su desempeño, propiedades asignadas, tareas, valorizaciones propias y reportes personales. Puede crear valorizaciones dentro de su alcance.

Ruta inicial: `/dashboard/partner`.

### Administrador técnico

Alcance global técnico. Puede gestionar fuentes, usuarios, configuración, propiedades, gestión e informes. El rol administrador no posee la capacidad de aprobación global de valorizaciones reservada al CEO.

## 3. Flujo principal de uso

La plataforma sigue esta secuencia operativa:

`Data canónica → inteligencia → acción → responsable → seguimiento → resultado → informe`

Los módulos no deben interpretarse como silos independientes. Mercado alimenta evidencia; Propiedades organiza activos y asignaciones; Valorizaciones transforma evidencia en una decisión revisable; Control de gestión convierte métricas y alertas en acciones; Informes consolida resultados por período.

## 4. Vista CEO

Ruta: `/dashboard/ceo`.

Uso principal:

- seleccionar el período;
- revisar resultado, cumplimiento, UF y acumulado;
- identificar oficinas o situaciones que requieren acción;
- acceder a Mercado, Propiedades, Informes y módulos de gestión;
- generar o abrir informes del período seleccionado.

La vista CEO está diseñada como una vista de comando. Los detalles técnicos de las fuentes no forman parte de la lectura principal.

## 5. Mercado

Ruta: `/dashboard/market`.

Permite consultar el estado canónico disponible del mercado. Los indicadores deben interpretarse según su cobertura y fecha de corte. Una publicación observada no equivale a una venta confirmada.

Rutas complementarias según permiso:

- `/dashboard/market/comparables`: consulta de evidencia comparable;
- `/dashboard/market/fuentes`: trazabilidad de fuentes e ingestiones;
- `/dashboard/market/import`: importación autorizada;
- `/dashboard/market/identidades`: resolución de identidad cuando corresponda.

Cuando una fuente esté en cuarentena o no tenga ejecución operativa, no debe considerarse equivalente a una fuente activa procesada.

## 6. Propiedades

Ruta: `/dashboard/properties`.

Permite consultar propiedades dentro del alcance del usuario. Dependiendo del rol, la vista puede mostrar cartera global, de oficina o personal.

Administración de asignaciones:

`/dashboard/properties/admin`

La asignación determina qué usuario u oficina puede operar sobre una propiedad en los flujos posteriores.

## 7. Valorizaciones

Ruta: `/dashboard/valuations`.

Flujo general:

1. crear o abrir un expediente;
2. identificar la propiedad;
3. incorporar comparables con evidencia;
4. registrar ajustes y justificación;
5. calcular rango y estimación;
6. enviar a revisión;
7. revisar, devolver o corregir;
8. aprobar cuando corresponda;
9. emitir el informe.

Una valorización en borrador o revisión es preliminar y no debe presentarse como emitida. La aprobación global corresponde al CEO. Dirección y subdirección pueden revisar dentro de su oficina; Partners trabajan sobre sus propios casos.

## 8. Control de gestión

Ruta: `/dashboard/control/operations`.

Permite revisar ejecuciones de carga, período y resultados de procesos comerciales disponibles.

Metas y alertas:

`/dashboard/control/admin`

Las metas pueden registrarse por entidad y período cuando el usuario posee permiso de gestión. Las reglas oficiales que dependan de definición del Cliente deben mantenerse como provisionales o no disponibles hasta su aprobación.

## 9. Informes

CEO:

`/dashboard/reportes/canonicos`

Dirección/Subdirección:

`/dashboard/reportes/autonomos`

Partner:

`/dashboard/reportes/audiencias/ejecutivo`

Los informes deben construirse desde datos persistidos y trazables. Un informe no debe completar información ausente mediante datos ficticios, placeholders o inferencias presentadas como hechos.

## 10. Estados de datos

La interfaz puede mostrar estados equivalentes a:

- datos listos;
- cobertura parcial;
- datos insuficientes;
- fuente en cuarentena;
- ejecución fallida;
- información sin vigencia reciente.

Estos estados son parte del producto y no deben ocultarse para completar visualmente una métrica.

## 11. Errores y datos faltantes

Cuando no exista evidencia suficiente, la plataforma debe mostrar ausencia de datos o un estado parcial. No corresponde reemplazar esos valores con estimaciones no aprobadas.

Ante un error persistente de fuente o ingestión, revisar `/dashboard/market/fuentes` o escalar al administrador técnico.

## 12. Funciones pendientes de definición externa

Este manual no fija como oficiales:

- fórmula definitiva de captaciones;
- reglas y desempates de rankings;
- umbrales definitivos de alertas;
- calendario y destinatarios finales de distribución;
- fuentes de ventas recientes que aún no hayan sido entregadas y validadas;
- KML definitivo si aún no ha sido aceptado como fuente oficial.

Hasta contar con esas definiciones, la plataforma debe mantener estados provisionales, parciales o `n/d` según corresponda.
