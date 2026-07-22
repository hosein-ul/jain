import { NextRequest, NextResponse } from "next/server"
import { verifyAgentOwnership } from "@/lib/auth"
import { searchEmails } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/search",
  "$0.005",
  "Full-text search across an agent's emails by subject, body, or sender",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { agentId, query, limit = 20 } = body

    if (!agentId) return missingFieldError("agentId", "Get this from mailbox/create or mailbox/list.")
    if (!query) return missingFieldError("query", "The text to search for in subjects, bodies, and sender addresses.")

    if (!(await verifyAgentOwnership(agentId, user.id))) {
      return notFoundError("mailbox", "This agentId doesn't exist under your tenant. POST /api/asp/mailbox/list to see ids you own.")
    }

    const emails = await searchEmails(agentId, query, limit)
    return NextResponse.json({ emails, count: emails.length })
  }
)
