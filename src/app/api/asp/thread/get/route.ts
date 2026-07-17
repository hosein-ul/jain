import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { getThread } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/thread/get", "Fetch all emails in a conversation thread in chronological order", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await safeJson(req)
  const { threadId } = body

  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 })

  const emails = await getThread(threadId)
  return NextResponse.json({
    thread: emails,
    count: emails.length,
    hint: {
      next: "Emails are in chronological order (oldest first). Use the last one's id in email/reply to continue the conversation.",
    },
  })
})
