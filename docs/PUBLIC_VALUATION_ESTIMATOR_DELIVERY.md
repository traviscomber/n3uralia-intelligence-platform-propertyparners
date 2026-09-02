# Ficha de entrega — Cotizador público referencial

Fecha de actualización: 2 de septiembre de 2026

## 1. Estado actual

El cotizador público referencial está desplegado en producción como mejora complementaria de Property Partners Vitacura.

Producción: `https://ppartnersgroup.app`

Baseline productivo verificado:

- `main`: `4dacae91757d1f67d14a3ac443dded212a14fa0d`;
- Vercel deployment: `dpl_9CtkvZ3LXXtRms9a9RccPHkb5TH8`;
- estado: `READY`;
- PR de hardening: `#183` — mergeado;
- QA visual directa: PASS en desktop y viewport móvil estrecho;
- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS.

La raíz `/` funciona como landing pública con cotizador. `/dashboard` conserva autenticación y autorización separadas.

## 2. Propósito y límite de alcance

El cotizador entrega una estimación automática referencial de oferta para visitantes externos.

Alcance deliberadamente restringido:

- comuna: **Vitacura**;
- tipo de propiedad: **Casa**;
- operación: **Venta**;
- resultado: **estimación referencial de oferta**, no tasación ni valorización profesional.

No habilita departamentos ni otras comunas.

No reemplaza ni modifica el Pilar II contractual de Valorización de Propiedades. El Valorizador Profesional autenticado mantiene comparables individuales, juicio profesional, revisión humana, workflow Ejecutivo → Director → CEO, MFA/AAL2, snapshots, emisión e historial.

## 3. Experiencia pública

El visitante entrega únicamente:

- sector canónico de Vitacura;
- superficie construida;
- dormitorios, opcional;
- baños, opcional.

No se solicita ni persiste:

- nombre;
- email;
- teléfono;
- RUT;
- dirección exacta;
- rol de propiedad;
- otros datos personales de contacto.

La interfaz informa antes del cálculo si la muestra permite estimación sectorial o si debe usar una referencia general de Vitacura.

## 4. Cobertura canónica

El catálogo territorial procede del KML canónico `kml_vitacura_barrios_2026_08_12`.

Sectores disponibles:

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

Snapshot auditado durante el hardening del 2 de septiembre de 2026:

- 44 casas activas en la fuente dedicada `portal-inmobiliario-vitacura-portal-houses`;
- 44/44 con barrio KML resoluble mediante la lógica canónica;
- 41/44 con precio UF y superficie construida válidos para UF/m² construido.

Sectores que alcanzaban el piso sectorial de 5 observaciones utilizables:

| Sector | Observaciones utilizables |
|---|---:|
| Santa María | 12 |
| La Llavería | 7 |
| Club de Polo | 6 |

Los demás sectores siguen siendo seleccionables, pero el resultado se presenta como **referencia general de Vitacura** mientras no alcancen el piso sectorial.

La cobertura es dinámica. Los números anteriores son un snapshot de auditoría, no valores hardcodeados.

## 5. Fuente y resolución territorial

La capa pública usa la fuente dedicada de casas de Vitacura y la misma territorialidad canónica utilizada por Inteligencia de Mercado.

Para participar en el cálculo UF/m², una publicación debe cumplir:

1. fuente `portal-inmobiliario-vitacura-portal-houses`;
2. operación `Venta`;
3. estado `active`;
4. tipo `Casa`;
5. precio UF positivo;
6. superficie construida positiva.

Resolución de barrio:

1. barrio de la propiedad canónica si pertenece al KML oficial de Vitacura;
2. si no existe, última resolución territorial aceptada o `resolved_by_system`, siempre que el barrio pertenezca al mismo KML.

Una publicación activa puede formar parte de métricas de oferta aunque no sirva para UF/m² construido. Por eso “casas activas” y “observaciones utilizables” no son métricas equivalentes.

## 6. Base de cálculo

El ratio público se deriva explícitamente:

`UF/m² construido = precio publicado en UF / superficie construida`

El campo upstream `price_uf_m2` no se usa directamente porque la auditoría demostró que no es consistentemente equivalente al cálculo sobre superficie construida para casas.

