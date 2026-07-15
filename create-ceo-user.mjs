#!/usr/bin/env node

/**
 * Create CEO user in Supabase
 * Usage: node create-ceo-user.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[v0] ERROR: Missing Supabase credentials')
  console.error('[v0] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// CEO credentials
const ceoEmail = 'Pedro.ferrer@ppartnersgroup.com'
const ceoPassword = 'ppartnersgroup2026'
const ceoName = 'Pedro Pablo Ferrer'
const ceoRole = 'ceo'

(async () => {
  try {
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[v0] Creating CEO user...')
    console.log(`[v0] Email: ${ceoEmail}`)
    console.log(`[v0] Name: ${ceoName}`)
    console.log(`[v0] Role: ${ceoRole}`)
    console.log('')

    // Create user via auth.admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: ceoEmail,
      password: ceoPassword,
      email_confirm: true, // Confirm email automatically
      user_metadata: {
        full_name: ceoName,
        role: ceoRole
      }
    })

    if (error) {
      console.error(`[v0] ERROR creating auth user: ${error.message}`)
      process.exit(1)
    }

    const user_id = data.user.id
    console.log(`[v0] ✅ Auth user created: ${user_id}`)

    // Create profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user_id,
        full_name: ceoName,
        role: ceoRole,
        team: 'Executive'
      })

    if (profileError) {
      console.error(`[v0] ERROR creating profile: ${profileError.message}`)
      process.exit(1)
    }

    console.log(`[v0] ✅ Profile created in database`)
    console.log('')
    console.log('[v0] ===================================')
    console.log('[v0] CEO USER CREATED SUCCESSFULLY')
    console.log('[v0] ===================================')
    console.log(`[v0] Email: ${ceoEmail}`)
    console.log(`[v0] Password: ${ceoPassword}`)
    console.log(`[v0] Role: ${ceoRole}`)
    console.log('[v0] Ready to login at /auth/login')
    console.log('[v0] ===================================')

  } catch (err) {
    console.error(`[v0] ERROR: ${err.message}`)
    process.exit(1)
  }
})()
