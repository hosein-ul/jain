import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get("agentId")

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 })
  }

  const { data: agent } = await supabase
    .from("Agent")
    .select("webhookUrl")
    .eq("id", agentId)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  return NextResponse.json({ webhookUrl: agent.webhookUrl })
}

export async function POST(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()

  if (!body.agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 })
  }

  const { data: agent } = await supabase
    .from("Agent")
    .select("id")
    .eq("id", body.agentId)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const { data: updated } = await supabase
    .from("Agent")
    .update({ webhookUrl: body.webhookUrl ?? null })
    .eq("id", body.agentId)
    .select("webhookUrl")
    .single()

  return NextResponse.json({ webhookUrl: updated?.webhookUrl ?? null })
}
