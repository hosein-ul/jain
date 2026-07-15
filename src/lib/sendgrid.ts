import sgMail from "@sendgrid/mail"

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface Attachment {
  filename: string
  content: string   // base64-encoded
  type?: string     // MIME type, e.g. "application/pdf"
  disposition?: "attachment" | "inline"
}

export interface SendEmailParams {
  from: string
  to: string | string[]
  subject: string
  body: string
  html?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: Attachment[]
  trackOpens?: boolean
  trackClicks?: boolean
  scheduledAt?: Date   // must be within 72 hours, requires SendGrid Pro
}

export async function sendEmail(params: SendEmailParams) {
  const { from, to, subject, body, html, cc, bcc, replyTo, attachments, trackOpens, trackClicks, scheduledAt } = params

  if (!process.env.SENDGRID_API_KEY) {
    console.log("[DEV] Email logged (no SENDGRID_API_KEY):", { from, to, subject, cc, bcc, scheduledAt })
    return { success: true, dev: true }
  }

  const msg: sgMail.MailDataRequired = {
    to,
    from,
    subject,
    text: body,
    html: html || body,
    ...(cc ? { cc } : {}),
    ...(bcc ? { bcc } : {}),
    ...(replyTo ? { replyTo } : {}),
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            type: a.type ?? "application/octet-stream",
            disposition: a.disposition ?? "attachment",
          })),
        }
      : {}),
    trackingSettings: {
      clickTracking: { enable: trackClicks ?? false },
      openTracking: { enable: trackOpens ?? false },
    },
    ...(scheduledAt ? { sendAt: Math.floor(scheduledAt.getTime() / 1000) } : {}),
  }

  const [response] = await sgMail.send(msg)
  const messageId = response.headers["x-message-id"] as string | undefined

  return { success: true, messageId }
}
