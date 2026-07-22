import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getPhoneProvider } from "@/lib/providers/phone"
import { ingestCallEvent } from "@/lib/phone-service"

// Provider-agnostic inbound phone webhook.
// Verifies the signature with the active provider, deduplicates via the
// WebhookEvent table, and hands the normalized event to the phone service.
export async function POST(req: NextRequest) {
  const raw = await req.text()
  const provider = getPhoneProvider()

  const sigHeader =
    req.headers.get("x-twilio-signature") ??
    req.headers.get("x-signature") ??
    req.headers.get("x-webhook-signature")

  if (!provider.verifyWebhookSignature(raw, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Providers post either form-encoded or JSON. Handle both.
  let payload: Record<string, unknown> = {}
  const ct = (req.headers.get("content-type") ?? "").toLowerCase()
  if (ct.includes("application/json")) {
    try { payload = raw ? JSON.parse(raw) : {} } catch { payload = {} }
  } else {
    const params = new URLSearchParams(raw)
    payload = Object.fromEntries(params.entries())
  }

  // Normalize to internal event shape. Twilio names shown; mock/others map here too.
  const providerCallId = String(
    payload.providerCallId ?? payload.CallSid ?? payload.call_id ?? ""
  )
  if (!providerCallId) {
    return NextResponse.json({ error: "Missing providerCallId" }, { status: 400 })
  }
  const kind = String(payload.event ?? payload.CallStatus ?? "call.update")
  const externalId = `${provider.name}:${providerCallId}:${kind}:${payload.SequenceNumber ?? Date.now()}`

  // Idempotency guard.
  const { data: seen } = await supabase
    .from("WebhookEvent")
    .select("id")
    .eq("externalId", externalId)
    .maybeSingle()
  if (seen) return NextResponse.json({ ok: true, deduped: true })

  await supabase.from("WebhookEvent").insert({
    provider: provider.name,
    kind,
    externalId,
    payload: raw.slice(0, 100_000),
  })

  const twilioStatusMap: Record<string, string> = {
    queued: "queued", ringing: "ringing", "in-progress": "in-progress",
    completed: "completed", busy: "busy", "no-answer": "no-answer", failed: "failed", canceled: "failed",
  }

  const status =
    (typeof payload.status === "string" && payload.status) ||
    twilioStatusMap[String(payload.CallStatus ?? "").toLowerCase()] ||
    undefined

  const result = await ingestCallEvent({
    providerCallId,
    status,
    from: String(payload.from ?? payload.From ?? "") || undefined,
    to: String(payload.to ?? payload.To ?? "") || undefined,
    answeredAt: typeof payload.answeredAt === "string" ? payload.answeredAt : undefined,
    endedAt: typeof payload.endedAt === "string" ? payload.endedAt : undefined,
    durationSec: payload.CallDuration ? Number(payload.CallDuration) : (typeof payload.durationSec === "number" ? payload.durationSec : undefined),
    recordingUrl: typeof payload.RecordingUrl === "string" ? payload.RecordingUrl : (typeof payload.recordingUrl === "string" ? payload.recordingUrl : undefined),
    transcript: payload.transcript && typeof payload.transcript === "object"
      ? payload.transcript as { text: string; language?: string; segments?: unknown }
      : undefined,
  })

  await supabase
    .from("WebhookEvent")
    .update({ processedAt: new Date().toISOString() })
    .eq("externalId", externalId)

  return NextResponse.json({ ok: true, ...result })
}
