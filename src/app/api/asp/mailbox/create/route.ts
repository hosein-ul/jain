import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { createAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN ?? "agentmail.dev"

export const POST = createPaidRoute(
  "/api/asp/mailbox/create",
  "$0.25",
  `Create a new agent mailbox with a unique @${EMAIL_DOMAIN} email address`,
  async (req: NextRequest) => {
    const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, displayName, webhookUrl, signature } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const agent = await createAgent(user.id, name, { displayName, webhookUrl, signature })
    return NextResponse.json({ mailbox: agent }, { status: 201 })
  }
)
