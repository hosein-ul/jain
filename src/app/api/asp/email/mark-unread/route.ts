import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { markRead } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"
import { missingFieldError, safeJson, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/email/mark-unread", "Mark an email as unread", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return unauthorizedError("email")

  const body = await safeJson(req)
  const { emailId } = body

  if (!emailId) return missingFieldError("emailId")

  const email = await markRead(emailId, false)
  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({ email })
})
