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
  {
    // Deuda preexistente surfada al activar las reglas (auditoría 2026-09-21):
    // ~10 usos de any y un @ts-ignore en lib/document-delivery.ts y rutas de
    // reportes. Se mantienen como warning para no bloquear UAT con cambios de
    // código no verificables localmente (disco de desarrollo lleno). Pasar a
    // error y corregir los sitios después de UAT.
    files: PRODUCT_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      // Reglas del React Compiler (react-hooks v7) que señalan ~34 patrones
      // preexistentes de refactor (setState en effects, Date.now en render,
      // memoización manual). Son optimizaciones, no bugs: quedan en warn
      // hasta después de UAT. Las reglas clásicas (rules-of-hooks,
      // exhaustive-deps) siguen como error.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]
