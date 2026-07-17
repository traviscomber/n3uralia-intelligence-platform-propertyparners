/**
 * Property Partners Design System - Brandbook
 * Black, white and red palette for the real estate intelligence platform
 *
 * Reference: ppartnersgroup.com
 * Updated: July 2026
 */

export const N3_COLORS = {
  // Primary Palette
  background: '#fbfbfa',      // Off-white background
  foreground: '#111111',      // Dark slate text
  card: '#ffffff',            // White cards
  
  // Brand Colors
  primary: '#d61f2c',         // Primary brand accent
  secondary: '#111111',       // Primary text and surfaces
  accent: '#6b7280',          // Neutral accent
  
  // Status Colors
  success: '#d61f2c',         // Success is represented with the brand accent
  warning: '#f59e0b',         // Amber
  destructive: '#d97706',     // Orange-red
  info: '#0ea5e9',           // Blue
  
  // Surfaces
  muted: '#374151',          // Muted gray
  border: '#e5e7eb',         // Light neutral border
  input: '#f9fafb',          // Input background
} as const

export const N3_CHARTS = {
  colors: [
    '#d61f2c',  // Primary brand accent
    '#6b7280',  // Neutral accent
    '#111111',  // Primary text
    '#f59e0b',  // Warning amber
    '#d97706',  // Destructive
  ]
} as const

export const N3_TAILWIND = {
  // Use with Tailwind utility classes:
  // bg-[#d61f2c] or text-[#111111]
  // But prefer CSS variables when in global scope:
  // bg-[var(--primary)] or text-foreground
  primary: 'bg-[#d61f2c] text-white hover:bg-[#b91c1c]',
  secondary: 'bg-[#111111] text-white hover:bg-[#1f2937]',
  accent: 'bg-[#6b7280] text-white hover:bg-[#4b5563]',
  border: 'border border-[#e5e7eb]',
  card: 'bg-white rounded-none border border-[#e5e7eb]',
}

