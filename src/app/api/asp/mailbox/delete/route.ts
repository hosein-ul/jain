import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { deleteAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/mailbox/delete",
  "$0.005",
  "Permanently delete an agent mailbox and all its emails",
  async (req: NextRequest) => {
    const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { agentId } = body

    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

    const ok = await deleteAgent(agentId, user.id)
    if (!ok) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })

    return NextResponse.json({ deleted: true })
  }
)
