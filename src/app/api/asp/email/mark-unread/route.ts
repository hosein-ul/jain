import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { markRead } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { emailId } = body

  if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

  const email = await markRead(emailId, false)
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({ email })
})
