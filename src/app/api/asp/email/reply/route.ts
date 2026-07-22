import { NextRequest, NextResponse } from "next/server"
import { verifyEmailOwnership } from "@/lib/auth"
import { replyEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/reply",
  "$0.01",
  "Reply to an email, preserving the thread",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { emailId, body: replyBody, html, cc, attachments } = body

    if (!emailId) return missingFieldError("emailId", "Get this from a prior inbox/get or search response.")
    if (!replyBody) return missingFieldError("body", "The text of your reply. HTML is optional in a separate 'html' field.")

    if (!(await verifyEmailOwnership(emailId, user.id))) {
      return notFoundError("email", "This emailId isn't in any mailbox you own. Confirm the id with POST /api/asp/inbox/get.")
    }

    const result = await replyEmail(emailId, replyBody, { html, cc, attachments })
    return NextResponse.json({
      ...result,
      hint: { next: "Your reply is on the same thread as the original. Poll inbox/get with filter:{unread:true} for their next response." },
    }, { status: 201 })
  }
)
