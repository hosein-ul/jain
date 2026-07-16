import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader, verifyAgentOwnership } from "@/lib/auth"
import { getInbox } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { agentId, limit = 50, offset = 0, filter } = body

  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

  if (!(await verifyAgentOwnership(agentId, user.id))) {
    return NextResponse.json({ error: "Mailbox not found" }, { status: 404 })
  }

  const emails = await getInbox(agentId, limit, offset, filter)
  return NextResponse.json({ emails, count: emails.length })
})
