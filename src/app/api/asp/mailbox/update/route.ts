import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { updateAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/mailbox/update",
  "$0.005",
  "Update mailbox settings: display name, signature, auto-reply, webhook, or active status",
  async (req: NextRequest) => {
    const user = await getUserFromOkxHeader(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { agentId, displayName, signature, autoReply, autoReplyActive, webhookUrl, isActive } = body

    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

    const agent = await updateAgent(agentId, user.id, {
      displayName, signature, autoReply, autoReplyActive, webhookUrl, isActive,
    })
    if (!agent) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })

    return NextResponse.json({ mailbox: agent })
  }
)
