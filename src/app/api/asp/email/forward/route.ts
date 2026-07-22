import { NextRequest, NextResponse } from "next/server"
import { verifyEmailOwnership } from "@/lib/auth"
import { forwardEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/forward",
  "$0.01",
  "Forward an email to one or more recipients, including original attachments",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { emailId, to, note } = body

    if (!emailId) return missingFieldError("emailId")
    if (!to) return missingFieldError("to", "Recipient — a single address string or an array of addresses.")

    if (!(await verifyEmailOwnership(emailId, user.id))) {
      return notFoundError("email", "This emailId isn't in any mailbox you own.")
    }

    const result = await forwardEmail(emailId, to, note)
    return NextResponse.json(result, { status: 201 })
  }
)
