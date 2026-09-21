// Auditoría 2026-09-21: activar las reglas oficiales de Next.js + TypeScript.
// El config anterior registraba plugins pero no activaba ninguna regla.
//
// eslint-config-next@16 exporta configs PLANOS (arrays flat), compatibles
// nativamente con ESLint 9 — no se necesita FlatCompat. La primera versión
// de esta config usó FlatCompat y CI falló con exit code 2 porque FlatCompat
// espera formato eslintrc legacy, no arrays flat.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Alcance incremental, para no romper gates con hallazgos preexistentes en
// scripts/ y tests/: las reglas estrictas aplican primero al código de
// producto. La incorporación del resto del repo queda como deuda técnica
// registrada (ver sección 3 de docs/SECURITY_EXCEPTIONS.md).
const PRODUCT_FILES = [
  'app/**/*.{ts,tsx,js,jsx}',
  'components/**/*.{ts,tsx,js,jsx}',
  'lib/**/*.{ts,tsx,js,jsx}',
]

const scopeToProduct = (config) => ({ ...config, files: PRODUCT_FILES })

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
  ...nextCoreWebVitals.map(scopeToProduct),
  ...nextTypescript.map(scopeToProduct),
]
