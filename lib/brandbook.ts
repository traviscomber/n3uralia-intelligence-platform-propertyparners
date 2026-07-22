/**
 * Property Partners Vitacura Design System - Brandbook
 * Property Partners Vitacura control-management palette, derived from the 2026 decks.
 *
 * Reference: supplied Property Partners 2026 presentations
 * Updated: July 2026
 */

export const N3_COLORS = {
  // Primary Palette
  background: '#050807',      // Dark background
  foreground: '#edf4f3',      // Soft light text
  card: '#0c1111',            // Dark surface
  
  // Brand Colors
  primary: '#d7332b',         // Property Partners red
  secondary: '#111111',       // Primary text and surfaces
  accent: '#7f8c8d',          // Deck neutral
  
  // Status Colors
  success: '#27ae60',         // Deck green
  warning: '#f39c12',         // Deck amber
  destructive: '#e74c3c',     // Deck red
  info: '#1565c0',            // Deck blue
  
  // Surfaces
  muted: '#2a1716',          // Muted red-black
  border: 'rgba(215, 51, 43, 0.22)',
  input: '#0c1111',          // Input background
} as const

export const N3_CHARTS = {
  colors: [
    '#1565c0',  // Portfolio and target
    '#e74c3c',  // Alert
    '#27ae60',  // Compliance
    '#f39c12',  // Transition
    '#7f8c8d',  // Neutral
  ]
} as const

export const N3_TAILWIND = {
  // Use with Tailwind utility classes:
  // bg-[var(--n3-teal)] or text-[var(--n3-text-light)]
  // But prefer CSS variables when in global scope:
  // bg-[var(--primary)] or text-foreground
  primary: 'bg-[var(--n3-teal)] text-[var(--n3-black)] hover:bg-[var(--n3-teal-soft)]',
  secondary: 'bg-[#111111] text-white hover:bg-[#1f2937]',
  accent: 'bg-[var(--n3-teal-dim)] text-[var(--n3-text-light)] hover:bg-[var(--n3-teal)]',
  border: 'border border-[var(--n3-line)]',
  card: 'bg-[var(--n3-dark-surface)] rounded-none border border-[var(--n3-line)]',
}

