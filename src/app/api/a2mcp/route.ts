import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import {
  createAgent, updateAgent, deleteAgent, listAgents,
  sendAgentEmail, sendTemplate, sendBulk, cancelScheduled,
  getInbox, getThread, searchEmails,
  replyEmail, replyAll, forwardEmail,
  markRead, archiveEmail, deleteEmail,
  receiveEmail,
} from "@/lib/email-service"
import { generateApiKey, getOrCreateDemoUser } from "@/lib/auth"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "agentmail.dev"

// USDT0 on X Layer mainnet (6 decimals = 1_000_000 units per USDT0)
const USDT0_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736"

const PRICING: Record<string, number> = {
  // Mailbox management
  create_mailbox:    100_000,   // $0.10
  update_mailbox:     10_000,   // $0.01
  delete_mailbox:     10_000,   // $0.01
  list_mailboxes:      5_000,   // $0.005
  // Sending
  send_email:         50_000,   // $0.05
  send_template:      50_000,   // $0.05
  send_bulk:         100_000,   // $0.10 per batch
  cancel_scheduled:   10_000,   // $0.01
  // Reading
  get_inbox:          10_000,   // $0.01
  get_email:           5_000,   // $0.005
  get_thread:          5_000,   // $0.005
  search_emails:      10_000,   // $0.01
  // Actions
  reply:              50_000,   // $0.05
  reply_all:          50_000,   // $0.05
  forward:            50_000,   // $0.05
  mark_read:           1_000,   // $0.001
  mark_unread:         1_000,   // $0.001
  archive_email:       5_000,   // $0.005
  delete_email:        5_000,   // $0.005
  // Inbound (internal webhook — free)
  receive_email:           0,
}

