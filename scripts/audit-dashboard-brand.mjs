import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('app/dashboard')
const pages = []

function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name)
    if (entry.isDirectory()) walk(target)
    else if (entry.name === 'page.tsx') pages.push(target)
  }
}

walk(root)

const malformed = []
const debt = []
for (const file of pages.sort()) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file)
  const invalidClasses = source.match(/className=(?:"[^"]*|\{`[^`]*)(?:^|\s)(?:#[0-9a-f]{3,8}|var\(--[^)]+\))/giu) || []
  if (invalidClasses.length) malformed.push(`${relative}: ${invalidClasses.length} clase(s) inválida(s)`)

  const lightSurfaces = (source.match(/\bbg-white\b|\bbg-gray-(?:50|100)\b|background:\s*['"]?#(?:fff|fb|f9|f8|f5|f0)/giu) || []).length
  const directColors = (source.match(/#[0-9a-f]{3,8}/giu) || []).length
  if (lightSurfaces || directColors > 24) debt.push(`${relative}: ${lightSurfaces} superficies claras heredadas, ${directColors} colores directos`)
}

if (malformed.length) {
  console.error(`FAIL brand syntax\n${malformed.join('\n')}`)
  process.exit(1)
}

console.log(`PASS brand syntax: ${pages.length} rutas sin clases de color inválidas.`)
if (debt.length) console.log(`INFO migración visual pendiente (${debt.length} rutas):\n${debt.join('\n')}`)
