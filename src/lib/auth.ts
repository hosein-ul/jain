import { supabase } from "./supabase"
import { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"

export function generateApiKey(): string {
  return `am_${uuidv4().replace(/-/g, "")}`
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
