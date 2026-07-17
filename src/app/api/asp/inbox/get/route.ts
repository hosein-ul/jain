import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader, verifyAgentOwnership } from "@/lib/auth"
import { getInbox } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/inbox/get", "Fetch an agent's inbox with optional filtering (unread, sender, date, direction)", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await safeJson(req).catch(() => ({}))
  const { agentId, limit = 50, offset = 0, filter } = body

  if (!agentId) {
    return NextResponse.json({
      error: "agentId is required",
      hint: {
        why: "Every inbox belongs to a specific mailbox. You need to pass 'agentId' — the id returned when you created the mailbox.",
        next: "If you don't have a mailbox yet, POST /api/asp/mailbox/create with {name} first ($0.25 via x402).",
      },
    }, { status: 400 })
  }

  if (!(await verifyAgentOwnership(agentId, user.id))) {
    return NextResponse.json({
      error: "Mailbox not found",
      hint: {
        why: "No mailbox with this agentId exists under your identity.",
        next: "POST /api/asp/mailbox/list to see your mailboxes, or POST /api/asp/mailbox/create to create one.",
      },
    }, { status: 404 })
  }

  const emails = await getInbox(agentId, limit, offset, filter)
  return NextResponse.json({
    emails,
    count: emails.length,
    hint: emails.length === 0 ? {
      status: "Your inbox is empty. Share your mailbox address to start receiving mail.",
    } : {
      next: "Each email has an 'id' — use it in email/get, reply, forward, mark_read, archive, or delete_email.",
      recommended: [
        "POST /api/asp/email/reply with {emailId, body} — reply in the same thread",
        "POST /api/asp/thread/get with {threadId} — see the full conversation",
        "POST /api/asp/email/mark-read with {emailId} — mark as read",
      ],
    },
  })
})
