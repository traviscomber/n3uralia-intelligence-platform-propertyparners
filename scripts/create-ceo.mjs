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

async function createCeoUser() {
  const email = 'Pedro.ferrer@ppartnersgroup.com'
  const password = 'ppartnersgroup2026'
  const fullName = 'Pedro Pablo Ferrer'
  const role = 'ceo'

  console.log('[v0] Creating CEO user...')
  console.log(`[v0] Email: ${email}`)
  console.log(`[v0] Name: ${fullName}`)
  console.log(`[v0] Role: ${role}`)
  console.log('')

  try {
    // Create auth user
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role }
    })

    if (authError) {
      console.error(`[v0] ERROR: ${authError.message}`)
      process.exit(1)
    }

    console.log(`[v0] ✅ Auth user created: ${data.user.id}`)

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        full_name: fullName,
        role,
        team: 'Executive'
      })

    if (profileError) {
      console.error(`[v0] ERROR: ${profileError.message}`)
      process.exit(1)
    }

    console.log(`[v0] ✅ Profile created`)
    console.log('')
    console.log('[v0] ===================================')
    console.log('[v0] CEO USER CREATED')
    console.log('[v0] ===================================')
    console.log(`[v0] Email: ${email}`)
    console.log(`[v0] Password: ${password}`)
    console.log(`[v0] Login: /auth/login`)
    console.log('[v0] ===================================')

  } catch (err) {
    console.error(`[v0] ERROR: ${err.message}`)
    process.exit(1)
  }
}

createCeoUser()
