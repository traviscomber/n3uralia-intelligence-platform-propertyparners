# Ficha de entrega — Cotizador público referencial

Fecha de consolidación: 2 de septiembre de 2026

## 1. Propósito

Esta ficha documenta el cotizador público referencial desarrollado para visitantes externos del sitio de Property Partners Vitacura.

El cotizador es una **mejora complementaria** de la entrega y no reemplaza ni modifica el Pilar II contractual de Valorización de Propiedades. El Valorizador Profesional autenticado mantiene su metodología, comparables, revisión humana, workflow, MFA/AAL2, snapshots, emisión y trazabilidad.

La incorporación de esta mejora no altera los criterios de aceptación contractual definidos en `docs/UAT_PROPERTY_PARTNERS.md`.

## 2. Estado de release

- Pull request: `#181` — `feat: add public referential property estimator`.
- Rama: `public-valuation-estimator-v1`.
- Head verificado: `363eafff6358f5b67f5b5662775eb1f43b8b1740`.
- Base del PR: `main` en `3fd42a54eb2fda2fab5e0a644a712b6ef4ef7aae`.
- Estado GitHub: `open`, `mergeable=true` al cierre de la validación.
- Preview Vercel del head: `READY`.
- `N3uralia IP Boundaries`: PASS.
- `Contractual modules CI`: PASS.
- Suite de valorización: 28/28 tests PASS durante el build validado, incluyendo los tres tests específicos del cotizador público.

Importante: mientras PR #181 no sea mergeado y desplegado a producción, esta mejora debe describirse como **candidato verificado de entrega**, no como funcionalidad productiva vigente.

## 3. Experiencia pública

La raíz `/` se convierte en una landing pública con:

- identidad Property Partners Vitacura;
- acceso explícito a `Iniciar sesión` para usuarios internos;
- cotizador público sin registro;
- explicación breve de alcance y metodología;
- CTA hacia valorización profesional.

El visitante entrega únicamente:

- sector en Vitacura;
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
- otros datos personales de contacto.

## 4. Cobertura inicial verificada

La versión V1 publica resultados sólo para **casas en Vitacura** y únicamente en sectores que cumplan el piso mínimo de evidencia.

Cobertura observada durante la validación del 2 de septiembre de 2026:

| Sector | Observaciones utilizables |
|---|---:|
| Club de Polo | 6 |
| La Llavería | 7 |
| Santa María | 11 |

El mínimo de publicación es **5 observaciones utilizables por sector**.

Si un sector no cumple el mínimo, el sistema no fabrica una cifra y responde cobertura insuficiente.

Los departamentos no se habilitan en V1 porque su resolución territorial todavía requiere revisión humana adicional. Esta restricción evita presentar precisión no respaldada por evidencia canónica.

## 5. Fuente y metodología

La evidencia proviene de publicaciones activas de oferta almacenadas en `market_current_listings`, cruzadas con la resolución territorial canónica de `market_neighborhood_review_items` y `market_neighborhoods`.

Para la versión pública sólo se consideran registros que cumplen simultáneamente:

1. operación `Venta`;
2. estado `active`;
3. tipo de propiedad `Casa`;
4. resolución territorial `clear`;
5. decisión `resolved_by_system`;
6. origen de resolución `system`;
7. barrio resuelto;
8. precio UF positivo;
9. superficie construida positiva.

El ratio utilizado se deriva explícitamente como:

`UF por m² construido = precio publicado en UF / superficie construida`

No se utiliza directamente el campo histórico `price_uf_m2` del feed para esta estimación porque durante la auditoría se verificó que dicho campo corresponde de forma consistente a superficie útil, no a superficie construida.

## 6. Cálculo del resultado

Para cada solicitud:

1. se forma el pool del mismo sector y tipo de propiedad;
2. si hay al menos 5 casos, se intenta refinar por superficie construida dentro de ±35%;
3. dormitorios y baños refinan la muestra sólo cuando el subconjunto resultante mantiene al menos 5 observaciones;
4. se calcula mediana de UF/m² construido;
5. se calcula rango intercuartil P25–P75;
6. la mediana y el rango se multiplican por la superficie construida ingresada;
7. el resultado final se redondea a decenas de UF.

