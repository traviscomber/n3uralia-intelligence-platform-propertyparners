import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

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
  // Auditoría 2026-09-21: activar las reglas oficiales de Next.js + TypeScript.
  // El config anterior registraba los plugins pero no activaba ninguna regla.
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]
