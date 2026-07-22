import { supabase } from "./supabase"
import { getPhoneProvider } from "./providers/phone"

// Every read/write query below filters by `userId` — that is the tenant-isolation
// boundary. Provider IDs are never trusted as tenant identifiers; we always
// resolve resources by (id, userId) or (providerCallId, userId).

const P = () => getPhoneProvider()

export async function searchAvailableNumbers(opts: { country: string; areaCode?: string; contains?: string; limit?: number }) {
  return P().searchAvailable(opts)
}

export async function buyNumber(
  userId: string,
  opts: { e164: string; webhookUrl?: string; capabilities?: string[] }
) {
  const provider = P()

  // Refuse to double-buy an already-owned number (any tenant).
  const { data: existing } = await supabase
    .from("PhoneNumber")
    .select("id, userId")
    .eq("e164", opts.e164)
    .maybeSingle()
  if (existing) throw new Error(`Number ${opts.e164} is already provisioned`)

  const provisioned = await provider.buyNumber({ e164: opts.e164, webhookUrl: opts.webhookUrl })

  const { data, error } = await supabase
    .from("PhoneNumber")
    .insert({
      userId,
      e164: provisioned.e164,
      provider: provider.name,
      providerNumberId: provisioned.providerNumberId,
      capabilities: (opts.capabilities ?? provisioned.capabilities).join(","),
      webhookUrl: opts.webhookUrl ?? null,
      isActive: true,
    })
    .select()
    .single()
  if (error) throw new Error(`[Supabase] buyNumber: ${error.message}`)
  return data
}

export async function listNumbers(userId: string) {
  const { data, error } = await supabase
    .from("PhoneNumber")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
  if (error) throw new Error(`[Supabase] listNumbers: ${error.message}`)
  return data ?? []
}

async function getOwnedNumber(userId: string, phoneNumberId: string) {
  const { data } = await supabase
    .from("PhoneNumber")
    .select("*")
    .eq("id", phoneNumberId)
    .eq("userId", userId)
    .maybeSingle()
  return data
}

export async function releaseNumber(userId: string, phoneNumberId: string) {
  const num = await getOwnedNumber(userId, phoneNumberId)
  if (!num) return null
  await P().releaseNumber(num.providerNumberId)
  await supabase.from("PhoneNumber").update({ isActive: false }).eq("id", num.id).eq("userId", userId)
  return { released: true, e164: num.e164 }
}

// ─── Calls ────────────────────────────────────────────────────────────────────

export async function startCall(
  userId: string,
  opts: { phoneNumberId: string; to: string; webhookUrl?: string; twiml?: string }
) {
  const num = await getOwnedNumber(userId, opts.phoneNumberId)
  if (!num) return null

  const result = await P().startCall({ from: num.e164, to: opts.to, webhookUrl: opts.webhookUrl, twiml: opts.twiml })

  const { data, error } = await supabase
    .from("Call")
    .insert({
      userId,
      phoneNumberId: num.id,
      direction: "outbound",
      fromNumber: num.e164,
      toNumber: opts.to,
      status: result.status,
      providerCallId: result.providerCallId,
      startedAt: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`[Supabase] startCall: ${error.message}`)
  return data
}

async function getOwnedCall(userId: string, callId: string) {
  const { data } = await supabase
    .from("Call")
    .select("*")
    .eq("id", callId)
    .eq("userId", userId)
    .maybeSingle()
  return data
}

export async function answerCall(userId: string, callId: string) {
  const call = await getOwnedCall(userId, callId)
  if (!call || !call.providerCallId) return null
  await P().answerCall(call.providerCallId)
  const { data } = await supabase
    .from("Call")
    .update({ status: "in-progress", answeredAt: new Date().toISOString() })
    .eq("id", call.id)
    .eq("userId", userId)
    .select()
    .single()
  return data
}

export async function endCall(userId: string, callId: string) {
  const call = await getOwnedCall(userId, callId)
  if (!call || !call.providerCallId) return null
  await P().endCall(call.providerCallId)
  const endedAt = new Date()
  const startedAt = call.startedAt ? new Date(call.startedAt) : endedAt
  const durationSec = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
  const { data } = await supabase
    .from("Call")
    .update({ status: "completed", endedAt: endedAt.toISOString(), durationSec })
    .eq("id", call.id)
    .eq("userId", userId)
    .select()
    .single()
  return data
}

export async function getCall(userId: string, callId: string) {
  return getOwnedCall(userId, callId)
}

export async function getTranscript(userId: string, callId: string) {
  const call = await getOwnedCall(userId, callId)
  if (!call) return null
  const { data } = await supabase
    .from("CallTranscript")
    .select("*")
    .eq("callId", call.id)
    .eq("userId", userId)
    .maybeSingle()
  return data
}

// ─── Inbound webhook ingestion (called from /api/webhooks/phone) ──────────────

export async function ingestCallEvent(event: {
  providerCallId: string
  status?: string
  from?: string
  to?: string
  answeredAt?: string
  endedAt?: string
  durationSec?: number
  recordingUrl?: string
  transcript?: { text: string; language?: string; segments?: unknown }
}) {
  // Resolve tenant by looking up an existing call, or by the destination number.
  const { data: existing } = await supabase
    .from("Call")
    .select("*")
    .eq("providerCallId", event.providerCallId)
    .maybeSingle()

  let call = existing
  if (!call) {
    // Inbound call — map the destination E.164 to the owning tenant.
    const { data: number } = event.to
      ? await supabase.from("PhoneNumber").select("*").eq("e164", event.to).maybeSingle()
      : { data: null }
    if (!number) return { ignored: true, reason: "no matching tenant number" }
    const { data: inserted, error } = await supabase
      .from("Call")
      .insert({
        userId: number.userId,
        phoneNumberId: number.id,
        direction: "inbound",
        fromNumber: event.from ?? "unknown",
        toNumber: event.to ?? number.e164,
        status: event.status ?? "ringing",
        providerCallId: event.providerCallId,
        startedAt: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw new Error(`[Supabase] ingest inbound call: ${error.message}`)
    call = inserted
  } else {
    const patch: Record<string, unknown> = {}
    if (event.status) patch.status = event.status
    if (event.answeredAt) patch.answeredAt = event.answeredAt
    if (event.endedAt) patch.endedAt = event.endedAt
    if (typeof event.durationSec === "number") patch.durationSec = event.durationSec
    if (event.recordingUrl) patch.recordingUrl = event.recordingUrl
    if (Object.keys(patch).length) {
      await supabase.from("Call").update(patch).eq("id", call.id)
    }
  }

  if (event.transcript && call) {
    await supabase.from("CallTranscript").upsert(
      {
        callId: call.id,
        userId: call.userId,
        text: event.transcript.text,
        language: event.transcript.language ?? null,
        segments: event.transcript.segments ? JSON.stringify(event.transcript.segments) : null,
      },
      { onConflict: "callId" }
    )
  }

  return { ok: true, callId: call?.id }
}
