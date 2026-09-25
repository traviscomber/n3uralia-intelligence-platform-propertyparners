import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildProspectTerritoryCoverage } from '../lib/prospect-territory-coverage'

test('territory coverage counts every eligible property once and exposes missing director coverage', () => {
  const result = buildProspectTerritoryCoverage({
    eligibleProperties: [
      { id: 'p1', neighborhood_id: 'n1' },
      { id: 'p2', neighborhood_id: 'n1' },
      { id: 'p2', neighborhood_id: 'n1' },
      { id: 'p3', neighborhood_id: 'n2' },
    ],
    leads: [
      { property_id: 'p1', neighborhood_id: 'n1', director_key: 'd1' },
    ],
    territories: [
      { neighborhood_id: 'n1', director_key: 'd1' },
    ],
    neighborhoods: [
      { id: 'n1', name: 'Vitacura Centro' },
      { id: 'n2', name: 'Santa María' },
    ],
    directors: [
      { director_key: 'd1', full_name: 'Directora Uno', office_name: 'Nueva Costanera' },
    ],
  })

  assert.equal(result.summary.neighborhoods, 2)
  assert.equal(result.summary.mappedNeighborhoods, 1)
  assert.equal(result.summary.unmappedNeighborhoods, 1)
  assert.equal(result.summary.coveragePct, 50)
  assert.equal(result.summary.eligiblePublished, 3)
  assert.equal(result.summary.uncoveredPublished, 1)

  const n1 = result.rows.find((row) => row.neighborhood.id === 'n1')
  const n2 = result.rows.find((row) => row.neighborhood.id === 'n2')
  assert.ok(n1)
  assert.ok(n2)
  assert.equal(n1.eligiblePublished, 2)
  assert.equal(n1.leads, 1)
  assert.equal(n1.unconverted, 1)
  assert.equal(n1.needsDirector, false)
  assert.equal(n2.needsDirector, true)
})

test('territory coverage surfaces lead/director drift instead of hiding inconsistent responsibility', () => {
  const result = buildProspectTerritoryCoverage({
    eligibleProperties: [{ id: 'p1', neighborhood_id: 'n1' }],
    leads: [{ property_id: 'p1', neighborhood_id: 'n1', director_key: 'old-director' }],
    territories: [{ neighborhood_id: 'n1', director_key: 'new-director' }],
    neighborhoods: [{ id: 'n1', name: 'Manquehue' }],
    directors: [{ director_key: 'new-director', full_name: 'Directora Nueva', office_name: 'Santa María' }],
  })

  assert.equal(result.summary.directorDriftLeads, 1)
  assert.equal(result.rows[0]?.directorDriftLeads, 1)
})
