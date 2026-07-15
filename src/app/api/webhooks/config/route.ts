import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const user = await validateApiKey(request) || await getOrCreateDemoUser()
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get("agentId")

  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 })
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  })
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  return NextResponse.json({ webhookUrl: agent.webhookUrl })
}

export async function POST(request: NextRequest) {
  const user = await validateApiKey(request) || await getOrCreateDemoUser()
  const body = await request.json()

  if (!body.agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 })
  }

  const agent = await prisma.agent.findFirst({
    where: { id: body.agentId, userId: user.id },
  })
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  const updated = await prisma.agent.update({
    where: { id: body.agentId },
    data: { webhookUrl: body.webhookUrl || null },
  })

  return NextResponse.json({ webhookUrl: updated.webhookUrl })
}
