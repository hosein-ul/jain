import sgMail from "@sendgrid/mail"

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

interface SendEmailParams {
  from: string
  to: string
  subject: string
  body: string
  html?: string
}

export async function sendEmail({ from, to, subject, body, html }: SendEmailParams) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log("[DEV MODE] Email would be sent:", { from, to, subject, body })
    return { success: true, dev: true }
  }

  await sgMail.send({
    to,
    from,
    subject,
    text: body,
    html: html || body,
  })

  return { success: true }
}
