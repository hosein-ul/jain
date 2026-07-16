import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { sendBulk } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/template/send-bulk",
  "$0.05",
  "Send a template email to multiple recipients with per-recipient variable substitution",
  async (req: NextRequest) => {
    const user = await getUserFromOkxHeader(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { agentId, templateId, recipients } = body

    if (!agentId || !templateId || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "agentId, templateId, and recipients[] are required" }, { status: 400 })
    }

    const result = await sendBulk(agentId, user.id, templateId, recipients)
    return NextResponse.json(result, { status: 201 })
  }
)
