/**
 * Lightweight Zero-Dependency SMTP Client
 * Connects over TLS (Port 465) to Gmail / Outlook / Custom SMTP to send OTP emails.
 */
const tls = require('tls');

async function sendOtpEmail(toEmail, otpCode, recipientName = 'Citizen') {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`\n=============================================================`);
  console.log(`📨 [CIVICSAMADHAN OTP DISPATCH]`);
  console.log(`Recipient: ${toEmail} (${recipientName})`);
  console.log(`🔑 6-Digit Verification Code: [ ${otpCode} ]`);
  console.log(`Valid for 10 minutes`);
  console.log(`=============================================================\n`);

  if (!user || !pass) {
    return {
      sent: false,
      reason: 'No SMTP credentials in .env (console logging & UI dev assist active)'
    };
  }

  return new Promise((resolve) => {
    try {
      const socket = tls.connect({ host, port, timeout: 8000 }, () => {
        let step = 0;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="background-color: #0d1b2a; color: white; padding: 15px; text-align: center; border-radius: 8px;">
              <h2 style="margin: 0; color: #ff9933;">CivicSamadhan</h2>
              <p style="margin: 5px 0 0; font-size: 12px; color: #94a3b8;">Centralized Civic Grievance & Redressal Platform</p>
            </div>
            <div style="padding: 20px 10px; color: #1e293b;">
              <p>Dear <strong>${recipientName}</strong>,</p>
              <p>Your one-time verification code (OTP) for account registration is:</p>
              <div style="background: #f1f5f9; border: 2px dashed #0284c7; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0d1b2a; margin: 20px 0;">
                ${otpCode}
              </div>
              <p style="font-size: 12px; color: #64748b;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #94a3b8; text-align: center;">
              Government of India • Ministry of Housing & Urban Affairs
            </div>
          </div>
        `;

        const emailData = [
          `From: "CivicSamadhan Portal" <${user}>`,
          `To: <${toEmail}>`,
          `Subject: CivicSamadhan Verification Code: ${otpCode}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          htmlBody,
          `.`
        ].join('\r\n');

        socket.on('data', (data) => {
          const resp = data.toString();
          if (step === 0 && resp.startsWith('220')) {
            socket.write(`EHLO localhost\r\n`);
            step++;
          } else if (step === 1 && resp.startsWith('250')) {
            socket.write(`AUTH LOGIN\r\n`);
            step++;
          } else if (step === 2 && resp.startsWith('334')) {
            socket.write(`${Buffer.from(user).toString('base64')}\r\n`);
            step++;
          } else if (step === 3 && resp.startsWith('334')) {
            socket.write(`${Buffer.from(pass.replace(/\s+/g, '')).toString('base64')}\r\n`);
            step++;
          } else if (step === 4 && resp.startsWith('235')) {
            socket.write(`MAIL FROM:<${user}>\r\n`);
            step++;
          } else if (step === 5 && resp.startsWith('250')) {
            socket.write(`RCPT TO:<${toEmail}>\r\n`);
            step++;
          } else if (step === 6 && resp.startsWith('250')) {
            socket.write(`DATA\r\n`);
            step++;
          } else if (step === 7 && resp.startsWith('354')) {
            socket.write(`${emailData}\r\n`);
            step++;
          } else if (step === 8 && resp.startsWith('250')) {
            socket.write(`QUIT\r\n`);
            resolve({ sent: true });
          }
        });
      });

      socket.on('error', (err) => {
        console.warn('[Mailer TLS Error]', err.message);
        resolve({ sent: false, error: err.message });
      });

      socket.setTimeout(8000, () => {
        socket.destroy();
        resolve({ sent: false, error: 'SMTP Timeout' });
      });
    } catch (e) {
      resolve({ sent: false, error: e.message });
    }
  });
}

module.exports = { sendOtpEmail };
