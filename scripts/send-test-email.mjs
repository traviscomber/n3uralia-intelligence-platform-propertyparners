#!/usr/bin/env node

/**
 * Send a test email using Resend API
 * Usage: RESEND_API_KEY=re_xxx node scripts/send-test-email.mjs juan@n3uralia.com
 */

const apiKey = process.env.RESEND_API_KEY
const recipientEmail = process.argv[2] || 'juan@n3uralia.com'

if (!apiKey) {
  console.error('Error: RESEND_API_KEY environment variable not set')
  process.exit(1)
}

if (!recipientEmail) {
  console.error('Error: recipient email not provided')
  process.exit(1)
}

const emailPayload = {
  from: 'Property Partners Intelligence <info@ppartnersgroup.app>',
  to: recipientEmail,
  subject: 'Test Email from Property Partners Intelligence Platform',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .badge { display: inline-block; background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Email Successful</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>This is a test email from the <strong>Property Partners Intelligence Platform</strong>.</p>
            <p>Email Configuration:</p>
            <ul>
              <li><strong>Sender:</strong> Property Partners Intelligence &lt;info@ppartnersgroup.app&gt;</li>
              <li><strong>Recipient:</strong> ${recipientEmail}</li>
              <li><strong>Provider:</strong> Resend API</li>
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
            </ul>
            <p>If you received this email, the email delivery system is working correctly.</p>
            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              This is an automated test message. Please do not reply.
            </p>
          </div>
          <div class="footer">
            <p>Property Partners Intelligence Platform | ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
    </html>
  `,
}

async function sendTestEmail() {
  console.log(`📧 Sending test email to ${recipientEmail}...`)
  console.log(`   From: ${emailPayload.from}`)
  console.log(`   API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-5)}`)
  console.log('')

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Error sending email:')
      console.error(`   Status: ${response.status}`)
      console.error(`   Message: ${data.message || data.error || JSON.stringify(data)}`)
      process.exit(1)
    }

    console.log('✅ Email sent successfully!')
    console.log(`   Email ID: ${data.id}`)
    console.log(`   Status: ${data.created_at ? 'Accepted' : 'Pending'}`)
    console.log('')
    console.log(`Check your inbox at ${recipientEmail} for the test email.`)
  } catch (error) {
    console.error('❌ Error sending email:')
    console.error(`   ${error.message}`)
    process.exit(1)
  }
}

sendTestEmail()
