import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { updateAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/mailbox/update",
  "$0.005",
  "Update mailbox settings: display name, signature, auto-reply, webhook, or active status",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { agentId, displayName, signature, autoReply, autoReplyActive, webhookUrl, isActive } = body

    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

    const agent = await updateAgent(agentId, user.id, {
      displayName, signature, autoReply, autoReplyActive, webhookUrl, isActive,
    })
    if (!agent) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })

    return NextResponse.json({ mailbox: agent })
  }
)