Metodología:

1. medir observaciones utilizables del sector;
2. si hay >=5, usar pool sectorial;
3. si hay <5, usar pool general de Vitacura;
4. intentar refinar por superficie construida dentro de ±35% sólo si permanecen >=5 observaciones;
5. dormitorios y baños refinan únicamente cuando existe cobertura suficiente y el subconjunto mantiene >=5 observaciones;
6. calcular mediana UF/m² construido;
7. calcular rango intercuartil P25–P75;
8. multiplicar por la superficie construida ingresada;
9. redondear resultado a decenas de UF.

El piso mínimo no se reduce para aumentar cobertura aparente.

## 7. Transparencia del resultado

Cada resultado expone, según disponibilidad:

- estimación central en UF;
- rango P25–P75 en UF;
- mediana de oferta UF/m² construido;
- observaciones efectivamente usadas;
- evidencia del sector seleccionado;
- base territorial usada: sector o Vitacura;
- observación más reciente.

Si el sector tiene menos de cinco observaciones utilizables, la interfaz lo declara explícitamente y no presenta la cifra como estimación propia del sector.

## 8. Seguridad y aislamiento

Ruta pública funcional:

`/api/public/valuation-estimate`

Controles:

- `SUPABASE_SERVICE_ROLE_KEY` permanece server-only;
- acceso privilegiado sólo desde servidor;
- respuesta pública limitada a agregados y metadatos de cobertura;
- no se exponen `raw_payload`, URLs de publicación, IDs internos ni comparables/listings crudos;
- el endpoint valida que el sector pertenezca a los 19 barrios KML;
- `propertyType` público permanece restringido a `Casa`;
- `/dashboard` conserva guard de sesión/rol independiente;
- `N3uralia IP Boundaries` debe permanecer PASS en releases futuros.

## 9. Responsive y accesibilidad

Hardening productivo verificado:

- jerarquía tipográfica fluida;
- controles táctiles de tamaño adecuado;
- inputs con tamaño seguro en mobile;
- dormitorios/baños apilables en pantallas estrechas;
- CTA de resultado full-width en mobile;
- focus visible;
- agrupación semántica del selector por nivel de evidencia;
- acciones de workspace apilables en mobile;
- `MetricStrip` adaptable;
- reducción de padding anidado;
- prevención de overflow horizontal.

QA visual directa fue ejecutada sobre preview y el mismo código fue posteriormente desplegado a producción.

## 10. QA y regresiones

La suite específica cubre:

- no publicar cifra si la muestra general de Vitacura no llega a cinco;
- cálculo sectorial cuando existe muestra suficiente;
- fallback a Vitacura sin reducir el piso;
- catálogo de los 19 barrios y clasificación `sector` / `vitacura`;
- no perder cálculo válido por escasez de dormitorios/baños;
- mantenimiento de la metodología `median-active-offer-built-uf-m2`.

Gate final previo a merge de PR #183:

- `Contractual modules CI`: PASS;
- `N3uralia IP Boundaries`: PASS;
- preview Vercel: `READY`;
- runtime revisado sin warnings/errors/fatal atribuibles al cambio;
- QA visual desktop: PASS;
- QA visual mobile: PASS;
- cálculo y fallback verificados.

Después del merge, el deployment productivo del SHA `4dacae91757d1f67d14a3ac443dded212a14fa0d` quedó `READY`.

## 11. Separación del Valorizador Profesional

El cotizador público no:

- crea expedientes profesionales;
- muestra comparables individuales;
- aplica el workflow Ejecutivo → Director → CEO;
- aprueba ni emite informes;
- sustituye MFA/AAL2;
- modifica la metodología contractual del Valorizador Profesional;
- convierte oferta activa en compraventa confirmada;
- constituye aceptación UAT del Pilar II.

## 12. Clasificación de entrega

**Mejora complementaria productiva y no bloqueante — cotizador público referencial para casas en Vitacura.**

No amplía los tres pilares contractuales ni sus criterios de aceptación. Cualquier crecimiento de cobertura debe mantener la misma disciplina: sólo promover un sector a estimación sectorial cuando la evidencia live alcance el piso definido.