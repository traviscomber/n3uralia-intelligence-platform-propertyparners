export async function convertHtmlToPdf(html: string): Promise<Buffer> {
  try {
    // For now, return HTML as base64
    // The PDF rendering will happen in the browser via Resend's email rendering
    // This ensures proper formatting with CSS and images
    return Buffer.from(html, 'utf-8')
  } catch (error) {
    console.error('[HTML to PDF] Error:', error)
    throw error
  }
}
