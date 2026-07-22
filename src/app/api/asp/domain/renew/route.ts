import { NextRequest, NextResponse } from "next/server"
import { renewDomain } from "@/lib/domain-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/domain/renew",
  "$10.00",
  "Extend a domain registration by N years. Provide either domainId or name.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("domain")

    const body = await safeJson(req)
    const { domainId, name, years = 1 } = body as { domainId?: string; name?: string; years?: number }
    if (!domainId && !name) return NextResponse.json({ error: "Provide domainId or name", hint: { next: "POST /api/asp/domain/list to see your domains and their ids." } }, { status: 400 })

    const domain = await renewDomain(user.id, { domainId, name, years })
    if (!domain) return notFoundError("domain", "The domain isn't yours or isn't in this tenant.")
    return NextResponse.json({ domain: { ...domain, domainId: domain.id } })
  }
)
