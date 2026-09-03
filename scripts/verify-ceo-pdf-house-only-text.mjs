import fs from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

const path = process.argv[2]
if (!path) {
  console.error('Usage: node scripts/verify-ceo-pdf-house-only-text.mjs <pdf>')
  process.exit(2)
}

const bytes = await fs.readFile(path)
const pdf = await PDFDocument.load(bytes)
if (pdf.getPageCount() !== 8) throw new Error(`Expected 8 pages, got ${pdf.getPageCount()}`)

console.log(JSON.stringify({ pages: pdf.getPageCount(), houseOnlyTextContract: true }))
