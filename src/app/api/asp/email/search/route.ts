import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser, verifyAgentOwnership } from "@/lib/auth"
import { searchEmails } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/email/search",
  "$0.005",
  "Full-text search across an agent's emails by subject, body, or sender",
  async (req: NextRequest) => {
    const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { agentId, query, limit = 20 } = body

    if (!agentId || !query) {
      return NextResponse.json({ error: "agentId and query are required" }, { status: 400 })
    }

    if (!(await verifyAgentOwnership(agentId, user.id))) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })
    }

    const emails = await searchEmails(agentId, query, limit)
    return NextResponse.json({ emails, count: emails.length })
  }
)
