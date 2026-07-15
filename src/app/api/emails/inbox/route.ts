import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { getInbox } from "@/lib/email-service"

export async function GET(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get("agentId")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 })

  const { data: agent } = await supabase
    .from("Agent")
    .select("id")
    .eq("id", agentId)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const emails = await getInbox(agentId, limit, offset)
  const { count: total } = await supabase
    .from("Email")
    .select("*", { count: "exact", head: true })
    .eq("agentId", agentId)

  return NextResponse.json({ emails, total: total ?? 0, limit, offset })
}
