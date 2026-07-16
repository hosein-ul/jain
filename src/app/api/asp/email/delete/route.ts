import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { deleteEmail } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { emailId } = body

  if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

  const ok = await deleteEmail(emailId)
  if (!ok) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({ deleted: true })
})
