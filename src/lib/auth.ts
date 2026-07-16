import { supabase } from "./supabase"
import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"

export function generateApiKey(): string {
  return `am_${uuidv4().replace(/-/g, "")}`
}

export function generateAccessToken(): string {
  return `at_${uuidv4().replace(/-/g, "")}${uuidv4().replace(/-/g, "")}`
}

export async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const key = authHeader.slice(7)
  const { data: apiKey } = await supabase
    .from("ApiKey")
    .select("*, user:User(*)")
    .eq("key", key)
    .eq("isActive", true)
    .maybeSingle()

  if (!apiKey) return null

  await supabase
    .from("ApiKey")
    .update({ lastUsed: new Date().toISOString() })
    .eq("id", apiKey.id)

  return apiKey.user
}

export async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("Agent")
    .select("id")
    .eq("id", agentId)
    .eq("userId", userId)
    .maybeSingle()
  return !!data
}

export async function verifyEmailOwnership(emailId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("Email")
    .select("id, agentId, agent:Agent!inner(userId)")
    .eq("id", emailId)
    .eq("agent.userId", userId)
    .maybeSingle()
  return !!data
}

export async function getOrCreateDemoUser() {
  const email = "demo@agentmail.dev"

  const { data: existing } = await supabase
    .from("User")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from("User")
    .insert({ email, name: "Demo User" })
    .select()
    .single()

  return created
}

export async function getOrCreateUserByWallet(walletAddress: string | null | undefined) {
  if (!walletAddress) return null

  const addr = String(walletAddress).trim().toLowerCase()
  if (!addr.startsWith("0x") || addr.length !== 42) return null

  const { data: existing } = await supabase
    .from("User")
    .select("*")
    .eq("walletAddress", addr)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from("User")
    .insert({
      email: `wallet-${addr.slice(2, 10)}@agentmail.dev`,
      name: `Wallet ${addr.slice(0, 8)}…${addr.slice(-4)}`,
      walletAddress: addr,
    })
    .select()
    .single()

  return created
}

export async function issueAccessToken(userId: string): Promise<string> {
  const token = generateAccessToken()
  await supabase.from("AccessToken").insert({ token, userId })
  return token
}

export async function getUserFromAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7).trim()
  if (!token.startsWith("at_")) return null

  const { data: row } = await supabase
    .from("AccessToken")
    .select("*, user:User(*)")
    .eq("token", token)
    .maybeSingle()

  if (!row) return null

  supabase
    .from("AccessToken")
    .update({ lastUsedAt: new Date().toISOString() })
    .eq("token", token)
    .then(() => {})

  return row.user
}

export async function getOrCreateUserByOkxId(okxAgentId: string | null | undefined) {
  if (!okxAgentId) return null

  const id = String(okxAgentId).trim()
  if (!id) return null

  const { data: existing } = await supabase
    .from("User")
    .select("*")
    .eq("okxAgentId", id)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from("User")
    .insert({ email: `okx-agent-${id}@agentmail.dev`, name: `OKX Agent #${id}`, okxAgentId: id })
    .select()
    .single()

  return created
}

// Resolves the calling agent's identity in priority order:
//   1. Authorization: Bearer at_... (session token issued by a prior paid call)
//   2. X-Wallet-Address: 0x... (dev-mode fallback when x402 is off — INSECURE)
//   3. X-OKX-Agent-ID: <id> (dev-mode fallback — INSECURE)
// In production with PAYMENT_REQUIRED=true, paid endpoints override this via getUserFromPayment().
export async function getRequestUser(req: NextRequest) {
  const bearer = await getUserFromAccessToken(req)
  if (bearer) return bearer

  const wallet = req.headers.get("x-wallet-address")
  if (wallet) return getOrCreateUserByWallet(wallet)

  const okxId = req.headers.get("x-okx-agent-id")
  if (okxId) return getOrCreateUserByOkxId(okxId)

  return null
}

export async function getUserFromOkxHeader(req: NextRequest) {
  return getRequestUser(req)
}
