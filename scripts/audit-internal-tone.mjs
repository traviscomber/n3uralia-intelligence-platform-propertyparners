import fs from 'node:fs'
import path from 'node:path'

const roots = [path.resolve('app/dashboard'), path.resolve('components')]
const forbidden = [
  /(?:â|Ã|�)/u,
  /\brevoluciona\w*/iu,
  /\btransforma\w*/iu,
  /\bpotencia\w*/iu,
  /\binnovaci[oó]n\b/iu,
  /\bexcelencia\b/iu,
  /\bworld[ -]class\b/iu,
  /\bl[ií]der(?:es|azgo)?\b/iu,
  /\bla misma verdad\b/iu,
  /\bresearch only\b/iu,
  /\bvalorizaci[oó]n profesional\b/iu,
]

function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(folder, entry.name)
    return entry.isDirectory() ? files(target) : entry.name.endsWith('.tsx') ? [target] : []
  })
}

const failures = []
for (const file of roots.flatMap(files)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    for (const pattern of forbidden) {
      if (pattern.test(line)) failures.push(`${path.relative(process.cwd(), file)}:${index + 1} contiene ${pattern}`)
    }
  })
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log('Internal tone audit passed: dashboard copy contains no blocked promotional phrases.')
