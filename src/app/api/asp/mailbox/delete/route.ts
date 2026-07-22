import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { deleteAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/mailbox/delete",
  "$0.005",
  "Permanently delete an agent mailbox and all its emails",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { agentId } = body

    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

    const ok = await deleteAgent(agentId, user.id)
    if (!ok) return notFoundError("mailbox", "This agentId doesn't exist under your tenant. POST /api/asp/mailbox/list to see ids you own.")

    return NextResponse.json({ deleted: true })
  }
)
