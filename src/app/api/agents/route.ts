import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { createAgent } from "@/lib/email-service"

export async function GET(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: agents } = await supabase
    .from("Agent")
    .select("*")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })

  if (!agents) return NextResponse.json({ agents: [] })

  const agentIds = agents.map((a) => a.id)
  const { data: emailRows } = await supabase
    .from("Email")
    .select("agentId")
    .in("agentId", agentIds)

  const countMap: Record<string, number> = {}
  for (const row of emailRows ?? []) {
    countMap[row.agentId] = (countMap[row.agentId] ?? 0) + 1
  }

  return NextResponse.json({
    agents: agents.map((a) => ({ ...a, _count: { emails: countMap[a.id] ?? 0 } })),
  })
}

export async function POST(request: NextRequest) {
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, webhookUrl } = body

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

  const agent = await createAgent(user.id, name, webhookUrl)
  return NextResponse.json({ agent }, { status: 201 })
}
