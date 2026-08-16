import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const content = readFileSync('pnpm-lock.yaml')
const encoded = content.toString('base64')
const sha256 = createHash('sha256').update(content).digest('hex')
const exportId = `pnpm-lock-${sha256}`
const chunkSize = 4000
const chunks = Array.from({ length: Math.ceil(encoded.length / chunkSize) }, (_, index) => ({
  export_id: exportId,
  chunk_index: index,
  chunk_text: encoded.slice(index * chunkSize, (index + 1) * chunkSize),
  sha256,
  total_chunks: Math.ceil(encoded.length / chunkSize),
}))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) throw new Error('Missing Supabase QA bridge credentials')

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { error: deleteError } = await supabase
  .from('qa_lockfile_export_bridge')
  .delete()
  .eq('export_id', exportId)
if (deleteError) throw deleteError

for (let offset = 0; offset < chunks.length; offset += 20) {
  const batch = chunks.slice(offset, offset + 20)
  const { error } = await supabase.from('qa_lockfile_export_bridge').insert(batch)
  if (error) throw error
}

console.log(`LOCKFILE_BRIDGE_COMPLETE export=${exportId} bytes=${content.length} sha256=${sha256} chunks=${chunks.length}`)
