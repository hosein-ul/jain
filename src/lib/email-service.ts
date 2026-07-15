import { supabase } from "./supabase"
import { sendEmail } from "./sendgrid"
import { v4 as uuidv4 } from "uuid"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "agentmail.dev"

export function generateEmailAddress(agentName: string): string {
  const sanitized = agentName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
  return `${sanitized}@${EMAIL_DOMAIN}`
}

export async function createAgent(userId: string, name: string, webhookUrl?: string) {
  const emailAddress = generateEmailAddress(name)

  const { data: existing } = await supabase
    .from("Agent")
    .select("id")
    .eq("emailAddress", emailAddress)
    .maybeSingle()

  const finalName = existing ? `${name}-${uuidv4().slice(0, 6)}` : name
  const finalEmail = existing ? generateEmailAddress(finalName) : emailAddress

  const { data: agent } = await supabase
    .from("Agent")
    .insert({ name: finalName, emailAddress: finalEmail, userId, webhookUrl: webhookUrl ?? null })
    .select()
    .single()

  return agent
}

export async function sendAgentEmail(
  agentId: string,
  to: string,
  subject: string,
  body: string,
  html?: string
) {
  const { data: agent } = await supabase.from("Agent").select("*").eq("id", agentId).single()
  if (!agent) throw new Error("Agent not found")
  if (!agent.isActive) throw new Error("Agent is deactivated")

  const result = await sendEmail({ from: agent.emailAddress, to, subject, body, html })

  const { data: email } = await supabase
    .from("Email")
    .insert({
      agentId,
      from: agent.emailAddress,
      to,
      subject,
      body,
      html: html ?? null,
      direction: "outbound",
      threadId: uuidv4(),
      status: "sent",
    })
    .select()
    .single()

  return { email, deliveryResult: result }
}

export async function receiveEmail(
  toAddress: string,
  from: string,
  subject: string,
  body: string,
  html?: string
) {
  const { data: agent } = await supabase
    .from("Agent")
    .select("*")
    .eq("emailAddress", toAddress)
    .maybeSingle()

  if (!agent) throw new Error(`No agent found for address: ${toAddress}`)

  const { data: existingThread } = await supabase
    .from("Email")
    .select("threadId")
    .eq("agentId", agent.id)
    .or(`and(from.eq.${from},to.eq.${toAddress}),and(from.eq.${toAddress},to.eq.${from})`)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: email } = await supabase
    .from("Email")
    .insert({
      agentId: agent.id,
      from,
      to: toAddress,
      subject,
      body,
      html: html ?? null,
      direction: "inbound",
      threadId: existingThread?.threadId ?? uuidv4(),
    })
    .select()
    .single()

  if (agent.webhookUrl && email) {
    fetch(agent.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "email.received", data: email }),
    }).catch((err) => console.error("Webhook delivery failed:", err))
  }

  return email
}

export async function getInbox(agentId: string, limit = 50, offset = 0) {
  const { data } = await supabase
    .from("Email")
    .select("*")
    .eq("agentId", agentId)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1)

  return data ?? []
}

export async function getEmailStats(userId: string) {
  const { data: agents } = await supabase
    .from("Agent")
    .select("id")
    .eq("userId", userId)

  const agentIds = (agents ?? []).map((a) => a.id)

  if (agentIds.length === 0) {
    return { totalSent: 0, totalReceived: 0, totalAgents: 0, unreadCount: 0 }
  }

  const [sentRes, receivedRes, agentCountRes, unreadRes] = await Promise.all([
    supabase.from("Email").select("*", { count: "exact", head: true }).in("agentId", agentIds).eq("direction", "outbound"),
    supabase.from("Email").select("*", { count: "exact", head: true }).in("agentId", agentIds).eq("direction", "inbound"),
    supabase.from("Agent").select("*", { count: "exact", head: true }).eq("userId", userId),
    supabase.from("Email").select("*", { count: "exact", head: true }).in("agentId", agentIds).eq("direction", "inbound").eq("isRead", false),
  ])

  return {
    totalSent: sentRes.count ?? 0,
    totalReceived: receivedRes.count ?? 0,
    totalAgents: agentCountRes.count ?? 0,
    unreadCount: unreadRes.count ?? 0,
  }
}
