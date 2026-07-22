import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getDomainProvider } from "@/lib/providers/domain"
import { ingestDomainEvent } from "@/lib/domain-service"

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const provider = getDomainProvider()

  const sig = req.headers.get("x-signature") ?? req.headers.get("x-webhook-signature")
  if (!provider.verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: Record<string, unknown> = {}
  try { payload = raw ? JSON.parse(raw) : {} } catch { payload = {} }

  const kind = String(payload.event ?? "domain.update")
  const externalId = `${provider.name}:${payload.id ?? payload.name ?? "unknown"}:${kind}:${payload.timestamp ?? Date.now()}`

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

  const result = await ingestDomainEvent({
    providerDomainId: typeof payload.providerDomainId === "string" ? payload.providerDomainId : (typeof payload.id === "string" ? payload.id : undefined),
    name: typeof payload.name === "string" ? payload.name : undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : undefined,
  })

  await supabase
    .from("WebhookEvent")
    .update({ processedAt: new Date().toISOString() })
    .eq("externalId", externalId)

  return NextResponse.json({ ok: true, ...result })
}