El resultado muestra:

- estimación central en UF;
- rango de mercado en UF;
- muestra efectivamente usada;
- mediana de oferta en UF/m² construido;
- tamaño de la base del sector;
- fecha de observación más reciente cuando está disponible.

La salida se presenta explícitamente como **estimación automática referencial**, no como tasación.

## 7. Seguridad y aislamiento

La ruta pública habilitada es únicamente:

`/api/public/valuation-estimate`

Además permanece pública la ruta técnica existente `/api/release`.

El resto de `/api/*` continúa requiriendo autenticación según el proxy central.

Controles confirmados:

- `SUPABASE_SERVICE_ROLE_KEY` permanece server-only;
- el endpoint público usa acceso privilegiado sólo en servidor;
- la respuesta pública contiene agregados, no listings ni comparables crudos;
- no se exponen `raw_payload`, URLs de publicación, IDs internos ni datos personales;
- `/dashboard` mantiene guard independiente de sesión, rol y capacidad;
- sin sesión, `/dashboard` redirige a login;
- la ruta pública quedó registrada explícitamente en el manifiesto de revisión de aislamiento de tenants;
- el gate `N3uralia IP Boundaries` quedó PASS sobre el head final.

## 8. QA y regresiones

Se agregaron regresiones para validar:

- no publicar estimación con menos de 5 observaciones;
- mediana y rango intercuartil con muestra suficiente;
- no exponer sectores bajo el piso de evidencia.

El CI contractual ejecuta estas pruebas antes del build.

Validaciones adicionales realizadas sobre preview:

- landing pública accesible sin sesión;
- selector de cobertura muestra únicamente Club de Polo, La Llavería y Santa María;
- endpoint GET público responde únicamente scope, tipos, cobertura y metodología;
- `/dashboard` sigue protegido sin sesión;
- preview Vercel del head final queda `READY`.

## 9. Comparación con el valorizador público existente de Property Partners

Durante la revisión se inspeccionó el flujo público existente de Property Partners, que solicita, entre otros, tipo de propiedad, dormitorios, baños, estacionamientos, bodegas, superficie construida, terreno, antigüedad y rol.

La versión V1 de esta plataforma deliberadamente no replica campos cuya influencia todavía no puede sustentarse con evidencia canónica suficiente. Se prioriza un resultado menor en alcance pero auditable y reproducible.

## 10. Separación del Valorizador Profesional

El cotizador público no:

- crea expedientes de valorización profesional;
- selecciona ni expone comparables individuales;
- cambia la metodología contractual del Valorizador Profesional;
- ejecuta workflow Ejecutivo → Director → CEO;
- aprueba ni emite informes;
- sustituye MFA/AAL2;
- genera aceptación UAT del Pilar II.

El CTA de resultado deriva al servicio profesional de Property Partners.

## 11. Operación y límites conocidos

La cobertura pública crecerá sólo cuando la data canónica disponible permita hacerlo sin reducir el piso de calidad.

Reglas de operación V1:

- no bajar el mínimo de 5 observaciones para aumentar cobertura aparente;
- no habilitar departamentos hasta que su territorialidad esté suficientemente resuelta;
- no incorporar variables adicionales a la fórmula sin evidencia verificable;
- no presentar una publicación como transacción cerrada;
- mantener la etiqueta de estimación referencial visible;
- mantener el endpoint público limitado a agregados.

## 12. Tratamiento en la entrega contractual

Esta mejora debe registrarse como:

**Mejora complementaria no bloqueante — cotizador público referencial para captación/orientación externa.**

No modifica los tres pilares contractuales ni sus criterios de aceptación.

Antes de declararla incluida en producción corresponde:

1. mergear PR #181;
2. verificar el SHA resultante en Vercel producción;
3. comprobar `/`, `/api/public/valuation-estimate` y `/dashboard` en el dominio productivo;
4. confirmar gates del merge SHA;
5. actualizar esta ficha con el SHA productivo definitivo.
