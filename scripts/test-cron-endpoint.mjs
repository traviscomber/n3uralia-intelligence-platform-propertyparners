#!/usr/bin/env node

/**
 * Test script for the cron endpoint
 * Usage: node scripts/test-cron-endpoint.mjs <cron_secret> [base_url]
 *
 * Example:
 *   node scripts/test-cron-endpoint.mjs a7f3e2b1c9d8e4f5a6b7c8d9e0f1a2b3 http://localhost:3000
 *   node scripts/test-cron-endpoint.mjs a7f3e2b1c9d8e4f5a6b7c8d9e0f1a2b3 https://n3uralia-intelligence-platform.vercel.app
 */

const cronSecret = process.argv[2]
const baseUrl = process.argv[3] || 'http://localhost:3000'

if (!cronSecret) {
  console.error('❌ Error: Missing CRON_SECRET argument')
  console.error('')
  console.error('Usage: node scripts/test-cron-endpoint.mjs <cron_secret> [base_url]')
  console.error('')
  console.error('Examples:')
  console.error('  node scripts/test-cron-endpoint.mjs a7f3e2b1c9d8e4f5a6b7c8d9e0f1a2b3')
  console.error('  node scripts/test-cron-endpoint.mjs a7f3e2b1c9d8e4f5a6b7c8d9e0f1a2b3 https://n3uralia-intelligence-platform.vercel.app')
  process.exit(1)
}

async function testCronEndpoint() {
  const url = `${baseUrl}/api/cron/management-delivery`
  
  console.log('🧪 Testing Management Report Delivery Cron')
  console.log('')
  console.log('📋 Configuration:')
  console.log(`   URL: ${url}`)
  console.log(`   Secret: ${cronSecret.substring(0, 8)}...${cronSecret.substring(-8)}`)
  console.log('')
  
  try {
    console.log('📤 Sending request...')
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    console.log('')
    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log('')
    
    if (response.ok) {
      console.log('✅ Cron executed successfully!')
      console.log('')
      console.log('📊 Results:')
      console.log(`   Configured: ${data.configured}`)
      console.log(`   Provider: ${data.provider}`)
      console.log(`   Claimed: ${data.claimed || 0} pending distributions`)
      console.log(`   Sent: ${data.sent || 0} emails`)
      console.log(`   Failed: ${data.failed || 0}`)
      console.log(`   Terminal: ${data.terminal || 0}`)
      console.log('')
      
      if (data.sent > 0) {
        console.log('🎉 Emails successfully sent!')
        console.log('   Check your inbox for the reports.')
      } else if (data.claimed === 0) {
        console.log('ℹ️  No pending distributions to send.')
        console.log('   Create a report schedule and run the cron again.')
      }
    } else {
      console.log('❌ Cron request failed!')
      console.log('')
      console.log('Error Response:')
      console.log(JSON.stringify(data, null, 2))
      console.log('')
      
      if (response.status === 401) {
        console.log('⚠️  Authorization failed (401)')
        console.log('   - Verify CRON_SECRET is correct')
        console.log('   - Verify CRON_SECRET is set in Vercel Environment Variables')
        console.log('   - Verify the deployment has been redeployed after setting CRON_SECRET')
      } else if (response.status === 500) {
        console.log('⚠️  Server error (500)')
        console.log('   - Check application logs in Vercel dashboard')
        console.log('   - Verify Supabase connection is working')
        console.log('   - Verify Resend API key is set')
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    console.log('')
    console.log('Troubleshooting:')
    console.log(`   - Verify URL is correct: ${url}`)
    console.log('   - If testing locally, ensure dev server is running (pnpm dev)')
    console.log('   - If testing production, ensure deployment is ready')
    process.exit(1)
  }
}

testCronEndpoint()
