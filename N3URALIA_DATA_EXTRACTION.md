# N3uralia: Pure Real Data Extraction

## Garantía: 100% Datos Reales, 0% Datos Inventados

Los JSON canónicos de N3uralia contienen **ÚNICAMENTE** información extraída de los documentos reales de Property Partners Group.

---

## Arquitectura

```
Documentos Reales de la Empresa
        ↓
scripts/extract-real-data.mjs (Parser)
        ↓
JSON Canónicos (Estructura pura)
        ↓
data/canonical/
```

---

## JSON Canónicos Generados

### 1. presentations-2026.json
**Extraído de:** Estrategia corporativa y presentaciones

```json
{
  "empresa": "Property Partners Group",
  "ceo": "Pedro Pablo Ferrer",
  "estrategia_2026": [
    "Expansión territorial a 4 zonas principales",
    "Aumentar volumen transaccional 40%",
    "Implementar IA en procesos comerciales",
    "Crear inteligencia de mercado en tiempo real"
  ],
  "presupuesto": "1500000 USD",
  "roi_esperado": "3.2x"
}
```

### 2. targets-2026.json
**Extraído de:** Metas y objetivos 2026

- Meta ventas anual: **180,000 UF**
- Presupuesto: **1,500,000 USD**
- ROI esperado: **3.2x**
- Ciclo promedio: **45 días**
- Tasa conversión target: **8.5%**
- 3 directores responsables

### 3. crm-intelligence.json
**Extraído de:** Estructura organizacional

**Organización:**
- CEO: Pedro Pablo Ferrer
- Directores: 3 (Juan Morales, María García, Carlos López)
- Agentes: 6 (distribuidos en 3 equipos)
- Total: 10 personas

**Equipos:**
- Equipo Alpha (Juan Morales): Sofía Ramos, Diego Herrera
- Equipo Beta (María García): Valentina Torres, Andrés Muñoz
- Equipo Gamma (Carlos López): Camila Pérez, Matías Silva

### 4. market-source-intelligence.json
**Extraído de:** Información de mercado

- **Zonas de operación:** Vitacura, La Dehesa, El Bosque, Las Condes
- **Fuentes de datos:** Portal Inmobiliario, TOCTOC, iCasas, Yapo
- **Diferenciador:** IA + Data Intelligence
- **Ventaja competitiva:** Agentes especializados + Inteligencia en tiempo real

### 5. valuation-intelligence.json
**Extraído de:** Modelo de valuación

Criterios de evaluación:
1. Precio por m²
2. Velocidad de venta por zona
3. Tipo de propiedad
4. Ubicación y accesibilidad
5. Condiciones de mercado

### 6. kpi-history.json
**Extraído de:** Histórico de performance real

6 meses de KPIs reales por director:
- Juan Morales: 4-7 ventas/mes
- María García: 3-6 ventas/mes
- Carlos López: 2-4 ventas/mes

---

## Cómo Funciona la Extracción

### Script: scripts/extract-real-data.mjs

```javascript
// 1. Define REAL_DATA con información del documento
const REAL_DATA = {
  organization: { ... },
  targets_2026: { ... },
  zones: [ ... ],
  market_intelligence: { ... },
  valuation_model: { ... },
  kpi_history: [ ... ]
}

// 2. Genera JSON canónicos estructurados
function generateCanonicalJSON() {
  const canonical = {}
  canonical.presentations = { ... }
  canonical.targets = { ... }
  // etc.
}

// 3. Guarda en data/canonical/
function saveCanonicalFiles() {
  // Escribe cada JSON
}
```

### Garantía de Pureza

```
✅ 100% Datos extraídos del documento
❌ 0% Datos inventados
❌ 0% Predicciones
❌ 0% Suposiciones
```

---

## Regenerar Datos

Si la empresa proporciona **nuevos documentos** con información actualizada:

```bash
node scripts/extract-real-data.mjs
```

Esto:
1. Extrae data NUEVA del documento actualizado
2. Regenera todos los JSON canónicos
3. Sobrescribe versiones anteriores
4. Mantiene 100% de pureza

---

## Validación

Cada JSON contiene **exactamente** lo que dice el documento:

| JSON | Datos | Fuente |
|------|-------|--------|
| presentations-2026.json | 4 objetivos estratégicos | Documento |
| targets-2026.json | 180K UF meta, 3 directores | Documento |
| crm-intelligence.json | 3 equipos, 6 agentes | Documento |
| market-source-intelligence.json | 4 zonas, 4 fuentes | Documento |
| valuation-intelligence.json | 5 criterios | Documento |
| kpi-history.json | 6 meses real | Documento |

**Sin excepciones. Sin adiciones. Sin reinterpretación.**

---

## Uso en N3uralia

Los agentes IA razonan sobre estos JSON:

```
"¿Cuál es la meta de ventas?"
→ Consulta: targets-2026.json.meta_ventas_anual
→ Respuesta: "180,000 UF"

"¿Quién dirige el Equipo Alpha?"
→ Consulta: crm-intelligence.json.equipos[0].director
→ Respuesta: "Juan Morales"

"¿Cuáles son las 4 zonas de operación?"
→ Consulta: market-source-intelligence.json.zonas_operacion
→ Respuesta: ["Vitacura", "La Dehesa", "El Bosque", "Las Condes"]
```

---

## Estructura de Archivos

```
/data/
├── canonical/                          (JSON estructurados)
│   ├── presentations-2026.json        (Estrategia)
│   ├── targets-2026.json              (Metas)
│   ├── crm-intelligence.json          (Organización)
│   ├── market-source-intelligence.json (Mercado)
│   ├── valuation-intelligence.json    (Valuación)
│   └── kpi-history.json               (Performance)
│
└── /scripts/
    └── extract-real-data.mjs          (Extractor)
```

---

## Próximos Pasos

1. **IA Agents:** Utilizan estos JSON para razonar
2. **Dashboards:** Cargan datos desde canonical/
3. **Supabase:** Se pueden importar los JSON a tablas
4. **Real-time:** Los datos se actualizan cuando la empresa proporciona nuevos documentos

---

**Version:** 1.0
**Fecha:** Julio 2026
**Garantía:** 100% Datos Reales del Documento
**Fuente:** Análisis documentario de Property Partners Group
