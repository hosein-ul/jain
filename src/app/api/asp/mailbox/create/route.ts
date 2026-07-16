import { NextRequest, NextResponse } from "next/server"
import { issueAccessToken } from "@/lib/auth"
import { createAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser } from "@/lib/asp-hints"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "zerolayer.online"

export const POST = createPaidRoute(
  "/api/asp/mailbox/create",
  "$0.25",
  `Create a new agent mailbox with a unique @${EMAIL_DOMAIN} email address`,
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) {
      return NextResponse.json({
        error: "Unable to identify caller",
        hint: {
          why: "This endpoint identifies you from the x402 payment proof (payer wallet). In dev mode you may also send X-Wallet-Address or X-OKX-Agent-ID.",
          next: "Include an Authorization: Bearer <at_...> token from a previous mailbox/create, OR pay via x402, OR pass a dev header.",
        },
      }, { status: 401 })
    }

    const body = await safeJson(req)
    const { name, displayName, webhookUrl, signature } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const agent = await createAgent(user.id, name, { displayName, webhookUrl, signature })
    const accessToken = await issueAccessToken(user.id)

    return NextResponse.json({
      mailbox: { ...agent, agentId: agent.id },
      accessToken,
      hint: {
        next: "Save two things: mailbox.agentId (pass as 'agentId' to send_email, get_inbox, etc.) AND accessToken (send as 'Authorization: Bearer <token>' on ALL subsequent calls — this authenticates you without re-paying).",
        walletBound: user.walletAddress ?? null,
        recommended: [
          "POST /api/asp/inbox/get with {agentId} — read incoming emails",
          "POST /api/asp/email/send with {agentId, to, subject, body} — send an email",
          "POST /api/asp/mailbox/update with {agentId, webhookUrl} — enable real-time push notifications",
        ],
      },
    }, { status: 201 })
  }
)
