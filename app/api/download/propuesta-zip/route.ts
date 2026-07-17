import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'propuesta-n3uralia.tar.gz');
    const fileBuffer = readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': 'attachment; filename="Propuesta-N3uralia.tar.gz"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[v0] Error downloading archive:', error);
    return new Response('Archive not found', { status: 404 });
  }
}


