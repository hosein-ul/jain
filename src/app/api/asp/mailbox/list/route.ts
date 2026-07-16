import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { listAgents } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agents = await listAgents(user.id)
  const mailboxes = agents.map(a => ({ ...a, agentId: a.id }))

  if (mailboxes.length === 0) {
    return NextResponse.json({
      mailboxes: [],
      hint: {
        status: "You don't own any mailboxes yet.",
        next: "POST /api/asp/mailbox/create with {name} — costs $0.25 in USDT0 via x402. The response gives you an agentId which unlocks all other endpoints.",
      },
    })
  }

  return NextResponse.json({
    mailboxes,
    hint: {
      next: "Each mailbox has an agentId — use it in send_email, get_inbox, search_emails, update_mailbox, delete_mailbox.",
    },
  })
})