function x402Challenge(action: string, url: string) {
  const amount = PRICING[action] ?? 10_000
  const challenge = {
    x402Version: 2,
    resource: {
      url,
      description: `AgentMail: ${action} (${(amount / 1_000_000).toFixed(3)} USDT0)`,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: "eip155:196",
        asset: USDT0_ADDRESS,
        amount: String(amount),
        payTo: process.env.PAYMENT_WALLET ?? "",
        maxTimeoutSeconds: 300,
        extra: { name: "USD₮0", version: "1" },
      },
    ],
  }
  const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64")
  return { encoded, challenge }
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

  if (!action || typeof params !== "object") {
    return NextResponse.json({ error: "action and params are required" }, { status: 400 })
  }

  if (!(action in PRICING)) {
    return NextResponse.json(
      { error: `Unknown action: ${action}`, available_actions: Object.keys(PRICING) },
      { status: 400 }
    )
  }

  // x402 pay-per-call — enforced when PAYMENT_REQUIRED=true and wallet is configured
  const paymentRequired =
    process.env.PAYMENT_REQUIRED === "true" &&
    !!process.env.PAYMENT_WALLET &&
    PRICING[action] > 0

  if (paymentRequired) {
    const paymentProof = request.headers.get("x-payment")
    if (!paymentProof) {
      const { encoded, challenge } = x402Challenge(action, request.url)
      return NextResponse.json(
        { error: "Payment required", ...challenge },
        { status: 402, headers: { "PAYMENT-REQUIRED": encoded } }
      )
    }
    // TODO: verify on-chain via OKX Payment SDK
  }

  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ error: "Service unavailable" }, { status: 503 })

  try {
    switch (action) {

      // ── MAILBOX MANAGEMENT ────────────────────────────────────────────

      case "create_mailbox": {
        const { agent_name, display_name, signature, webhook_url } = params
        if (!agent_name) return NextResponse.json({ error: "agent_name required" }, { status: 400 })

        const agent = await createAgent(user.id, agent_name, { displayName: display_name, signature, webhookUrl: webhook_url })
        const apiKey = generateApiKey()
        await supabase.from("ApiKey").insert({ key: apiKey, name: `Key for ${agent_name}`, userId: user.id })

        return NextResponse.json({ email: agent?.emailAddress, agent_id: agent?.id, api_key: apiKey, agent })
      }

      case "update_mailbox": {
        const { agent_id, agent_name, display_name, signature, auto_reply, auto_reply_active, webhook_url, is_active } = params
        const agentId = await resolveAgentId(agent_id, agent_name)
        if (!agentId) return NextResponse.json({ error: "agent_id or agent_name required" }, { status: 400 })

        const updated = await updateAgent(agentId, user.id, {
          ...(display_name !== undefined ? { displayName: display_name } : {}),
          ...(signature    !== undefined ? { signature } : {}),
          ...(auto_reply   !== undefined ? { autoReply: auto_reply } : {}),
          ...(auto_reply_active !== undefined ? { autoReplyActive: auto_reply_active } : {}),
          ...(webhook_url  !== undefined ? { webhookUrl: webhook_url } : {}),
          ...(is_active    !== undefined ? { isActive: is_active } : {}),
        })

        return NextResponse.json({ updated })
      }

      case "delete_mailbox": {
        const agentId = await resolveAgentId(params.agent_id, params.agent_name)
        if (!agentId) return NextResponse.json({ error: "agent_id or agent_name required" }, { status: 400 })

        const ok = await deleteAgent(agentId, user.id)
        return NextResponse.json({ deleted: ok })
      }

      case "list_mailboxes": {
        const agents = await listAgents(user.id)
        return NextResponse.json({ agents, total: agents.length })
      }

      // ── SENDING ───────────────────────────────────────────────────────

      case "send_email": {
        const { agent_id, from_agent, to, subject, body: emailBody, html, cc, bcc, reply_to, attachments, track_opens, track_clicks, schedule_at } = params
        const agentId = await resolveAgentId(agent_id, from_agent)
        if (!agentId || !to || !subject || !emailBody) {
          return NextResponse.json({ error: "from_agent/agent_id, to, subject, body required" }, { status: 400 })
        }

        const result = await sendAgentEmail(agentId, to, subject, emailBody, {
          html,
          cc,
          bcc,
          replyTo: reply_to,
          attachments,
          trackOpens: track_opens,
          trackClicks: track_clicks,
          scheduledAt: schedule_at ? new Date(schedule_at) : undefined,
        })
        return NextResponse.json({ sent: true, email_id: result.email?.id, status: result.email?.status })
      }

      case "send_template": {
        const { agent_id, from_agent, to, template_id, variables, cc, bcc } = params
        const agentId = await resolveAgentId(agent_id, from_agent)
        if (!agentId || !to || !template_id) {
          return NextResponse.json({ error: "from_agent/agent_id, to, template_id required" }, { status: 400 })
        }

        const result = await sendTemplate(agentId, user.id, template_id, to, variables ?? {}, { cc, bcc })
        return NextResponse.json({ sent: true, email_id: result.email?.id })
      }

      case "send_bulk": {
        const { agent_id, from_agent, template_id, recipients } = params
        const agentId = await resolveAgentId(agent_id, from_agent)
        if (!agentId || !template_id || !Array.isArray(recipients) || recipients.length === 0) {
          return NextResponse.json({ error: "from_agent/agent_id, template_id, recipients[] required" }, { status: 400 })
        }

        const result = await sendBulk(agentId, user.id, template_id, recipients)
        return NextResponse.json(result)
      }

      case "cancel_scheduled": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })

        const email = await cancelScheduled(email_id)
        return NextResponse.json({ cancelled: true, email })
      }

      // ── INBOX / READING ───────────────────────────────────────────────

      case "get_inbox": {
        const agentId = await resolveAgentId(params.agent_id, params.agent_name)
        if (!agentId) return NextResponse.json({ error: "agent_id or agent_name required" }, { status: 400 })

        const emails = await getInbox(agentId, params.limit ?? 20, params.offset ?? 0, params.filter)
        return NextResponse.json({ emails, count: emails.length })
      }

      case "get_email": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })

        const { data: email } = await supabase
          .from("Email")
          .select("*, attachments:Attachment(*)")
          .eq("id", email_id)
          .maybeSingle()

        if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })
        if (!email.isRead) await supabase.from("Email").update({ isRead: true }).eq("id", email_id)

        return NextResponse.json({ email })
      }

      case "get_thread": {
        const { thread_id } = params
        if (!thread_id) return NextResponse.json({ error: "thread_id required" }, { status: 400 })

        const emails = await getThread(thread_id)
        return NextResponse.json({ emails, count: emails.length })
      }

      case "search_emails": {
        const agentId = await resolveAgentId(params.agent_id, params.agent_name)
        if (!agentId || !params.query) {
          return NextResponse.json({ error: "agent_id/agent_name and query required" }, { status: 400 })
        }

        const results = await searchEmails(agentId, params.query, params.limit ?? 20)
        return NextResponse.json({ emails: results, count: results.length })
      }

      // ── ACTIONS ───────────────────────────────────────────────────────

      case "reply": {
        const { email_id, body: replyBody, html, cc, attachments } = params
        if (!email_id || !replyBody) return NextResponse.json({ error: "email_id and body required" }, { status: 400 })

        const result = await replyEmail(email_id, replyBody, { html, cc, attachments })
        return NextResponse.json({ sent: true, email_id: result.email?.id })
      }

      case "reply_all": {
        const { email_id, body: replyBody, html } = params
        if (!email_id || !replyBody) return NextResponse.json({ error: "email_id and body required" }, { status: 400 })

        const result = await replyAll(email_id, replyBody, html)
        return NextResponse.json({ sent: true, email_id: result.email?.id })
      }

      case "forward": {
        const { email_id, to, note } = params
        if (!email_id || !to) return NextResponse.json({ error: "email_id and to required" }, { status: 400 })

        const result = await forwardEmail(email_id, to, note)
        return NextResponse.json({ sent: true, email_id: result.email?.id })
      }

      case "mark_read": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })
        const email = await markRead(email_id, true)
        return NextResponse.json({ ok: true, email })
      }

      case "mark_unread": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })
        const email = await markRead(email_id, false)
        return NextResponse.json({ ok: true, email })
      }

      case "archive_email": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })
        const email = await archiveEmail(email_id)
        return NextResponse.json({ ok: true, email })
      }

      case "delete_email": {
        const { email_id } = params
        if (!email_id) return NextResponse.json({ error: "email_id required" }, { status: 400 })
        const ok = await deleteEmail(email_id)
        return NextResponse.json({ deleted: ok })
      }

      case "receive_email": {
        const { to, from, subject, body: emailBody, html, attachments } = params
        if (!to || !from || !subject) {
          return NextResponse.json({ error: "to, from, subject required" }, { status: 400 })
        }
        const email = await receiveEmail(to, from, subject, emailBody || "", html, attachments)
        return NextResponse.json({ received: true, email_id: email?.id })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}

