import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { deleteEmail } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/email/delete", "Permanently delete an email and all its attachments", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await safeJson(req)
  const { emailId } = body

  if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

  const ok = await deleteEmail(emailId)
  if (!ok) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({ deleted: true })
})
