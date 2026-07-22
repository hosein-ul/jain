import { NextRequest, NextResponse } from "next/server"
import { verifyEmailOwnership } from "@/lib/auth"
import { replyAll } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/reply-all",
  "$0.01",
  "Reply to all recipients of an email thread",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { emailId, body: replyBody, html } = body

    if (!emailId) return missingFieldError("emailId")
    if (!replyBody) return missingFieldError("body", "The text of your reply.")

    if (!(await verifyEmailOwnership(emailId, user.id))) {
      return notFoundError("email", "This emailId isn't in any mailbox you own.")
    }

    const result = await replyAll(emailId, replyBody, html)
    return NextResponse.json(result, { status: 201 })
  }
)
