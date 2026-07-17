import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const docPath = join(process.cwd(), 'public', 'propuesta-n3uralia.doc')
    const docBuffer = readFileSync(docPath)

    return new Response(docBuffer, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': 'attachment; filename="Propuesta-Property Partners.doc"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error serving DOC:', error)
    return new Response('File not found', { status: 404 })
  }
}

