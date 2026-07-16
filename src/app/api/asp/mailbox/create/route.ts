import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { createAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "zerolayer.online"

export const POST = createPaidRoute(
  "/api/asp/mailbox/create",
  "$0.25",
  `Create a new agent mailbox with a unique @${EMAIL_DOMAIN} email address`,
  async (req: NextRequest) => {
    const user = await getUserFromOkxHeader(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { name, displayName, webhookUrl, signature } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const agent = await createAgent(user.id, name, { displayName, webhookUrl, signature })
    return NextResponse.json({
      mailbox: { ...agent, agentId: agent.id },
      hint: {
        next: "Save mailbox.agentId — you'll pass it as 'agentId' in every subsequent call (send_email, get_inbox, search_emails, update_mailbox, delete_mailbox).",
        recommended: [
          "POST /api/asp/inbox/get with {agentId} — read incoming emails",
          "POST /api/asp/email/send with {agentId, to, subject, body} — send an email",
          "POST /api/asp/mailbox/update with {agentId, webhookUrl} — enable real-time push notifications on inbound email",
        ],
      },
    }, { status: 201 })
  }
)
