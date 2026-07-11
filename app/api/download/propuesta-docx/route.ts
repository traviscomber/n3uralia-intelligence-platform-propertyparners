import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Read the HTML file
    const htmlPath = path.join(process.cwd(), 'public', 'propuesta-comercial-n3uralia.html')
    
    if (!fs.existsSync(htmlPath)) {
      return NextResponse.json({ error: 'HTML file not found' }, { status: 404 })
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

    // Return as HTML with .doc extension (Microsoft Word can open HTML files)
    // Most modern systems will open it with Word
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': 'attachment; filename="propuesta-comercial-n3uralia.doc"',
      },
    })
  } catch (error) {
    console.error('Error serving DOCX:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
