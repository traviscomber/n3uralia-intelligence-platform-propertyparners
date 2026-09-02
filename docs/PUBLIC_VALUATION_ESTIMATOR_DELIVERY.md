# Ficha de entrega — Cotizador público referencial

Fecha de actualización: 2 de septiembre de 2026

## 1. Propósito y límite de alcance

El cotizador público referencial es una mejora complementaria para visitantes externos de Property Partners Vitacura.

Su alcance permanece deliberadamente restringido a:

- comuna: **Vitacura**;
- tipo de propiedad: **Casa**;
- operación: **Venta**;
- resultado: **estimación automática referencial de oferta**, no tasación.

No reemplaza ni modifica el Pilar II contractual de Valorización de Propiedades. El Valorizador Profesional autenticado conserva comparables, juicio profesional, revisión humana, workflow Ejecutivo → Director → CEO, MFA/AAL2, snapshots, emisión y trazabilidad.

No se habilitan departamentos ni otras comunas mediante este hardening.

## 2. Estado de release

### V1 productiva

PR #181 incorporó el cotizador público inicial a producción. La raíz `/` funciona como landing pública y `/dashboard` mantiene autenticación independiente.

La primera versión publicaba únicamente sectores con al menos cinco observaciones utilizables por sector.

### Hardening Vitacura — candidato PR #183

PR #183 (`polish: Vitacura responsive UX and estimator coverage`) amplía la experiencia territorial **sin ampliar la comuna ni bajar el piso de evidencia**:

- los 19 sectores del KML canónico de Property Partners Vitacura son seleccionables;
- sectores con ≥5 observaciones utilizables reciben una estimación sectorial;
- sectores con <5 observaciones no reciben una falsa estimación sectorial: usan una **referencia general de Vitacura**, identificada explícitamente en selector y resultado;
- el mínimo de cálculo continúa siendo cinco observaciones utilizables;
- se mejora responsive, foco, tamaño de controles y jerarquía visual de la landing y de primitives compartidos del dashboard.

Mientras PR #183 no esté mergeado y verificado en producción, este comportamiento debe describirse como **candidato de release**, no como estado productivo vigente.

## 3. Experiencia pública

El visitante entrega únicamente:

- sector canónico de Vitacura;
- superficie construida;
- dormitorios, opcional;
- baños, opcional.

El cotizador no solicita ni persiste:

- nombre;
- email;
- teléfono;
- RUT;
- dirección exacta;
- rol de propiedad;
- datos personales de contacto.

La interfaz informa antes del cálculo si el sector seleccionado tiene muestra sectorial suficiente o si el resultado usará la referencia general de Vitacura.

## 4. Cobertura canónica de Vitacura

El catálogo territorial procede exclusivamente del KML canónico `kml_vitacura_barrios_2026_08_12`.

Sectores canónicos disponibles:

1. Alonso de Córdova
2. Bicentenario
3. Club de Polo
4. Club Manquehue
5. El Aromo
6. Gerónimo de Alderete
7. Jardín del Este
8. La Llavería
9. Las Nieves
10. Las Tranqueras
11. Lo Curro
12. Luis Pasteur
13. Nueva Costanera
14. Pio XI
15. Plaza Raúl Deves (Plaza del Hoyo)
16. San Damián
17. Santa María
18. Sport Frances
19. Tabancura

Evidencia live auditada antes de PR #183:

- 44 casas activas en la fuente dedicada `portal-inmobiliario-vitacura-portal-houses`;
- 44/44 con barrio KML resoluble mediante la lógica canónica actual;
- 41/44 con precio UF y superficie construida válidos para el cálculo UF/m² construido.

Sectores que hoy alcanzan el piso sectorial de cinco observaciones utilizables:

| Sector | Observaciones utilizables auditadas |
|---|---:|
| Santa María | 12 |
| La Llavería | 7 |
| Club de Polo | 6 |

Los demás sectores siguen siendo seleccionables porque pertenecen al universo territorial canónico de Vitacura, pero su resultado se etiqueta como **referencia general de Vitacura** mientras no alcancen cinco observaciones utilizables propias.

La cobertura es dinámica: el nivel `sector` o `Vitacura` se calcula desde la evidencia live disponible, no desde una lista manual fija.

## 5. Fuente y resolución territorial

La capa pública usa exclusivamente la fuente dedicada de casas de Vitacura y la territorialidad canónica ya utilizada por Inteligencia de Mercado.

Una publicación debe cumplir:

1. fuente `portal-inmobiliario-vitacura-portal-houses`;
2. operación `Venta`;
3. estado `active`;
4. tipo `Casa`;
5. precio UF positivo;
6. superficie construida positiva para participar en el cálculo UF/m².

La resolución de barrio sigue este orden:

1. barrio de la propiedad canónica si pertenece al KML oficial de Vitacura;
2. si no existe, última resolución territorial aceptada o `resolved_by_system`, siempre que el barrio pertenezca al mismo KML.

Las publicaciones sin superficie construida válida pueden formar parte de otras métricas de oferta, pero no entran al cálculo público de UF/m² construido.

