import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Uso del patrón documentado por ESLint (fileURLToPath): import.meta.dirname
// no está disponible cuando el loader transpila la config a CJS (repo sin
// "type": "module"), y fue la causa del fallo de CI con exit code 2.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

// Auditoría 2026-09-21: activar las reglas oficiales de Next.js + TypeScript.
// El config anterior registraba los plugins pero no activaba ninguna regla.
//
// Alcance incremental, para no romper gates con hallazgos preexistentes en
// scripts/ y tests/: las reglas estrictas aplican primero al código de
// producto. La incorporación del resto del repo queda como deuda registrada
// en docs/SECURITY_EXCEPTIONS.md (sección 3).
const PRODUCT_FILES = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
]

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.turbo/**',
    ],
  },
  ...compat
    .extends('next/core-web-vitals', 'next/typescript')
    .map((config) => ({ ...config, files: PRODUCT_FILES })),
]
