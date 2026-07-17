import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { sendTemplate } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/template/send",
  "$0.02",
  "Send an email using a saved template with variable substitution",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { agentId, templateId, to, variables, cc, bcc } = body

    if (!agentId || !templateId || !to) {
      return NextResponse.json({ error: "agentId, templateId, and to are required" }, { status: 400 })
    }

    const result = await sendTemplate(agentId, user.id, templateId, to, variables ?? {}, { cc, bcc })
    return NextResponse.json(result, { status: 201 })
  }
)
