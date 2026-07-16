import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { listAgents } from "@/lib/email-service"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agents = await listAgents(user.id)
  return NextResponse.json({ mailboxes: agents })
})
