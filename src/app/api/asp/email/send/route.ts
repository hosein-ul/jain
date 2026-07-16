import { NextRequest, NextResponse } from "next/server"
import { verifyAgentOwnership } from "@/lib/auth"
import { sendAgentEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const POST = createPaidRoute(
  "/api/asp/email/send",
  "$0.02",
  "Send an email from an agent mailbox to any recipient",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const {
      agentId, to, subject, body: emailBody, html,
      cc, bcc, replyTo, attachments, trackOpens, trackClicks, scheduledAt, threadId,
    } = body

    if (!agentId || !to || !subject || !emailBody) {
      return NextResponse.json({ error: "agentId, to, subject, and body are required" }, { status: 400 })
    }

    if (!(await verifyAgentOwnership(agentId, user.id))) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })
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
