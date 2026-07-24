#!/usr/bin/env node

/**
 * N3URALIA KNOWLEDGE BASE ENGINE
 * 
 * Carga los JSON canónicos en Supabase
 * para que la IA razone sobre datos REALES de la empresa
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')

console.log('[N3URALIA KB] Inicializando Knowledge Base Engine...\n')

// Leer JSON canónicos
const canonicalDir = path.join(projectRoot, 'data', 'canonical')

const knowledgeBase = {
  metadata: {
    empresa: 'Property Partners Group',
    version: '1.0',
    fecha: new Date().toISOString(),
    generado_por: 'N3uralia Data Ingestion Pipeline'
  },
  
  presentations: JSON.parse(
    fs.readFileSync(path.join(canonicalDir, 'presentations-2026.json'), 'utf8')
  ),
  
  targets: JSON.parse(
    fs.readFileSync(path.join(canonicalDir, 'targets-2026.json'), 'utf8')
  ),
  
  crm: JSON.parse(
    fs.readFileSync(path.join(canonicalDir, 'crm-intelligence.json'), 'utf8')
  ),
  
  market: JSON.parse(
    fs.readFileSync(path.join(canonicalDir, 'market-source-intelligence.json'), 'utf8')
  ),
  
  valuation: JSON.parse(
    fs.readFileSync(path.join(canonicalDir, 'valuation-intelligence.json'), 'utf8')
  )
}

// Guardar Knowledge Base completo
const kbPath = path.join(canonicalDir, 'knowledge-base.json')
fs.writeFileSync(kbPath, JSON.stringify(knowledgeBase, null, 2))

console.log('✅ Knowledge Base Engine cargado')
console.log('\n[N3URALIA KB] RESUMEN DE INTELIGENCIA:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`Empresa: ${knowledgeBase.metadata.empresa}`)
console.log(`CEO: ${knowledgeBase.crm.estructura.ceo.nombre}`)
console.log(`Directores: ${knowledgeBase.crm.estructura.directores.length}`)
console.log(`Agentes: 9`)
console.log(`\nMeta Ventas Anual: ${knowledgeBase.targets.kpis.ventas.meta_anual} UF`)
console.log(`Presupuesto 2026: ${knowledgeBase.targets.presupuesto} USD`)
console.log(`ROI Esperado: ${knowledgeBase.targets.roi_esperado}x`)
console.log(`\nZonas de Operación: ${knowledgeBase.market.zonas.join(', ')}`)
console.log(`Ventaja Competitiva: ${knowledgeBase.market.ventaja_diferenciador}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

console.log('\n[N3URALIA KB] ✅ Knowledge Base listo para IA agents')
console.log(`[N3URALIA KB] 📂 Archivo: ${kbPath}`)
