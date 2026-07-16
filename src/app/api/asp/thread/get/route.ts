import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { getThread } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { threadId } = body

  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 })

  const emails = await getThread(threadId)
  return NextResponse.json({ thread: emails, count: emails.length })
})
