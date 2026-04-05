import nodemailer from "nodemailer"

interface SendOtpEmailParams {
  to: string
  name: string
  otpCode: string
  expiresInMinutes: number
}

let transporter: any = null

function getTransporter() {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT || "587")
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  }

  return transporter
}

export async function sendOtpEmail({ to, name, otpCode, expiresInMinutes }: SendOtpEmailParams) {
  const sender = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@swift-invoice.local"
  const smtpTransport = getTransporter()

  if (!smtpTransport) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.")
    }

    console.log(`[DEV OTP] Email OTP for ${to}: ${otpCode} (valid ${expiresInMinutes} min)`)
    return
  }

  await smtpTransport.sendMail({
    from: sender,
    to,
    subject: "Swift-Invoice Email Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Verify your email</h2>
        <p style="margin-top: 0;">Hi ${name || "there"},</p>
        <p>Your one-time password for Swift-Invoice is:</p>
        <p style="font-size: 30px; letter-spacing: 4px; font-weight: 700; margin: 18px 0;">${otpCode}</p>
        <p>This code will expire in ${expiresInMinutes} minutes.</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          If you did not create this account, you can ignore this email.
        </p>
      </div>
    `,
    text: `Hi ${name || "there"},\n\nYour Swift-Invoice verification OTP is: ${otpCode}\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request this, please ignore this email.`,
  })
}
