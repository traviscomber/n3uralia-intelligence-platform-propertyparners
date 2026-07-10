/**
 * N3uralia Design System - Brandbook
 * Warm Teal & Sage color palette for real estate intelligence platform
 * 
 * Reference: www.n3uralia.com
 * Updated: July 2026
 */

export const N3_COLORS = {
  // Primary Palette
  background: '#fbfbfa',      // Off-white background
  foreground: '#173634',      // Dark slate text
  card: '#ffffff',            // White cards
  
  // Brand Colors
  primary: '#8fb2aa',         // Warm teal (primary accent)
  secondary: '#173634',       // Dark slate
  accent: '#b89a7e',          // Warm taupe
  
  // Status Colors
  success: '#10b981',         // Green
  warning: '#f59e0b',         // Amber
  destructive: '#d97706',     // Orange-red
  info: '#0ea5e9',           // Blue
  
  // Surfaces
  muted: '#555a56',          // Muted gray
  border: '#d8e5e2',         // Light teal border
  input: '#f5f9f7',          // Input background
} as const

export const N3_CHARTS = {
  colors: [
    '#8fb2aa',  // Primary teal
    '#b89a7e',  // Accent taupe
    '#10b981',  // Success green
    '#f59e0b',  // Warning amber
    '#d97706',  // Destructive
  ]
} as const

export const N3_TAILWIND = {
  // Use with Tailwind utility classes:
  // bg-[#8fb2aa] or text-[#173634]
  // But prefer CSS variables when in global scope:
  // bg-[var(--primary)] or text-foreground
  primary: 'bg-[#8fb2aa] text-white hover:bg-[#7a9a91]',
  secondary: 'bg-[#173634] text-white hover:bg-[#0f2220]',
  accent: 'bg-[#b89a7e] text-white hover:bg-[#a88a6e]',
  border: 'border border-[#d8e5e2]',
  card: 'bg-white rounded-none border border-[#d8e5e2]',
}