## 6. Base de cálculo

El ratio público se deriva explícitamente:

`UF/m² construido = precio publicado en UF / superficie construida`

El campo upstream `price_uf_m2` **no se usa directamente**, porque la auditoría demostró que no es consistentemente equivalente a `precio UF / superficie construida` para casas. No se atribuye un significado alternativo no verificado a ese campo.

La metodología permanece:

1. determinar si el sector tiene al menos cinco observaciones utilizables;
2. si las tiene, usar pool sectorial; si no, usar pool general de Vitacura;
3. intentar refinar por superficie construida dentro de ±35%, sólo si permanecen ≥5 observaciones;
4. dormitorios y baños son opcionales y sólo refinan cuando el atributo tiene cobertura suficiente y el subconjunto mantiene ≥5 observaciones;
5. calcular mediana UF/m² construido;
6. calcular rango intercuartil P25–P75;
7. multiplicar por la superficie construida ingresada;
8. redondear el resultado a decenas de UF.

No se reduce el piso mínimo para aumentar cobertura aparente.

## 7. Transparencia del resultado

Cada resultado expone:

- estimación central en UF;
- rango P25–P75 en UF;
- mediana de oferta UF/m² construido;
- cantidad de observaciones efectivamente usadas;
- cantidad de evidencia del sector seleccionado;
- base territorial usada: sector o Vitacura;
- observación más reciente cuando está disponible.

Si el sector tiene menos de cinco observaciones utilizables, la interfaz informa explícitamente que la cifra es una referencia general de Vitacura. No se presenta como estimación propia del sector.

## 8. Seguridad y aislamiento

La ruta pública funcional continúa siendo únicamente:

`/api/public/valuation-estimate`

Además permanece la ruta técnica pública existente `/api/release`.

Controles:

- `SUPABASE_SERVICE_ROLE_KEY` permanece server-only;
- el acceso privilegiado se ejecuta únicamente en la route handler del servidor;
- la respuesta pública contiene agregados y metadatos de cobertura, nunca listings/comparables crudos;
- no se exponen `raw_payload`, URLs de publicación, IDs internos o datos personales;
- el endpoint valida que el sector solicitado pertenezca a los 19 barrios KML de Vitacura;
- `propertyType` público continúa bloqueado a `Casa`;
- `/dashboard` conserva su guard independiente de sesión y rol;
- `N3uralia IP Boundaries` debe permanecer PASS para cada release.

## 9. Responsive y accesibilidad — PR #183

El hardening de entrega incorpora:

- jerarquía tipográfica fluida para evitar clipping en mobile;
- controles con altura táctil mínima de 48 px en el cotizador;
- inputs de 16 px en mobile para evitar zoom involuntario;
- dormitorios/baños apilables en pantallas estrechas;
- CTA de resultado full-width en mobile;
- focus visible en controles interactivos;
- agrupación semántica del selector por nivel de evidencia;
- acciones de `WorkspaceHeader` apilables en mobile;
- `MetricStrip` en dos columnas en pantallas estrechas y cuatro en desktop;
- reducción de padding anidado en workspaces densos;
- campos/selects de workspace con ancho seguro en layouts estrechos.

## 10. QA y regresiones

La suite específica cubre:

- no publicar cifra si ni siquiera la muestra general de Vitacura alcanza cinco observaciones;
- cálculo sectorial cuando un sector alcanza el piso;
- fallback a Vitacura sin reducir el piso de cinco;
- catálogo de los 19 barrios con clasificación `sector` o `vitacura`;
- no perder un cálculo válido por datos opcionales escasos de dormitorios/baños;
- mantenimiento de la metodología `median-active-offer-built-uf-m2`.

Antes de merge de PR #183 se requieren:

1. `Contractual modules CI` PASS;
2. `N3uralia IP Boundaries` PASS;
3. Vercel preview `READY`;
4. ausencia de errores/warnings de runtime atribuibles al cambio;
5. QA visual responsive cuando exista navegador de preview disponible;
6. verificación de cálculo sectorial y fallback Vitacura.

La aceptación UAT del cliente permanece separada.

## 11. Separación del Valorizador Profesional

El cotizador público no:

- crea expedientes profesionales;
- selecciona ni muestra comparables individuales;
- usa el workflow Ejecutivo → Director → CEO;
- aprueba ni emite informes;
- sustituye MFA/AAL2;
- modifica la metodología contractual del Valorizador Profesional;
- convierte una publicación activa en una compraventa cerrada;
- genera aceptación UAT del Pilar II.

El CTA deriva al servicio profesional de Property Partners.

## 12. Tratamiento de entrega

Clasificación:

**Mejora complementaria no bloqueante — cotizador público referencial para casas en Vitacura.**

No amplía los tres pilares contractuales ni cambia sus criterios de aceptación. El crecimiento futuro de cobertura debe mantenerse dentro de Vitacura mientras ése sea el alcance aprobado y sólo promover un sector a estimación sectorial cuando la evidencia live cumpla el piso definido.
