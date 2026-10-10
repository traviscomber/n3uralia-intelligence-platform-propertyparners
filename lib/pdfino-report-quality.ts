import { PDFDocument } from 'pdf-lib'

/**
 * PDFino runtime preflight. Applies to every export using this function.
 * Render-to-image visual inspection remains a separate CI/release gate.
 */
export async function verifyPdfinoReport(
  bytes: Uint8Array,
  options: { title: string; minPages?: number; requireA4?: boolean },
): Promise<void> {
  if (bytes.length < 1500) throw new Error('PDFINO_PDF_TOO_SMALL')
  const pdf = await PDFDocument.load(bytes)
  const pages = pdf.getPages()
  if (pages.length < (options.minPages ?? 1)) throw new Error('PDFINO_MISSING_PAGES')
  if (!pdf.getTitle()?.trim() || pdf.getTitle()?.trim() !== options.title.trim()) {
    throw new Error('PDFINO_TITLE_MISMATCH')
  }
  for (const [index, page] of pages.entries()) {
    const { width, height } = page.getSize()
    if (options.requireA4 && (Math.abs(width - 595.28) > 1 || Math.abs(height - 841.89) > 1)) {
      throw new Error(`PDFINO_PAGE_SIZE_INVALID_${index + 1}`)
    }
    if (!(width > 0 && height > 0)) throw new Error(`PDFINO_PAGE_SIZE_INVALID_${index + 1}`)
  }
}
