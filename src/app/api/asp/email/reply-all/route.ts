import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { replyAll } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/email/reply-all",
  "$0.01",
  "Reply to all recipients of an email thread",
  async (req: NextRequest) => {
    const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { emailId, body: replyBody, html } = body

    if (!emailId || !replyBody) {
      return NextResponse.json({ error: "emailId and body are required" }, { status: 400 })
    }

    const result = await replyAll(emailId, replyBody, html)
    return NextResponse.json(result, { status: 201 })
  }
)
