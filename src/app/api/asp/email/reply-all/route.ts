import { NextRequest, NextResponse } from "next/server"
import { } from "@/lib/auth"
import { replyAll } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/email/reply-all",
  "$0.01",
  "Reply to all recipients of an email thread",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { emailId, body: replyBody, html } = body

    if (!emailId || !replyBody) {
      return NextResponse.json({ error: "emailId and body are required" }, { status: 400 })
    }

    const result = await replyAll(emailId, replyBody, html)
    return NextResponse.json(result, { status: 201 })
  }
)
