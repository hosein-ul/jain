import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { cancelScheduled } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/cancel-scheduled",
  "$0.005",
  "Cancel a previously scheduled email before it is sent",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { emailId } = body

    if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

    const email = await cancelScheduled(emailId)
    return NextResponse.json({ email })
  }
)
