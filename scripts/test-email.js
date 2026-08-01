const apiKey = 're_ZLcTMUKC_CGVtxSa7agh6KXfrVQh6kVDJ'
const recipient = 'juan@n3uralia.com'

const emailPayload = {
  from: 'Property Partners Intelligence <info@ppartnersgroup.app>',
  to: recipient,
  subject: 'Test Email from Property Partners Intelligence Platform',
  html: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin-top: 20px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✓ Test Email Successful</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>This is a test email from the <strong>Property Partners Intelligence Platform</strong>.</p>
        <p><strong>Email Configuration:</strong></p>
        <ul>
          <li><strong>Sender:</strong> Property Partners Intelligence &lt;info@ppartnersgroup.app&gt;</li>
          <li><strong>Recipient:</strong> ${recipient}</li>
          <li><strong>Provider:</strong> Resend API</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, the email delivery system is working correctly.</p>
      </div>
      <div class="footer">
        <p>Property Partners Intelligence Platform | ${new Date().getFullYear()}</p>
      </div>
    </div>
  </body>
</html>`
}

console.log('📧 Sending test email to ' + recipient + '...')
console.log('   From: Property Partners Intelligence <info@ppartnersgroup.app>')
console.log('   API Key: ' + apiKey.slice(0, 15) + '...')
console.log('')

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(emailPayload)
})
  .then(r => r.json())
  .then(data => {
    if (data.id) {
      console.log('✅ Email sent successfully!')
      console.log('   Email ID: ' + data.id)
      console.log('   Status: Accepted')
      console.log('')
      console.log('Check your inbox at ' + recipient + ' for the test email.')
    } else {
      console.error('❌ Error sending email:')
      console.error(JSON.stringify(data, null, 2))
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message)
    process.exit(1)
  })
