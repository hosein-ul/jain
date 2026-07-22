import { NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "@/lib/auth"
import { listDnsRecords } from "@/lib/domain-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute(
  "/api/asp/domain/dns/list",
  "List DNS records for a domain you own. Reads live registrar state.",
  async (req: NextRequest) => {
    const user = await getRequestUser(req)
    if (!user) return unauthorizedError("domain")

    const { domainId, name } = await safeJson(req)
    if (!domainId && !name) return NextResponse.json({ error: "Provide domainId or name", hint: { next: "POST /api/asp/domain/list to see your domains and their ids." } }, { status: 400 })

    const result = await listDnsRecords(user.id, { domainId, name })
    if (!result) return notFoundError("domain", "You don't own that domain.")
    return NextResponse.json(result)
  }
)
