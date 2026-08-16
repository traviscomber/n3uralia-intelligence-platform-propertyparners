import test from 'node:test'
import assert from 'node:assert/strict'
import {
  listBuildingUnits,
  parseAddressLookup,
  resolveCbrsSubjectRows,
  type CbrsSubjectLookupRow,
} from '../../lib/valuation-subject-lookup'

const rows: CbrsSubjectLookupRow[] = [
  {
    event_key: '77181|108576|2024-09-02|2024',
    property_type: 'Departamento',
    transaction_date: '2024-09-02',
    address: 'LAS NIEVES 3850 DP 101',
    rol: '435-29',
    price_uf: 8900,
    built_area_m2: 88,
    land_area_m2: 0,
    bedrooms_bathrooms: '3D/3B',
    construction_year: 1995,
    latitude: -33.402947,
    longitude: -70.592325,
    neighborhood: 'Alonso de Córdova',
  },
  {
    event_key: '87074|125756|2023-11-10|2023',
    property_type: 'Departamento',
    transaction_date: '2023-11-10',
    address: 'LAS NIEVES 3850 DP 204',
    rol: '435-36',
    price_uf: 6896,
    built_area_m2: 82,
    land_area_m2: 0,
    bedrooms_bathrooms: '2D/2B',
    construction_year: 1995,
    latitude: -33.402947,
    longitude: -70.592325,
    neighborhood: 'Alonso de Córdova',
  },
  {
    event_key: '58435|81342|2020-09-17|2020',
    property_type: 'Departamento',
    transaction_date: '2020-09-17',
    address: 'LAS NIEVES 3850 DP 301',
    rol: '435-37',
    price_uf: 6000,
    built_area_m2: 84,
    land_area_m2: 0,
    bedrooms_bathrooms: '3D/2B',
    construction_year: 1995,
    latitude: -33.402947,
    longitude: -70.592325,
    neighborhood: 'Alonso de Córdova',
  },
  {
    event_key: '47736|68325|2016-07-05|2016',
    property_type: 'Departamento',
    transaction_date: '2016-07-05',
    address: 'LAS NIEVES 3850 DP 402',
    rol: '435-42',
    price_uf: 5372,
    built_area_m2: 101,
    land_area_m2: 0,
    bedrooms_bathrooms: '3D/3B',
    construction_year: 1995,
    latitude: -33.402947,
    longitude: -70.592325,
    neighborhood: 'Alonso de Córdova',
  },
  {
    event_key: '20372|29256|2016-03-21|2016',
    property_type: 'Departamento',
    transaction_date: '2016-03-21',
    address: 'LAS NIEVES 3850 DP 202',
    rol: '435-34',
    price_uf: 6705,
    built_area_m2: 86,
    land_area_m2: 0,
    bedrooms_bathrooms: '3D/2B',
    construction_year: 1995,
    latitude: -33.402947,
    longitude: -70.592325,
    neighborhood: 'Alonso de Córdova',
  },
]

test('Quick lookup parses a simple Vitacura address', () => {
  assert.deepEqual(parseAddressLookup('Las Nieves 3850'), {
    streetName: 'LAS NIEVES',
    streetNumber: '3850',
    buildingAddress: 'LAS NIEVES 3850',
    unit: undefined,
  })
})

test('Building lookup lists the known Las Nieves 3850 units', () => {
  assert.deepEqual(listBuildingUnits(rows).map((item) => item.unit), ['101', '202', '204', '301', '402'])
})

test('Las Nieves 3850 depto 101 resolves canonical subject facts without fabricating useful area', () => {
  const result = resolveCbrsSubjectRows(rows, '101')
  assert.equal(result.status, 'resolved')
  if (result.status !== 'resolved') return

  assert.equal(result.subject.address, 'LAS NIEVES 3850 DP 101')
  assert.equal(result.subject.rol, '435-29')
  assert.equal(result.subject.neighborhood, 'Alonso de Córdova')
  assert.equal(result.subject.bedrooms, 3)
  assert.equal(result.subject.bathrooms, 3)
  assert.equal(result.subject.constructionYear, 1995)
  assert.equal(result.subject.latitude, -33.402947)
  assert.equal(result.subject.longitude, -70.592325)
  assert.equal(result.registeredAreaM2, 88)
  assert.equal(result.subject.usefulAreaM2, undefined)
  assert.equal(result.areaSemantics, 'cbrs_registered_area_not_confirmed_as_useful')
  assert.equal(result.sourceEventKey, '77181|108576|2024-09-02|2024')
  assert.equal(result.sourcePriceUf, 8900)
})
