import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('[v0] Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function updateCeoRole() {
  const email = 'Pedro.ferrer@ppartnersgroup.com'
  const userId = '09e1d747-5e3d-4e78-8cbb-829eafaa3e02'

  console.log('[v0] Updating CEO profile...')
  console.log(`[v0] Email: ${email}`)
  console.log(`[v0] User ID: ${userId}`)
  console.log('')

  try {
    // Update profile role and team
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'ceo',
        team: 'Executive'
      })
      .eq('id', userId)

    if (updateError) {
      console.error(`[v0] ERROR: ${updateError.message}`)
      process.exit(1)
    }

    console.log(`[v0] ✅ Profile updated to CEO`)
    console.log('')
    console.log('[v0] ===================================')
    console.log('[v0] CEO ROLE UPDATED')
    console.log('[v0] ===================================')
    console.log(`[v0] Email: ${email}`)
    console.log(`[v0] Role: CEO`)
    console.log(`[v0] Team: Executive`)
    console.log(`[v0] Login: /auth/login`)
    console.log('[v0] ===================================')

  } catch (err) {
    console.error(`[v0] ERROR: ${err.message}`)
    process.exit(1)
  }
}

updateCeoRole()
