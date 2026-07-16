import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { emailId } = body

  if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

  const { data: email } = await supabase
    .from("Email")
    .select("*, attachments:Attachment(*), agent:Agent!inner(userId)")
    .eq("id", emailId)
    .eq("agent.userId", user.id)
    .maybeSingle()

  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({ email })
})
