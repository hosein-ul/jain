import { NextRequest, NextResponse } from "next/server"
import { verifyAgentOwnership } from "@/lib/auth"
import { sendAgentEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/send",
  "$0.02",
  "Send an email from an agent mailbox to any recipient",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const {
      agentId, to, subject, body: emailBody, html,
      cc, bcc, replyTo, attachments, trackOpens, trackClicks, scheduledAt, threadId,
    } = body

    if (!agentId) return missingFieldError("agentId", "Get this from mailbox/create or mailbox/list.")
    if (!to) return missingFieldError("to", "Recipient — a single address string or an array of addresses.")
    if (!subject) return missingFieldError("subject")
    if (!emailBody) return missingFieldError("body", "The plain-text body. HTML is optional in a separate 'html' field.")

    if (!(await verifyAgentOwnership(agentId, user.id))) {
      return notFoundError("mailbox", "This agentId doesn't exist under your tenant. POST /api/asp/mailbox/list to see ids you own.")
    }

    const result = await sendAgentEmail(agentId, to, subject, emailBody, {
      html, cc, bcc, replyTo, attachments, trackOpens, trackClicks,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      threadId,
    })

    return NextResponse.json({
      ...result,
      hint: {
        next: "Save email.id and email.threadId — the recipient's reply will arrive on the same thread. Use POST /api/asp/inbox/get with {agentId, filter:{unread:true}} to fetch it, or configure a webhook via mailbox/update.",
      },
    }, { status: 201 })
  }
)
