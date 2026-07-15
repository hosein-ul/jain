import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { sendAgentEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { agentId, to, subject, body: emailBody, html, cc, bcc, replyTo } = body

  if (!agentId || !to || !subject || !emailBody) {
    return NextResponse.json(
      { error: "agentId, to, subject, and body are required" },
      { status: 400 }
    )
  }

  const { data: agent } = await supabase
    .from("Agent")
    .select("id")
    .eq("id", agentId)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const result = await sendAgentEmail(agentId, to, subject, emailBody, html, cc, bcc, replyTo)
  return NextResponse.json(result, { status: 201 })
}
