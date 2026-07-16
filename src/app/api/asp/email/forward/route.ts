import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { forwardEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const POST = createPaidRoute(
  "/api/asp/email/forward",
  "$0.01",
  "Forward an email to one or more recipients, including original attachments",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { emailId, to, note } = body

    if (!emailId || !to) {
      return NextResponse.json({ error: "emailId and to are required" }, { status: 400 })
    }

    const result = await forwardEmail(emailId, to, note)
    return NextResponse.json(result, { status: 201 })
  }
)
