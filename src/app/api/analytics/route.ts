import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateDemoUser } from "@/lib/auth"
import { getEmailStats } from "@/lib/email-service"

export async function GET() {
  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const stats = await getEmailStats(user.id)

  const { data: agents } = await supabase
    .from("Agent")
    .select("id")
    .eq("userId", user.id)

  const agentIds = (agents ?? []).map((a) => a.id)

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: recentEmails } = agentIds.length
    ? await supabase
        .from("Email")
        .select("direction, createdAt")
        .in("agentId", agentIds)
        .gte("createdAt", sevenDaysAgo.toISOString())
        .order("createdAt", { ascending: true })
    : { data: [] }

  const dailyStats: Record<string, { sent: number; received: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dailyStats[date.toISOString().slice(0, 10)] = { sent: 0, received: 0 }
  }

  for (const email of recentEmails ?? []) {
    const key = email.createdAt.slice(0, 10)
    if (dailyStats[key]) {
      if (email.direction === "outbound") dailyStats[key].sent++
      else dailyStats[key].received++
    }
  }

  const { data: agentRows } = agentIds.length
    ? await supabase.from("Agent").select("*").eq("userId", user.id)
    : { data: [] }

  const { data: emailCountRows } = agentIds.length
    ? await supabase.from("Email").select("agentId").in("agentId", agentIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const row of emailCountRows ?? []) {
    countMap[row.agentId] = (countMap[row.agentId] ?? 0) + 1
  }

  return NextResponse.json({
    ...stats,
    dailyStats,
    agentStats: (agentRows ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      emailAddress: a.emailAddress,
      totalEmails: countMap[a.id] ?? 0,
      isActive: a.isActive,
    })),
  })
}
