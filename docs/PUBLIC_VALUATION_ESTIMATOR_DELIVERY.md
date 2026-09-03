# Ficha de entrega — Cotizador público referencial

Fecha de actualización: 3 de septiembre de 2026

## 1. Propósito y límite de alcance

El cotizador público referencial es una mejora complementaria para visitantes externos de Property Partners Vitacura.

Su alcance permanece deliberadamente restringido a:

- comuna: **Vitacura**;
- tipo de propiedad: **Casa**;
- operación: **Venta**;
- resultado: **estimación automática referencial de oferta**, no tasación.

No reemplaza ni modifica el Pilar II contractual de Valorización de Propiedades. El Valorizador Profesional autenticado conserva comparables, juicio profesional, revisión humana, workflow Ejecutivo → Director → CEO, MFA/AAL2, snapshots, emisión y trazabilidad.

No se habilitan departamentos ni otras comunas.

## 2. Estado de release

### V1 productiva

PR #181 (`feat: add public referential property estimator`) fue mergeado el 2 de septiembre de 2026. La raíz `/` funciona como landing pública y `/dashboard` mantiene autenticación independiente.

### Hardening Vitacura productivo

PR #183 (`polish: Vitacura responsive UX and estimator coverage`) también fue mergeado el 2 de septiembre de 2026, commit de integración `4dacae91757d1f67d14a3ac443dded212a14fa0d`.

El comportamiento productivo vigente:

- expone los 19 sectores del KML canónico de Property Partners Vitacura;
- si un sector tiene ≥5 observaciones utilizables, calcula con evidencia sectorial;
- si tiene <5, no baja el piso: usa una **referencia general de Vitacura**, rotulada explícitamente;
- mantiene el mínimo de cinco observaciones utilizables;
- deriva UF/m² construido como precio UF / superficie construida;
- dormitorios y baños refinan sólo si queda evidencia suficiente;
- no captura datos personales ni expone listings crudos.

La verificación directa de producción del 3 de septiembre de 2026 confirmó la landing, los 19 sectores, la clasificación entre muestra sectorial y referencia general de Vitacura, el mínimo de cinco observaciones y la separación explícita respecto del Valorizador Profesional.

## 3. Experiencia pública

El visitante entrega únicamente:

- sector canónico de Vitacura;
- superficie construida;
- dormitorios, opcional;
- baños, opcional.

El cotizador no solicita ni persiste nombre, email, teléfono, RUT, dirección exacta, rol de propiedad ni datos personales de contacto.

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

La evidencia usada para aceptar PR #183 registró 44 casas activas, 44/44 con barrio KML resoluble y 41/44 utilizables para UF/m² construido. En ese corte, Santa María, La Llavería y Club de Polo superaban el piso sectorial.

Esos conteos son **evidencia histórica del release**, no un inventario fijo. La cobertura productiva es dinámica y se recalcula desde evidencia live; el nivel `sector` o `Vitacura` no depende de una lista manual.

## 5. Fuente y resolución territorial

La capa pública usa exclusivamente la fuente dedicada de casas de Vitacura y la territorialidad canónica utilizada por Inteligencia de Mercado.

Una observación debe cumplir las condiciones de operación, estado, tipo, precio UF y superficie construida requeridas por el modelo. La resolución territorial privilegia el barrio canónico y, cuando corresponde, la última resolución territorial aceptada o resuelta por sistema dentro del mismo KML.

Las publicaciones sin superficie construida válida no entran al cálculo público de UF/m² construido.

## 6. Base de cálculo

`UF/m² construido = precio publicado en UF / superficie construida`

El campo upstream `price_uf_m2` no se usa directamente porque no es consistentemente equivalente a esa definición para casas.

La metodología:

1. exige al menos cinco observaciones utilizables;
2. usa pool sectorial cuando cumple el piso y, en caso contrario, pool general de Vitacura;
3. puede refinar por superficie construida dentro de ±35% sólo si permanecen ≥5 observaciones;
4. dormitorios y baños son opcionales y sólo refinan con cobertura suficiente;
5. calcula mediana UF/m² construido;
6. calcula rango intercuartil P25–P75;
7. multiplica por superficie construida ingresada;
8. redondea el resultado a decenas de UF.

No se reduce el piso mínimo para aumentar cobertura aparente.

## 7. Transparencia del resultado

Cada resultado expone estimación central, rango P25–P75, mediana de oferta UF/m² construido, observaciones usadas, evidencia territorial y base utilizada.

Cuando el sector no reúne cinco observaciones utilizables, la interfaz informa explícitamente que la cifra corresponde a una referencia general de Vitacura. No se presenta como estimación propia del sector.

## 8. Seguridad y aislamiento

La ruta pública funcional es `/api/public/valuation-estimate`; además permanece la ruta técnica pública `/api/release`.

Controles vigentes:

- `SUPABASE_SERVICE_ROLE_KEY` permanece server-only;
- el endpoint público devuelve agregados y metadatos de cobertura, nunca listings/comparables crudos;
- no expone `raw_payload`, URLs de publicación, IDs internos ni datos personales;
- valida sectores contra el KML canónico;
- `propertyType` público permanece restringido a `Casa`;
- `/dashboard` mantiene su guard de sesión y rol;
- los gates N3uralia IP Boundaries siguen siendo parte obligatoria del release.

## 9. Responsive y accesibilidad

El hardening integrado por PR #183 incluye tipografía fluida, controles táctiles de 48 px, inputs seguros en mobile, layout apilable para dormitorios/baños, CTA full-width en mobile, foco visible y primitives compartidos del dashboard adaptados a layouts estrechos.

## 10. QA y regresiones

PR #183 fue integrado después de pasar Contractual modules CI, N3uralia IP Boundaries y preview Vercel READY. La suite específica cubre cálculo sectorial, fallback Vitacura, piso mínimo de cinco, catálogo territorial y refinamientos opcionales.

La aceptación UAT del cliente permanece separada: la disponibilidad productiva del cotizador no sustituye aceptación contractual de los tres pilares.

## 11. Separación del Valorizador Profesional

El cotizador público no crea expedientes profesionales, no muestra comparables individuales, no usa ni sustituye el workflow Ejecutivo → Director → CEO, no aprueba ni emite informes y no convierte una publicación activa en compraventa cerrada.

## 12. Tratamiento de entrega

Clasificación vigente:

**Mejora complementaria productiva y no bloqueante — cotizador público referencial para casas en Vitacura.**

No amplía los tres pilares contractuales ni cambia sus criterios de aceptación. El crecimiento futuro de cobertura debe permanecer dentro de Vitacura mientras ése sea el alcance aprobado y sólo promover un sector a estimación sectorial cuando la evidencia live cumpla el piso definido.
