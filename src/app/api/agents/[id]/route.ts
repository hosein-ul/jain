import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: agent } = await supabase
    .from("Agent")
    .select("*")
    .eq("id", id)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const { data: emails } = await supabase
    .from("Email")
    .select("*")
    .eq("agentId", id)
    .order("createdAt", { ascending: false })
    .limit(50)

  const { count } = await supabase
    .from("Email")
    .select("*", { count: "exact", head: true })
    .eq("agentId", id)

  return NextResponse.json({
    agent: { ...agent, emails: emails ?? [], _count: { emails: count ?? 0 } },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: agent } = await supabase
    .from("Agent")
    .select("*")
    .eq("id", id)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const body = await request.json()
  const { data: updated } = await supabase
    .from("Agent")
    .update({
      name: body.name ?? agent.name,
      webhookUrl: body.webhookUrl !== undefined ? body.webhookUrl : agent.webhookUrl,
      isActive: body.isActive ?? agent.isActive,
    })
    .eq("id", id)
    .select()
    .single()

  return NextResponse.json({ agent: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = (await validateApiKey(request)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: agent } = await supabase
    .from("Agent")
    .select("id")
    .eq("id", id)
    .eq("userId", user.id)
    .maybeSingle()

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  await supabase.from("Agent").delete().eq("id", id)

  return NextResponse.json({ deleted: true })
}
