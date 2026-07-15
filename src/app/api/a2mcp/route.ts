import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createAgent, sendAgentEmail, getInbox, receiveEmail } from "@/lib/email-service"
import { generateApiKey, getOrCreateDemoUser } from "@/lib/auth"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "agentmail.dev"

// USDT0 on X Layer (6 decimals). 1 USDT0 = 1_000_000 units.
const PRICING: Record<string, number> = {
  create_mailbox: 100_000,  // $0.10
  send_email:      50_000,  // $0.05
  get_inbox:       10_000,  // $0.01
  get_email:        5_000,  // $0.005
  reply_email:     50_000,  // $0.05
  receive_email:       0,   // free — inbound webhook, not agent-initiated
}

// USDT0 contract on X Layer mainnet
const USDT0_ADDRESS = "0x74b7f16337b8972027f6196a17a631ac6dE26d22"

function x402Challenge(action: string, resource: string) {
  const amount = PRICING[action] ?? 10_000
  return {
    x402Version: 1,
    error: "Payment required",
    accepts: [
      {
        scheme: "exact",
        network: "xlayer-mainnet",
        maxAmountRequired: String(amount),
        resource,
        description: `AgentMail: ${action} — ${(amount / 1_000_000).toFixed(3)} USDT0`,
        mimeType: "application/json",
        payToAddress: process.env.PAYMENT_WALLET ?? "",
        maxTimeoutSeconds: 300,
        asset: USDT0_ADDRESS,
        extra: { name: "USDT0", version: "1" },
      },
    ],
  }
}

async function resolveAgentId(agentId?: string, agentName?: string): Promise<string | null> {
  if (agentId) return agentId
  if (!agentName) return null
  const addr = agentName.includes("@") ? agentName : `${agentName}@${EMAIL_DOMAIN}`
  const { data } = await supabase.from("Agent").select("id").eq("emailAddress", addr).maybeSingle()
  return data?.id ?? null
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, params } = body

  if (!action || !params) {
    return NextResponse.json({ error: "action and params are required" }, { status: 400 })
  }

  if (!(action in PRICING)) {
    return NextResponse.json(
      {
        error: `Unknown action: ${action}`,
        available_actions: Object.keys(PRICING),
      },
      { status: 400 }
    )
  }

  // x402 pay-per-call — only enforced when PAYMENT_REQUIRED=true and a wallet is configured
  const paymentRequired =
    process.env.PAYMENT_REQUIRED === "true" &&
    !!process.env.PAYMENT_WALLET &&
    PRICING[action] > 0

  if (paymentRequired) {
    const paymentProof = request.headers.get("x-payment")
    if (!paymentProof) {
      return NextResponse.json(x402Challenge(action, request.url), { status: 402 })
    }
    // TODO: verify paymentProof on-chain via OKX.AI Payment SDK
    // const verified = await verifyX402Payment(paymentProof, PRICING[action], USDT0_ADDRESS)
    // if (!verified) return NextResponse.json({ error: "Invalid payment proof" }, { status: 402 })
  }

  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

  switch (action) {
    case "create_mailbox": {
      const { agent_name, webhook_url } = params
      if (!agent_name) return NextResponse.json({ error: "agent_name required" }, { status: 400 })

      const agent = await createAgent(user.id, agent_name, webhook_url)
      const apiKey = generateApiKey()
      await supabase.from("ApiKey").insert({ key: apiKey, name: `Key for ${agent_name}`, userId: user.id })

      return NextResponse.json({
        email: agent?.emailAddress,
        agent_id: agent?.id,
        api_key: apiKey,
      })
    }

    case "send_email": {
      const { agent_id, from_agent, to, subject, body: emailBody, html } = params
      const agentId = await resolveAgentId(agent_id, from_agent)

      if (!agentId || !to || !subject || !emailBody) {
        return NextResponse.json(
          { error: "agent_id/from_agent, to, subject, body required" },
          { status: 400 }
        )
      }

      const result = await sendAgentEmail(agentId, to, subject, emailBody, html)
      return NextResponse.json({ sent: true, email_id: result.email?.id })
    }

    case "get_inbox": {
      const agentId = await resolveAgentId(params.agent_id, params.agent_name)
      if (!agentId) return NextResponse.json({ error: "agent_id or agent_name required" }, { status: 400 })

      const emails = await getInbox(agentId, params.limit || 20)
      return NextResponse.json({ emails })
    }

    case "get_email": {
      const { email_id } = params
      if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })

      const { data: email } = await supabase.from("Email").select("*").eq("id", email_id).maybeSingle()
      if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

      return NextResponse.json({ email })
    }

    case "reply_email": {
      const { email_id, body: replyBody, html } = params
      if (!email_id || !replyBody)
        return NextResponse.json({ error: "email_id and body required" }, { status: 400 })

      const { data: original } = await supabase.from("Email").select("*").eq("id", email_id).maybeSingle()
      if (!original) return NextResponse.json({ error: "Email not found" }, { status: 404 })

      const result = await sendAgentEmail(
        original.agentId,
        original.from,
        `Re: ${original.subject}`,
        replyBody,
        html
      )
      return NextResponse.json({ sent: true, email_id: result.email?.id })
    }

    case "receive_email": {
      const { to, from, subject, body: emailBody, html } = params
      if (!to || !from || !subject)
        return NextResponse.json({ error: "to, from, subject required" }, { status: 400 })

      const email = await receiveEmail(to, from, subject, emailBody || "", html)
      return NextResponse.json({ received: true, email_id: email?.id })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

// MCP tool-list endpoint — agents call GET /api/a2mcp to discover available tools
export async function GET() {
  return NextResponse.json({
    name: "agentmail",
    version: "1.0.0",
    description: "Real email infrastructure for AI agents — send, receive, and manage email via API",
    pricing: "x402 pay-per-call, USDT0 on X Layer",
    tools: Object.entries(PRICING).map(([action, price]) => ({
      name: action,
      price_usdt0: (price / 1_000_000).toFixed(3),
      price_units: price,
    })),
    actions: {
      create_mailbox: {
        description: "Provision a new email address for an agent",
        params: { agent_name: "string", webhook_url: "string (optional)" },
        returns: { email: "string", agent_id: "string", api_key: "string" },
      },
      send_email: {
        description: "Send an email from an agent's address",
        params: {
          from_agent: "string (agent name or email)",
          to: "string",
          subject: "string",
          body: "string",
          html: "string (optional)",
        },
        returns: { sent: "boolean", email_id: "string" },
      },
      get_inbox: {
        description: "Retrieve emails in an agent's inbox",
        params: { agent_name: "string", limit: "number (default 20)" },
        returns: { emails: "Email[]" },
      },
      get_email: {
        description: "Get a single email by ID",
        params: { email_id: "string" },
        returns: { email: "Email" },
      },
      reply_email: {
        description: "Reply to an existing email thread",
        params: { email_id: "string", body: "string", html: "string (optional)" },
        returns: { sent: "boolean", email_id: "string" },
      },
      receive_email: {
        description: "Deliver an inbound email to an agent mailbox (used by SendGrid webhook)",
        params: { to: "string", from: "string", subject: "string", body: "string" },
        returns: { received: "boolean", email_id: "string" },
      },
    },
  })
}
