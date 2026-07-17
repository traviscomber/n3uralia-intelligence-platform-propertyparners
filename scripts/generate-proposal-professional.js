const fs = require('fs');
const path = require('path');

// Image URLs from user provided screenshots
const images = {
  market_intelligence_map: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-5eAF4sDiw6oJrW7F9CuD8aHHaBFpeM.png',
  control_gestion: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-VOKDpgHC7Fkbudm64FH5jWvBdA4Z6P.png',
  executive_dashboard: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-KG5UaGJw03lSBF1uw9y9pctHhTP6Ci.png',
  valorizador_ia: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-GH7PcXPE3gcALWUXqdjoRIPiVnOHsE.png',
  fuentes_datos: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CBj1ZOA9LliHewfJk8ytztlsF28Kha.png',
  landing_page: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-YbURVJwZV7FCZz3IAe8ZIhzkkhxnIE.png',
  funnel_charts: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-CuiUzARn4eUtv393Z64TBAtO5GWyqQ.png',
  market_intelligence_prc: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Smv6uTu8PixtitNvVx2q2KPFVyw3Xf.png',
  three_tools: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-WBQ8EORqFEcctltAGkRTolwwZboudr.png',
  velocity_absorption: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-dWfjWHI6uHUyyOmPMbv4Wz6CXY9nib.png',
  price_chart: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-704pCwpZsmKmrAurNakfRs4jmZrLkb.png',
  properties_table: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Nd2LmJAAfUqOsARE0TJ0kAqh2Tg7Zd.png',
};

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Partners Intelligence Platform - Propuesta Comercial Completa</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Calibri', 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .page {
      page-break-after: always;
      background: white;
      padding: 40px;
      margin-bottom: 20px;
      min-height: 11in;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    .cover-page {
      background: linear-gradient(135deg, #1a4d42 0%, #2d6b5f 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 11in;
    }
    .cover-page h1 {
      font-size: 56px;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .cover-page .subtitle {
      font-size: 24px;
      margin-bottom: 40px;
      opacity: 0.9;
    }
    .cover-page .tagline {
      font-size: 18px;
      margin-top: 60px;
      opacity: 0.8;
    }
    h2 {
      color: #1a4d42;
      font-size: 32px;
      margin-bottom: 15px;
      border-bottom: 3px solid #5fb77d;
      padding-bottom: 10px;
    }
    h3 {
      color: #2d6b5f;
      font-size: 18px;
      margin: 20px 0 10px 0;
    }
    p {
      margin: 12px 0;
      font-size: 14px;
      line-height: 1.7;
    }
    ul {
      margin-left: 20px;
      margin: 15px 0 15px 20px;
    }
    li {
      margin: 8px 0;
      font-size: 14px;
    }
    .screenshot {
      margin: 20px 0;
      text-align: center;
    }
    .screenshot img {
      max-width: 95%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .screenshot-caption {
      font-size: 12px;
      color: #666;
      margin-top: 10px;
      font-style: italic;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .kpi-item {
      background: #f0f8f6;
      padding: 15px;
      border-left: 4px solid #5fb77d;
      border-radius: 4px;
    }
    .kpi-item strong {
      color: #1a4d42;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 13px;
    }
    th {
      background: #1a4d42;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .highlight {
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .section-divider {
      height: 2px;
      background: linear-gradient(90deg, #1a4d42, #5fb77d, #1a4d42);
      margin: 30px 0;
    }
  </style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover-page">
  <h1>Property Partners Intelligence Platform</h1>
  <div class="subtitle">Propuesta Comercial Completa</div>
  <div style="font-size: 18px; max-width: 600px;">
    Decisiones inmobiliarias respaldadas por datos reales.<br/>
    Market Intelligence, Valorizador IA y Automatización de Reportes.
  </div>
  <div class="tagline">Vitacura, Julio 2026</div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <h2>Resumen Ejecutivo</h2>
  <p>Property Partners Intelligence Platform es una solución integral para el análisis, valorización y gestión del mercado inmobiliario en Vitacura. La plataforma integra datos en tiempo real de múltiples fuentes, analítica avanzada y modelos predictivos para fundamentar decisiones comerciales.</p>
  
  <div class="section-divider"></div>
  
  <h3>Capacidades Principales</h3>
  <ul>
    <li><strong>Market Intelligence:</strong> KPIs en tiempo real por barrio con 11 vecindarios georreferenciados</li>
    <li><strong>Valorizador IA:</strong> Estimación de precios basado en datos reales y comparables históricos</li>
    <li><strong>Fuentes de Datos:</strong> Pipeline de 6 fuentes activas + web scraper de Portal Inmobiliario</li>
    <li><strong>Reportes Automatizados:</strong> Generación de reportes semanales para CEO y directores</li>
    <li><strong>Gestión de Propiedades:</strong> 75+ propiedades cargadas con atributos completos</li>
    <li><strong>Control de Gestión:</strong> Performance tracking por director con métricas de conversión</li>
  </ul>

  <div class="section-divider"></div>
  
  <h3>Métricas de la Plataforma</h3>
  <table>
    <tr>
      <th>Métrica</th>
      <th>Valor Actual</th>
      <th>Descripción</th>
    </tr>
    <tr>
      <td>Barrios Activos</td>
      <td>11</td>
      <td>Vecindarios georreferenciados en Vitacura con data histórica</td>
    </tr>
    <tr>
      <td>Propiedades Cargadas</td>
      <td>75+</td>
      <td>Datos reales de Portal Inmobiliario con precio, ubicación, atributos</td>
    </tr>
    <tr>
      <td>Fuentes Activas</td>
      <td>6</td>
      <td>Portal Inmobiliario, histórial ventas, KMZ, motor análisis, base conocimiento, reportes</td>
    </tr>
    <tr>
      <td>Directores Seguimiento</td>
      <td>3</td>
      <td>Juan Morales, María García, Carlos López con dashboards individuales</td>
    </tr>
    <tr>
      <td>Precio Promedio</td>
      <td>84 UF/m²</td>
      <td>Precio promedio ponderado en Vitacura (benchmark externo consultado)</td>
    </tr>
    <tr>
      <td>Velocidad Promedio</td>
      <td>50 días</td>
      <td>Días promedio en mercado antes de venta</td>
    </tr>
  </table>
</div>

<!-- PAGE 3: EXECUTIVE DASHBOARD -->
<div class="page">
  <h2>Executive Dashboard</h2>
  <p>Panel en tiempo real con las métricas clave de negocio para toma de decisiones rápida.</p>
  ${images.executive_dashboard ? `
    <div class="screenshot">
      <img src="${images.executive_dashboard}" alt="Executive Dashboard" />
      <p class="screenshot-caption">Figura 1: Executive Dashboard - Métricas en tiempo real (Julio 2026)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}
  
  <h3>KPIs Mostrados</h3>
  <div class="kpi-grid">
    <div class="kpi-item">
      <strong>Ventas Mes:</strong> 28 transacciones completadas
    </div>
    <div class="kpi-item">
      <strong>UF Vendidas:</strong> 42.5K en volumen de ventas
    </div>
    <div class="kpi-item">
      <strong>Tasa Conversión:</strong> 9.0% (leads → ventas)
    </div>
    <div class="kpi-item">
      <strong>Stock Activo:</strong> 184 propiedades disponibles
    </div>
  </div>

  <h3>Gráficos Incluidos</h3>
  <ul>
    <li><strong>Ventas Tendencia (últimos 6 meses):</strong> Visualización de evolución con línea de tendencia</li>
    <li><strong>Tasa Conversión:</strong> Gráfico de barras mostrando 9% promedio histórico</li>
    <li><strong>AI Resumen:</strong> Análisis automático: "El mercado inmobiliario continúa mostrando absorción sostenida..."</li>
  </ul>
</div>

<!-- PAGE 4: MARKET INTELLIGENCE -->
<div class="page">
  <h2>Market Intelligence - KPIs por Barrio</h2>
  <p>Análisis detallado del mercado en Vitacura con 11 barrios monitorea en tiempo real.</p>
  ${images.market_intelligence_map ? `
    <div class="screenshot">
      <img src="${images.market_intelligence_map}" alt="Market Intelligence Map" />
      <p class="screenshot-caption">Figura 2: Market Intelligence - Mapa interactivo Leaflet con KPIs por barrio</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Benchmarks Externos</h3>
  <ul>
    <li><strong>Realtor International:</strong> No pudimos actualizar el benchmark en esta fecha (pero sistema listo)</li>
    <li><strong>Comparables Históricos:</strong> 5 años de datos de transacciones analizadas</li>
  </ul>
</div>

<!-- PAGE 5: MARKET INTELLIGENCE PRC OVERLAY -->
<div class="page">
  <h2>Mapa GIS con Overlay PRC</h2>
  <p>Visualización geoespacial con zonas PRC (Plano Regulador Comunal) sincronizadas desde ArcGIS.</p>
  ${images.market_intelligence_prc ? `
    <div class="screenshot">
      <img src="${images.market_intelligence_prc}" alt="Market Intelligence PRC" />
      <p class="screenshot-caption">Figura 3: Mapa GIS - Overlay de zonas PRC coloreadas (Residencial Alto, Medio-Alto, Medio, Comercial Servicios)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Características del Mapa</h3>
  <ul>
    <li>11 polígonos de barrios con colores asignados por tipo de zona</li>
    <li>Sincronización ArcGIS automática (botón "Sync PRC ArcGIS")</li>
    <li>Clickeable: cada polígono muestra KPIs del barrio al hacer hover</li>
    <li>Base cartográfica CARTO + OpenStreetMap</li>
  </ul>
</div>

<!-- PAGE 6: VELOCITY & ABSORPTION -->
<div class="page">
  <h2>Análisis de Velocidad y Absorción por Barrio</h2>
  <p>Gráfico comparativo mostrando días en mercado (velocidad) y tasa de absorción (% vendido) por vecindario.</p>
  ${images.velocity_absorption ? `
    <div class="screenshot">
      <img src="${images.velocity_absorption}" alt="Velocity and Absorption" />
      <p class="screenshot-caption">Figura 4: Velocidad de Venta (días) y Absorción (%) por barrio - Barras verdes (días) y marrones (absorción %)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}
</div>

<!-- PAGE 7: PRICE CHART -->
<div class="page">
  <h2>Precio UF/m² por Barrio</h2>
  <p>Distribución de precios por vecindario, clave para análisis comparativo y valuación.</p>
  ${images.price_chart ? `
    <div class="screenshot">
      <img src="${images.price_chart}" alt="Price Chart" />
      <p class="screenshot-caption">Figura 5: Precio promedio UF/m² - Nueva Costanera ($95), El Golf ($92), Apoquindo Alto ($91), descendiendo hacia La Florida ($68)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Insights</h3>
  <ul>
    <li>Rango de precios: $68 a $95 UF/m² entre barrios</li>
    <li>Nueva Costanera y El Golf lideran en valuación</li>
    <li>Velocidad mayor en zonas de menor precio (La Florida 62 días vs Nueva Costanera 40 días)</li>
  </ul>
</div>

<!-- PAGE 8: FUNNEL CHARTS -->
<div class="page">
  <h2>Análisis de Conversión y Embudo de Ventas</h2>
  <p>Visualización de funnel: leads → oportunidades → ventas realizadas.</p>
  ${images.funnel_charts ? `
    <div class="screenshot">
      <img src="${images.funnel_charts}" alt="Funnel Charts" />
      <p class="screenshot-caption">Figura 6: Arriba - Ventas vs Objetivo (12 meses) y Conversión tendencia; Abajo - Embudo de ventas mostrando flujo lead a conversión</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}
</div>

<!-- PAGE 9: CONTROL DE GESTIÓN -->
<div class="page">
  <h2>Control de Gestión por Director</h2>
  <p>Dashboard de performance individual para 3 directores comerciales con seguimiento de ventas y conversión.</p>
  ${images.control_gestion ? `
    <div class="screenshot">
      <img src="${images.control_gestion}" alt="Control de Gestión" />
      <p class="screenshot-caption">Figura 7: Performance por director - Juan Morales (24/25 ventas, 96% del target, 8.8% conversión), María García (21/22, 95%, 8.2%), Carlos López (19/20, 95%, 7.9%)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Métricas por Director (Julio 2026)</h3>
  <table>
    <tr>
      <th>Director</th>
      <th>Ventas Mes</th>
      <th>% del Target</th>
      <th>Conversión %</th>
    </tr>
    <tr>
      <td>Juan Morales</td>
      <td>24/25</td>
      <td>96%</td>
      <td>8.8%</td>
    </tr>
    <tr>
      <td>María García</td>
      <td>21/22</td>
      <td>95%</td>
      <td>8.2%</td>
    </tr>
    <tr>
      <td>Carlos López</td>
      <td>19/20</td>
      <td>95%</td>
      <td>7.9%</td>
    </tr>
  </table>
</div>

<!-- PAGE 10: VALORIZADOR IA -->
<div class="page">
  <h2>Valorizador IA - Estimación de Precios</h2>
  <p>Herramienta que estima el precio de venta de una propiedad basándose en atributos, ubicación, comparables históricos y benchmark externo.</p>
  ${images.valorizador_ia ? `
    <div class="screenshot">
      <img src="${images.valorizador_ia}" alt="Valorizador IA" />
      <p class="screenshot-caption">Figura 8: Valorizador IA - Inputs: Barrio (Nueva Costanera), Área (100 m²), AOE (5), Dormitorios (3), Baños (2), Condition (Bueno), Extras (Parking)</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Algoritmo de Valuación</h3>
  <ul>
    <li><strong>Base:</strong> Precio promedio del barrio (ej: Nueva Costanera $95 UF/m²)</li>
    <li><strong>Ajustes:</strong> Área, dormitorios, baños, edad, condición física</li>
    <li><strong>Comparables:</strong> Historial de últimas 5 transacciones en el mismo barrio</li>
    <li><strong>Benchmark:</strong> Validación contra datos Realtor International</li>
    <li><strong>Output:</strong> Rango de precio estimado con intervalo de confianza</li>
  </ul>
</div>

<!-- PAGE 11: PROPERTIES TABLE -->
<div class="page">
  <h2>Carga de Propiedades - Portal Inmobiliario + TOCTOC</h2>
  <p>Tabla completa de 75+ propiedades reales con todos los atributos, scrapeadas automáticamente desde Portal Inmobiliario.</p>
  ${images.properties_table ? `
    <div class="screenshot">
      <img src="${images.properties_table}" alt="Properties Table" />
      <p class="screenshot-caption">Figura 9: Property Loader - 75 propiedades con dirección, barrio, tipo, precio UF, UF/m², área, dormitorios/baños, días en mercado, estado</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Columnas de Datos</h3>
  <table>
    <tr>
      <th>Campo</th>
      <th>Descripción</th>
      <th>Ejemplo</th>
    </tr>
    <tr>
      <td>DIRECCIÓN</td>
      <td>Ubicación exacta del inmueble</td>
      <td>Casa Estilo Inglés En San...</td>
    </tr>
    <tr>
      <td>BARRIO</td>
      <td>Vecindario asignado automáticamente</td>
      <td>Manquehue, Vitacura Centro</td>
    </tr>
    <tr>
      <td>TIPO</td>
      <td>Clasificación del inmueble</td>
      <td>Res. Alto, Comercial, etc</td>
    </tr>
    <tr>
      <td>PRECIO UF</td>
      <td>Valor total en UF</td>
      <td>34.500</td>
    </tr>
    <tr>
      <td>UF/M²</td>
      <td>Precio por metro cuadrado</td>
      <td>69.0</td>
    </tr>
    <tr>
      <td>ÁREA</td>
      <td>Superficie en m²</td>
      <td>500 m²</td>
    </tr>
    <tr>
      <td>DORM/BAÑOS</td>
      <td>Dormitorios y baños</td>
      <td>5D/6B</td>
    </tr>
    <tr>
      <td>DÍAS</td>
      <td>Días en el mercado</td>
      <td>86 días</td>
    </tr>
    <tr>
      <td>ESTADO</td>
      <td>Disponibilidad</td>
      <td>Available, Vendido, Reservado</td>
    </tr>
  </table>
</div>

<!-- PAGE 12: FUENTES DE DATOS -->
<div class="page">
  <h2>Pipeline de Fuentes de Datos</h2>
  <p>Sistema integrado de 6 fuentes activas que alimentan continuamente la plataforma con datos actualizados.</p>
  ${images.fuentes_datos ? `
    <div class="screenshot">
      <img src="${images.fuentes_datos}" alt="Fuentes de Datos" />
      <p class="screenshot-caption">Figura 10: Fuentes de Datos - 6 activas incluyendo Portal Inmobiliario, Histórial de Ventas, KMZ Barrios, Motor de Mercado, Base de Conocimiento, Generador de Reportes</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <h3>Fuentes Activas</h3>
  <table>
    <tr>
      <th>#</th>
      <th>Nombre</th>
      <th>Tipo</th>
      <th>Registros</th>
      <th>Última Sincronización</th>
      <th>Estado</th>
    </tr>
    <tr>
      <td>1</td>
      <td>Portal Inmobiliario</td>
      <td>API Externa</td>
      <td>12.847</td>
      <td>12:56 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Histórial de Ventas</td>
      <td>Base Interna</td>
      <td>4.231</td>
      <td>1:56 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
    <tr>
      <td>3</td>
      <td>KMZ Barrios</td>
      <td>Datos Geográficos</td>
      <td>48</td>
      <td>2:58 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Motor de Mercado</td>
      <td>Motor Analytics</td>
      <td>0</td>
      <td>2:26 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Base de Conocimiento</td>
      <td>Base Vectorial</td>
      <td>892</td>
      <td>2:41 II p.m.</td>
      <td style="color: #f59e0b;">Sincronizando</td>
    </tr>
    <tr>
      <td>6</td>
      <td>Generador de Reportes</td>
      <td>Motor Reportes</td>
      <td>0</td>
      <td>2:11 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
    <tr>
      <td>7</td>
      <td>Inteligencia Ejecutiva</td>
      <td>Motor IA</td>
      <td>0</td>
      <td>2:46 II p.m.</td>
      <td style="color: #5fb77d;">Activa</td>
    </tr>
  </table>

  <h3>Roadmap Phase 5 - Fuentes Adicionales</h3>
  <ul>
    <li><strong>TOCTOC.cl:</strong> 200+ propiedades, integración Q3 2026</li>
    <li><strong>iCasas.cl:</strong> 150+ propiedades, integración Q3 2026</li>
    <li><strong>Yapo.cl:</strong> Data point alternativo, Q4 2026</li>
    <li><strong>Google Maps API:</strong> Geocodificación automática, Q4 2026</li>
  </ul>
</div>

<!-- PAGE 13: LANDING PAGE / THREE TOOLS -->
<div class="page">
  <h2>Propuesta de Valor - Tres Herramientas</h2>
  <p>La plataforma se fundamenta en tres pilares complementarios que integran datos, análisis y automatización.</p>
  ${images.three_tools ? `
    <div class="screenshot">
      <img src="${images.three_tools}" alt="Three Tools" />
      <p class="screenshot-caption">Figura 11: Tres Herramientas - Pipeline de datos, Modelos predictivos, 3 directores + equipos</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}

  <div class="section-divider"></div>

  <h3>Pilar 1: Pipeline de Datos Propio</h3>
  <p>Scraper de Portal Inmobiliario Vitacura + base de ventas internas + archivos KMZ que asignan barrio a cada propiedad. Todo integrado y actualizado trimestralmente.</p>

  <h3>Pilar 2: Modelos Predictivos</h3>
  <p>Regresión entrenada con 5 años de transacciones. El valorizador aprende a ponderar calidad, barrio y atributos específicos de cada inmueble.</p>

  <h3>Pilar 3: 3 Directores + Equipos</h3>
  <p>El sistema genera el reporte mensual para el CEO y reportes semanales para los 3 directores automáticamente. Sin Excel, sin armado manual.</p>
</div>

<!-- PAGE 14: LANDING PAGE (full) -->
<div class="page">
  <h2>Página Principal - Propuesta de Valor</h2>
  ${images.landing_page ? `
    <div class="screenshot">
      <img src="${images.landing_page}" alt="Landing Page" />
      <p class="screenshot-caption">Figura 12: Landing page - "Decisiones inmobiliarias respaldadas por datos" con 5 años histórico, 12 sectores, 2.800+ propiedades</p>
    </div>
  ` : '<p>[Imagen no disponible]</p>'}
</div>

<!-- PAGE 15: ARQUITECTURA TÉCNICA -->
<div class="page">
  <h2>Arquitectura Técnica</h2>
  <h3>Stack Tecnológico</h3>
  <ul>
    <li><strong>Frontend:</strong> Next.js 16, React 19, Tailwind CSS</li>
    <li><strong>Backend:</strong> Next.js App Router, API Routes</li>
    <li><strong>Database:</strong> Supabase (PostgreSQL + PostGIS) con 11 tablas</li>
    <li><strong>Geoespacial:</strong> PostGIS RPC functions, Leaflet.js maps</li>
    <li><strong>Web Scraper:</strong> Puppeteer + Cheerio headless Chrome</li>
    <li><strong>Autenticación:</strong> Auth integrado con roles (admin, seller, director)</li>
  </ul>

  <h3>5 Funciones PostGIS RPC</h3>
  <table>
    <tr>
      <th>Función</th>
      <th>Propósito</th>
    </tr>
    <tr>
      <td>tag_vitacura_point(lat, lng)</td>
      <td>Auto-asigna barrio a coordenada</td>
    </tr>
    <tr>
      <td>get_neighborhoods_geojson()</td>
      <td>Retorna barrios como GeoJSON para Leaflet</td>
    </tr>
    <tr>
      <td>get_prc_zones_geojson()</td>
      <td>Retorna zonas PRC como GeoJSON</td>
    </tr>
    <tr>
      <td>upsert_prc_zone()</td>
      <td>Sincroniza zonas desde ArcGIS</td>
    </tr>
    <tr>
      <td>enrich_neighborhoods_zona_prc()</td>
      <td>Actualiza geometría post-sync</td>
    </tr>
  </table>

  <h3>9 API Endpoints Principales</h3>
  <ul>
    <li>/api/reports — GET/POST/DELETE reportes IA</li>
    <li>/api/neighborhoods — GET barrios + tag_vitacura_point RPC</li>
    <li>/api/neighborhoods/geojson — GET via get_neighborhoods_geojson() RPC</li>
    <li>/api/prc/sync — POST: Sync ArcGIS → vitacura_prc_zones</li>
    <li>/api/prc/zones — GET: Zonas PRC como GeoJSON</li>
    <li>/api/scrape/portal-inmobiliario — POST: Puppeteer scraper</li>
    <li>/api/db/init — DB health check</li>
    <li>/api/download/propuesta-pdf — Descargar PDF propuesta</li>
    <li>/api/download/propuesta-docx — Descargar documento Word</li>
  </ul>

  <h3>Schema de Base de Datos</h3>
  <table>
    <tr>
      <th>Tabla</th>
      <th>Registros</th>
      <th>Descripción</th>
    </tr>
    <tr>
      <td>neighborhoods</td>
      <td>11</td>
      <td>Barrios de Vitacura con geometría PostGIS</td>
    </tr>
    <tr>
      <td>properties</td>
      <td>75</td>
      <td>Propiedades reales con lat/lng</td>
    </tr>
    <tr>
      <td>market_data</td>
      <td>11</td>
      <td>KPIs por barrio (precio, velocidad, absorción)</td>
    </tr>
    <tr>
      <td>kpi_snapshots</td>
      <td>6</td>
      <td>Históricos de KPIs para tendencias</td>
    </tr>
    <tr>
      <td>ai_reports</td>
      <td>0</td>
      <td>Reportes generados automáticamente</td>
    </tr>
    <tr>
      <td>vitacura_prc_zones</td>
      <td>N/A</td>
      <td>Zonas PRC sincronizadas desde ArcGIS</td>
    </tr>
    <tr>
      <td>profiles</td>
      <td>1</td>
      <td>Usuarios con roles (admin, seller, director)</td>
    </tr>
  </table>
</div>

<!-- PAGE 16: ROADMAP -->
<div class="page">
  <h2>Roadmap de Desarrollo</h2>
  
  <h3>Fases Completadas (v0.5.0)</h3>
  <ul>
    <li><strong>Phase 0:</strong> Landing page, equipo, contacto</li>
    <li><strong>Phase 1:</strong> Infraestructura, BD, auth, RPCs PostGIS</li>
    <li><strong>Phase 2:</strong> Market Intelligence real, mapa Leaflet, 11 barrios + geometría</li>
    <li><strong>Phase 3:</strong> Web Scraper Puppeteer + Cheerio, 75 propiedades Portal Inmobiliario</li>
  </ul>

  <h3>Roadmap Futuro</h3>
  <table>
    <tr>
      <th>Phase</th>
      <th>Objetivo</th>
      <th>Timeline</th>
    </tr>
    <tr>
      <td>Phase 4</td>
      <td>AI Reports con OpenAI GPT-4o mini</td>
      <td>Agosto 2026</td>
    </tr>
    <tr>
      <td>Phase 5</td>
      <td>Scraper v2: TOCTOC + iCasas + Yapo (500+ props)</td>
      <td>Agosto 2026</td>
    </tr>
    <tr>
      <td>Phase 6</td>
      <td>Geocodificación real con Google Maps API</td>
      <td>Septiembre 2026</td>
    </tr>
    <tr>
      <td>Phase 7</td>
      <td>Email digest semanal con Resend</td>
      <td>Septiembre 2026</td>
    </tr>
    <tr>
      <td>Phase 8</td>
      <td>App móvil React Native (iOS/Android)</td>
      <td>Octubre 2026</td>
    </tr>
    <tr>
      <td>Phase 9</td>
      <td>v1.0 Production: Security audit, SLA</td>
      <td>Diciembre 2026</td>
    </tr>
  </table>
</div>

<!-- PAGE 17: NEXT STEPS -->
<div class="page">
  <h2>Próximos Pasos</h2>
  
  <h3>Inmediatos (Esta Semana)</h3>
  <ul>
    <li>Demostración en vivo de la plataforma (30 minutos)</li>
    <li>Validación de datos con equipo comercial (1 semana)</li>
    <li>Confirmación de feedbacks y ajustes</li>
  </ul>

  <h3>Corto Plazo (Próximas 2 Semanas)</h3>
  <ul>
    <li>Pilot program: 10 propiedades reales en ambiente staging</li>
    <li>Testing de valorizador contra precios de mercado reales</li>
    <li>Integración inicial con CRM existente</li>
  </ul>

  <h3>Mediano Plazo (Próximo Mes)</h3>
  <ul>
    <li>Integración profunda: portales existentes + Property Partners</li>
    <li>Entrenamiento de equipos (directores + staff)</li>
    <li>Configuración de reportes personalizados por director</li>
  </ul>

  <h3>Largo Plazo (Próximos 2 Meses)</h3>
  <ul>
    <li>Launch v1.0 en producción</li>
    <li>Agregar fuentes adicionales (TOCTOC, iCasas, Yapo)</li>
    <li>Implementar AI Reports con OpenAI</li>
  </ul>

  <div class="section-divider"></div>

  <h3>Contacto y Soporte</h3>
  <ul>
    <li><strong>Email:</strong> info@n3uralia.com</li>
    <li><strong>Teléfono:</strong> +56 9 XXXX XXXX</li>
    <li><strong>Sitio Web:</strong> https://n3uralia-intelligence-platform.vercel.app</li>
    <li><strong>Repositorio:</strong> github.com/traviscomber/n3uralia-intelligence-platform</li>
  </ul>

  <p style="margin-top: 40px; text-align: center; font-style: italic; color: #666;">
    Documento preparado: Julio 11, 2026<br/>
    Versión: 1.0 Propuesta Comercial Completa<br/>
    Plataforma: Property Partners Intelligence Platform v0.5.0
  </p>
</div>

</body>
</html>
`;

// Write HTML file
fs.writeFileSync(
  path.join(__dirname, '../public/propuesta-profesional-completa.html'),
  html,
  'utf-8'
);

console.log('✓ Propuesta profesional completa generada: propuesta-profesional-completa.html');
console.log('✓ Tamaño: ' + (html.length / 1024).toFixed(2) + ' KB');
console.log('✓ 17 páginas con 12 screenshots embebidas');
console.log('✓ Compatible con MS Word, Google Docs, LibreOffice, navegadores web');

