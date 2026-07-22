import { NextRequest, NextResponse } from "next/server"
import { upsertDnsRecord } from "@/lib/domain-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, notFoundError, unauthorizedError } from "@/lib/asp-hints"
import type { DnsRecordType } from "@/lib/providers/domain"

const ALLOWED_TYPES: DnsRecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"]

export const { POST, GET } = createPaidRoute(
  "/api/asp/domain/dns/update",
  "$0.01",
  "Create or update a single DNS record on a domain you own. If record.recordId is provided the existing record is replaced; otherwise a new record is inserted.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("domain")

    const body = await safeJson(req)
    const { domainId, name, record } = body as {
      domainId?: string
      name?: string
      record?: {
        recordId?: string
        type?: string
        name?: string
        value?: string
        ttl?: number
        priority?: number
      }
    }
    if (!domainId && !name) return NextResponse.json({
      error: "Provide domainId or name",
      hint: { why: "We need to know which of your domains to write to.", next: "POST /api/asp/domain/list to see your domains and their ids." },
    }, { status: 400 })
    if (!record) return NextResponse.json({
      error: "record is required",
      hint: {
        why: "The DNS record you want to write.",
        example: `{"record":{"type":"A","name":"@","value":"1.2.3.4","ttl":3600}}`,
        types: ALLOWED_TYPES,
      },
    }, { status: 400 })
    if (!record.type || !ALLOWED_TYPES.includes(record.type as DnsRecordType)) {
      return NextResponse.json({
        error: `record.type must be one of ${ALLOWED_TYPES.join(", ")}`,
        hint: { why: "DNS record type — case-sensitive. A / AAAA for IPs, CNAME for aliases, MX for mail, TXT for verification.", provided: record.type },
      }, { status: 400 })
    }
    if (!record.name) return NextResponse.json({
      error: "record.name is required",
      hint: { why: "The subdomain/host — '@' for the apex, 'www' for www.<domain>, '*' for wildcard." },
    }, { status: 400 })
    if (!record.value) return NextResponse.json({
      error: "record.value is required",
      hint: { why: "The record's value. Format depends on type — IP for A/AAAA, hostname for CNAME/MX, string for TXT." },
    }, { status: 400 })

    const result = await upsertDnsRecord(user.id, {
      domainId,
      name,
      record: {
        recordId: record.recordId,
        type: record.type as DnsRecordType,
        recordName: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
      },
    })
    if (!result) return notFoundError("domain", "You don't own that domain.")
    return NextResponse.json(result)
  }
)
