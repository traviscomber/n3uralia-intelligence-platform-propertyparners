# Registro de dependencias del Cliente

## Propósito

Documentar de forma trazable los insumos, definiciones, accesos y aprobaciones que deben ser provistos o confirmados por el Cliente para completar los frentes contractuales pendientes. Este registro no declara incumplimiento; permite distinguir trabajo técnico pendiente de dependencias externas.

## Regla de actualización

Cada dependencia debe registrar:

- identificador;
- frente contractual;
- descripción exacta;
- responsable del Cliente;
- responsable de seguimiento N3uralia;
- fecha de solicitud;
- fecha comprometida;
- estado;
- evidencia de entrega o respuesta;
- impacto;
- nueva fecha objetivo cuando corresponda.

Estados permitidos:

- `not-requested`;
- `requested`;
- `partially-received`;
- `received-pending-validation`;
- `validated`;
- `waived-by-client`;
- `overdue`.

## Dependencias vigentes

### DEP-01 Base histórica CBR y ventas recientes

- Frente: inteligencia de mercado.
- Estado inicial: `requested`.
- Impacto: impide cerrar indicadores definitivos de absorción, velocidad de venta y oferta versus ventas.
- Evidencia requerida: archivo, fuente o acceso autorizado; período cubierto; responsable de calidad.

### DEP-02 KML oficial

- Frente: inteligencia de mercado.
- Estado inicial: `requested`.
- Impacto: limita validación territorial y geoespacial.
- Evidencia requerida: archivo KML/KMZ aprobado, versión y responsable.

### DEP-03 Definiciones finales de KPI

- Frente: CRM, dirección, agentes e inteligencia de mercado.
- Estado inicial: `requested`.
- Impacto: impide considerar definitivos algunos rankings, alertas, absorción, velocidad y oferta versus ventas.
- Evidencia requerida: diccionario aprobado, fórmula, fuente, frecuencia y responsable.

### DEP-04 Directorio de usuarios y roles

- Frente: UAT, seguridad y operación.
- Estado inicial: `requested`.
- Impacto: impide completar pruebas por perfil y traspaso operativo.
- Evidencia requerida: nombre, correo, rol, sucursal o alcance y aprobador.

### DEP-05 Calendario y destinatarios de reportes

- Frente: automatizaciones y reportes.
- Estado inicial: `requested`.
- Impacto: impide cerrar la configuración operativa de envíos.
- Evidencia requerida: frecuencia, día, horario, zona horaria, destinatarios, copias, aprobador y excepciones.

### DEP-06 Participantes y fechas de capacitación

- Frente: capacitación y traspaso.
- Estado inicial: `requested`.
- Impacto: impide ejecutar y evidenciar el traspaso.
- Evidencia requerida: participantes, roles, disponibilidad y responsable de aceptación.

### DEP-07 Criterios y responsables UAT

- Frente: UAT y aceptación.
- Estado inicial: `requested`.
- Impacto: impide iniciar la aceptación formal.
- Evidencia requerida: usuarios designados, ventana de pruebas, canal de observaciones y firmante autorizado.

### DEP-08 Titularidad y costos de terceros

- Frente: continuidad operativa.
- Estado inicial: `requested`.
- Impacto: impide cerrar responsabilidades posteriores a la entrega.
- Evidencia requerida: titular de Vercel, Supabase y servicios asociados; responsable de pago y administración.

## Criterio de cierre

Una dependencia puede marcarse `validated` sólo cuando el insumo fue recibido, revisado y vinculado a la evidencia correspondiente. Una renuncia debe quedar expresamente documentada como `waived-by-client` y reflejarse en el acta de aceptación.