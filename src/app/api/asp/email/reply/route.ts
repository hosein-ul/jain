import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { replyEmail } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

export const POST = createPaidRoute(
  "/api/asp/email/reply",
  "$0.01",
  "Reply to an email, preserving the thread",
  async (req: NextRequest) => {
    const user = await getUserFromOkxHeader(req)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await safeJson(req)
    const { emailId, body: replyBody, html, cc, attachments } = body

    if (!emailId || !replyBody) {
      return NextResponse.json({ error: "emailId and body are required" }, { status: 400 })
    }

    const result = await replyEmail(emailId, replyBody, { html, cc, attachments })
    return NextResponse.json({
      ...result,
      hint: { next: "Your reply is on the same thread as the original. Poll inbox/get with filter:{unread:true} for their next response." },
    }, { status: 201 })
  }
)