// GET /api/a2mcp — tool discovery for OKX.AI marketplace
export async function GET() {
  return NextResponse.json({
    name: "agentmail",
    version: "1.0.0",
    description: "Real email infrastructure for AI agents — send, receive, and manage email via API",
    pricing: "x402 pay-per-call, USDT0 on X Layer (eip155:196)",
    tools: Object.entries(PRICING).map(([action, price]) => ({
      name: action,
      price_usdt0: (price / 1_000_000).toFixed(3),
      price_units: price,
    })),
    actions: {
      // MAILBOX MANAGEMENT
      create_mailbox:   { params: { agent_name: "string", display_name: "string?", signature: "string?", webhook_url: "string?" }, returns: { email: "string", agent_id: "string", api_key: "string" } },
      update_mailbox:   { params: { agent_id: "string", display_name: "string?", signature: "string?", auto_reply: "string?", auto_reply_active: "boolean?", webhook_url: "string?", is_active: "boolean?" }, returns: { updated: "Agent" } },
      delete_mailbox:   { params: { agent_id: "string" }, returns: { deleted: "boolean" } },
      list_mailboxes:   { params: {}, returns: { agents: "Agent[]", total: "number" } },
      // SENDING
      send_email:       { params: { from_agent: "string", to: "string|string[]", subject: "string", body: "string", html: "string?", cc: "string|string[]?", bcc: "string|string[]?", reply_to: "string?", attachments: "Attachment[]?", track_opens: "boolean?", track_clicks: "boolean?", schedule_at: "ISO8601?" }, returns: { sent: "boolean", email_id: "string", status: "string" } },
      send_template:    { params: { from_agent: "string", to: "string|string[]", template_id: "string", variables: "object?", cc: "string|string[]?", bcc: "string|string[]?" }, returns: { sent: "boolean", email_id: "string" } },
      send_bulk:        { params: { from_agent: "string", template_id: "string", recipients: "[{to, variables?}]" }, returns: { total: "number", sent: "number", failed: "number" } },
      cancel_scheduled: { params: { email_id: "string" }, returns: { cancelled: "boolean" } },
      // INBOX / READING
      get_inbox:        { params: { agent_name: "string", limit: "number?", offset: "number?", filter: "{ unread?, from?, subject?, date_from?, date_to?, has_attachment?, direction: inbound|outbound|all }?" }, returns: { emails: "Email[]", count: "number" } },
      get_email:        { params: { email_id: "string" }, returns: { email: "Email" } },
      get_thread:       { params: { thread_id: "string" }, returns: { emails: "Email[]", count: "number" } },
      search_emails:    { params: { agent_name: "string", query: "string", limit: "number?" }, returns: { emails: "Email[]", count: "number" } },
      // ACTIONS
      reply:            { params: { email_id: "string", body: "string", html: "string?", cc: "string|string[]?", attachments: "Attachment[]?" }, returns: { sent: "boolean", email_id: "string" } },
      reply_all:        { params: { email_id: "string", body: "string", html: "string?" }, returns: { sent: "boolean", email_id: "string" } },
      forward:          { params: { email_id: "string", to: "string|string[]", note: "string?" }, returns: { sent: "boolean", email_id: "string" } },
      mark_read:        { params: { email_id: "string" }, returns: { ok: "boolean" } },
      mark_unread:      { params: { email_id: "string" }, returns: { ok: "boolean" } },
      archive_email:    { params: { email_id: "string" }, returns: { ok: "boolean" } },
      delete_email:     { params: { email_id: "string" }, returns: { deleted: "boolean" } },
      receive_email:    { params: { to: "string", from: "string", subject: "string", body: "string", html: "string?", attachments: "Attachment[]?" }, returns: { received: "boolean", email_id: "string" } },
    },
  })
}
