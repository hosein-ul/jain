import { NextRequest, NextResponse } from "next/server"
import { verifyEmailOwnership } from "@/lib/auth"
import { cancelScheduled } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { missingFieldError, safeJson, resolvePaidUser, unauthorizedError, notFoundError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/cancel-scheduled",
  "$0.005",
  "Cancel a previously scheduled email before it is sent",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { emailId } = body

    if (!emailId) return missingFieldError("emailId")

    if (!(await verifyEmailOwnership(emailId, user.id))) {
      return notFoundError("email", "This emailId isn't in any mailbox you own.")
    }

    const email = await cancelScheduled(emailId)
    return NextResponse.json({ email })
  }
)
