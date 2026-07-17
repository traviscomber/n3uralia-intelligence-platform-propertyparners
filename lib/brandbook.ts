/**
 * N3uralia Design System - Brandbook
 * Dark graphite and muted teal palette for the intelligent operations platform
 *
 * Reference: n3uralia.com
 * Updated: July 2026
 */

export const N3_COLORS = {
  // Primary Palette
  background: '#050807',      // Dark background
  foreground: '#edf4f3',      // Soft light text
  card: '#0c1111',            // Dark surface
  
  // Brand Colors
  primary: '#8ba9a7',         // Primary brand accent
  secondary: '#111111',       // Primary text and surfaces
  accent: '#9ca9a7',          // Neutral accent
  
  // Status Colors
  success: '#8ba9a7',         // Success is represented with the brand accent
  warning: '#f59e0b',         // Amber
  destructive: '#d97706',     // Orange-red
  info: '#0ea5e9',           // Blue
  
  // Surfaces
  muted: '#223333',          // Muted gray
  border: 'rgba(139, 169, 167, 0.18)',         // Light neutral border
  input: '#0c1111',          // Input background
} as const

export const N3_CHARTS = {
  colors: [
    '#8ba9a7',  // Primary brand accent
    '#9ca9a7',  // Neutral accent
    '#111111',  // Primary text
    '#f59e0b',  // Warning amber
    '#d97706',  // Destructive
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

