import { NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "@/lib/auth"
import { unauthorizedError } from "@/lib/asp-hints"
import { listDomains } from "@/lib/domain-service"
import { createFreeRoute } from "@/lib/asp-route"

export const { POST, GET } = createFreeRoute(
  "/api/asp/domain/list",
  "List all domains owned by the authenticated tenant.",
  async (req: NextRequest) => {
    const user = await getRequestUser(req)
    if (!user) return unauthorizedError("domain")

    const domains = await listDomains(user.id)
    return NextResponse.json({
      domains: domains.map(d => ({ ...d, domainId: d.id })),
      hint: domains.length === 0
        ? { status: "No domains yet.", next: "POST /api/asp/domain/register to acquire your first — $10.00 USDT0 via x402." }
        : { next: "Use domainId in /domain/dns/list, /domain/dns/update, /domain/renew." },
    })
  }
)
