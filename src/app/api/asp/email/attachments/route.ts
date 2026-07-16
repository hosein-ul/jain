import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { emailId, includeContent = false } = body

  if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

  const select = includeContent
    ? "id, emailId, filename, contentType, size, content"
    : "id, emailId, filename, contentType, size"

  const { data: attachments } = await supabase
    .from("Attachment")
    .select(select)
    .eq("emailId", emailId)

  return NextResponse.json({ attachments: attachments ?? [], count: attachments?.length ?? 0 })
})
