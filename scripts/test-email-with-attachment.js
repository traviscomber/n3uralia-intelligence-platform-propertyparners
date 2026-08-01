#!/usr/bin/env node

/**
 * Test Email Script with PDF Attachment
 * Sends a test email from Business Intelligence Property Partners to juan@n3uralia.com
 * with a sample PDF report attachment
 */

const https = require('https');

// Get API key from environment
const apiKey = process.env.RESEND_API_KEY;
const recipient = 'juan@n3uralia.com';

if (!apiKey) {
  console.error('❌ Error: RESEND_API_KEY environment variable not set');
  process.exit(1);
}

// Create a simple PDF in base64 (minimal PDF structure)
// This is a very basic PDF that contains "Test Report" text
const pdfBase64 = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
50 700 Td
(Test Report - Property Partners Intelligence) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000203 00000 n
0000000279 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
370
%%EOF`).toString('base64');

const emailPayload = {
  from: 'Business Intelligence Property Partners <info@ppartnersgroup.app>',
  to: recipient,
  subject: 'Test Report with Attachment - Property Partners Intelligence',
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
      margin-top: 20px;
    }
    .attachment-info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 6px;
      margin-top: 15px;
      border-left: 4px solid #1e40af;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Test Email with Attachment</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>This is a <strong>test email with PDF attachment</strong> from the <strong>Property Partners Intelligence Platform</strong>.</p>
      <ul>
        <li><strong>Sender:</strong> Business Intelligence Property Partners &lt;info@ppartnersgroup.app&gt;</li>
        <li><strong>Recipient:</strong> ${recipient}</li>
        <li><strong>Provider:</strong> Resend API</li>
        <li><strong>Attachment:</strong> test-report.pdf (included)</li>
        <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      </ul>
      <p>If you received this email with the PDF attachment, the email delivery system with attachments is working correctly.</p>
      <div class="attachment-info">
        <strong>📎 Attachment Included:</strong><br>
        File: test-report.pdf<br>
        Type: PDF Document<br>
        Size: ~375 bytes
      </div>
    </div>
    <div class="footer">
      <p>Business Intelligence Property Partners | ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`,
  attachments: [
    {
      filename: 'test-report.pdf',
      content: pdfBase64,
      contentType: 'application/pdf'
    }
  ]
};

// Send email via Resend API
const options = {
  hostname: 'api.resend.com',
  path: '/emails',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(emailPayload))
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (response.id) {
        console.log('✅ Test email with attachment sent successfully!');
        console.log(`   Email ID: ${response.id}`);
        console.log(`   To: ${recipient}`);
        console.log(`   From: Business Intelligence Property Partners <info@ppartnersgroup.app>`);
        console.log(`   Attachment: test-report.pdf (PDF)`);
        console.log('');
        console.log(`Check your inbox at ${recipient} for the test email with the PDF attachment.`);
      } else if (response.error) {
        console.error(`❌ Error sending email: ${response.error}`);
        if (response.message) {
          console.error(`   Message: ${response.message}`);
        }
        process.exit(1);
      } else {
        console.error('❌ Unexpected response from Resend API');
        console.error(response);
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Request error: ${error.message}`);
  process.exit(1);
});

req.write(JSON.stringify(emailPayload));
req.end();
