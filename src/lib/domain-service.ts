import { supabase } from "./supabase"
import { getDomainProvider, type Contact, type DnsRecordType } from "./providers/domain"

const D = () => getDomainProvider()

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
}

export async function searchDomains(opts: { query: string; tlds?: string[] }) {
  return D().search(opts)
}

export async function registerDomain(
  userId: string,
  opts: { domain: string; years: number; contact: Contact; nameservers?: string[]; autoRenew?: boolean }
) {
  const provider = D()
  const name = normalizeDomain(opts.domain)

  const { data: existing } = await supabase
    .from("Domain")
    .select("id, userId")
    .eq("name", name)
    .maybeSingle()
  if (existing) throw new Error(`Domain ${name} is already registered in this system`)

  const result = await provider.register({
    domain: name,
    years: opts.years,
    contact: opts.contact,
    nameservers: opts.nameservers,
  })

  const { data, error } = await supabase
    .from("Domain")
    .insert({
      userId,
      name,
      provider: provider.name,
      providerDomainId: result.providerDomainId,
      status: result.status,
      registeredAt: result.registeredAt,
      expiresAt: result.expiresAt,
      autoRenew: opts.autoRenew ?? false,
      nameservers: JSON.stringify(result.nameservers),
    })
    .select()
    .single()
  if (error) throw new Error(`[Supabase] registerDomain: ${error.message}`)
  return data
}

async function getOwnedDomain(userId: string, key: { id?: string; name?: string }) {
  const q = supabase.from("Domain").select("*").eq("userId", userId)
  if (key.id) q.eq("id", key.id)
  else if (key.name) q.eq("name", normalizeDomain(key.name))
  const { data } = await q.maybeSingle()
  return data
}

export async function renewDomain(
  userId: string,
  opts: { domainId?: string; name?: string; years: number }
) {
  const domain = await getOwnedDomain(userId, { id: opts.domainId, name: opts.name })
  if (!domain) return null

  const result = await D().renew({
    domain: domain.name,
    providerDomainId: domain.providerDomainId ?? undefined,
    years: opts.years,
  })

  const { data } = await supabase
    .from("Domain")
    .update({ expiresAt: result.expiresAt })
    .eq("id", domain.id)
    .eq("userId", userId)
    .select()
    .single()
  return data
}

export async function listDomains(userId: string) {
  const { data, error } = await supabase
    .from("Domain")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
  if (error) throw new Error(`[Supabase] listDomains: ${error.message}`)
  return data ?? []
}

export async function listDnsRecords(userId: string, opts: { domainId?: string; name?: string }) {
  const domain = await getOwnedDomain(userId, { id: opts.domainId, name: opts.name })
  if (!domain) return null

  // Read canonical state from provider, then reconcile local mirror. Provider
  // is the source of truth; local rows exist for indexing and tenant scoping.
  const remote = await D().listDnsRecords(domain.name)

  const { data: local } = await supabase
    .from("DnsRecord")
    .select("*")
    .eq("domainId", domain.id)
    .eq("userId", userId)

  return {
    domain: { id: domain.id, name: domain.name },
    records: remote.map(r => {
      const mirror = (local ?? []).find(l => l.providerRecordId === r.providerRecordId)
      return { id: mirror?.id ?? null, ...r }
    }),
  }
}

export async function upsertDnsRecord(
  userId: string,
  opts: {
    domainId?: string
    name?: string
    record: {
      recordId?: string
      type: DnsRecordType
      recordName: string
      value: string
      ttl?: number
      priority?: number
    }
  }
) {
  const domain = await getOwnedDomain(userId, { id: opts.domainId, name: opts.name })
  if (!domain) return null

  // Look up the existing mirror row (if updating) to get the provider record id.
  let existingProviderRecordId: string | undefined
  if (opts.record.recordId) {
    const { data } = await supabase
      .from("DnsRecord")
      .select("providerRecordId")
      .eq("id", opts.record.recordId)
      .eq("userId", userId)
      .eq("domainId", domain.id)
      .maybeSingle()
    existingProviderRecordId = data?.providerRecordId ?? undefined
  }

  const remote = await D().upsertDnsRecord({
    domain: domain.name,
    record: {
      providerRecordId: existingProviderRecordId,
      type: opts.record.type,
      name: opts.record.recordName,
      value: opts.record.value,
      ttl: opts.record.ttl ?? 3600,
      priority: opts.record.priority,
    },
  })

  // Reconcile local mirror.
  const patch = {
    userId,
    domainId: domain.id,
    type: remote.type,
    name: remote.name,
    value: remote.value,
    ttl: remote.ttl,
    priority: remote.priority ?? null,
    providerRecordId: remote.providerRecordId,
  }

  if (opts.record.recordId) {
    const { data } = await supabase
      .from("DnsRecord")
      .update(patch)
      .eq("id", opts.record.recordId)
      .eq("userId", userId)
      .eq("domainId", domain.id)
      .select()
      .single()
    return { record: data ?? { ...patch }, remote }
  }

  // If a record with same providerRecordId already exists locally (e.g. mirror
  // repair), update in place; else insert.
  const { data: existingMirror } = await supabase
    .from("DnsRecord")
    .select("id")
    .eq("providerRecordId", remote.providerRecordId)
    .eq("userId", userId)
    .maybeSingle()

  if (existingMirror) {
    const { data } = await supabase
      .from("DnsRecord")
      .update(patch)
      .eq("id", existingMirror.id)
      .select()
      .single()
    return { record: data, remote }
  }

  const { data } = await supabase.from("DnsRecord").insert(patch).select().single()
  return { record: data, remote }
}

export async function deleteDnsRecord(userId: string, opts: { recordId: string }) {
  const { data: record } = await supabase
    .from("DnsRecord")
    .select("*, domain:Domain!inner(userId,name)")
    .eq("id", opts.recordId)
    .eq("userId", userId)
    .maybeSingle()
  if (!record) return null

  const domainName = record.domain?.name as string | undefined
  if (domainName && record.providerRecordId) {
    await D().deleteDnsRecord({ domain: domainName, providerRecordId: record.providerRecordId })
  }
  await supabase.from("DnsRecord").delete().eq("id", record.id).eq("userId", userId)
  return { deleted: true }
}

// ─── Inbound registrar webhook ────────────────────────────────────────────────

export async function ingestDomainEvent(event: {
  providerDomainId?: string
  name?: string
  status?: string
  expiresAt?: string
}) {
  const q = supabase.from("Domain").select("*")
  if (event.providerDomainId) q.eq("providerDomainId", event.providerDomainId)
  else if (event.name) q.eq("name", normalizeDomain(event.name))
  else return { ignored: true, reason: "no identifier" }

  const { data: domain } = await q.maybeSingle()
  if (!domain) return { ignored: true, reason: "unknown domain" }

  const patch: Record<string, unknown> = {}
  if (event.status) patch.status = event.status
  if (event.expiresAt) patch.expiresAt = event.expiresAt
  if (Object.keys(patch).length) await supabase.from("Domain").update(patch).eq("id", domain.id)
  return { ok: true, domainId: domain.id }
}
