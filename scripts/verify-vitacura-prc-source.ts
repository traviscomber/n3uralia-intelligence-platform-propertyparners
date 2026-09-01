import { fetchVitacuraPrcRows } from '../lib/vitacura-prc'

const result = await fetchVitacuraPrcRows()
const layers = new Map(result.diagnostics.map((item) => [item.layer, item]))

if (result.diagnostics.length !== 2) throw new Error(`Expected 2 PRC layers, got ${result.diagnostics.length}`)
if (!layers.get('edification')?.rows) throw new Error('Vitacura PRC edification layer returned no polygon rows')
if (!layers.get('land_use')?.rows) throw new Error('Vitacura PRC land-use layer returned no polygon rows')
if (!result.sourceVersion.startsWith('vitacura-prcv-')) throw new Error(`Unexpected source version ${result.sourceVersion}`)
if (!result.rows.some((row) => row.layer_type === 'edificacion')) throw new Error('Missing valuation edification rows')
if (!result.rows.some((row) => row.layer_type === 'uso_suelo')) throw new Error('Missing valuation land-use rows')

console.log(JSON.stringify({
  ok: true,
  sourceVersion: result.sourceVersion,
  totalRows: result.rows.length,
  diagnostics: result.diagnostics,
}, null, 2))
