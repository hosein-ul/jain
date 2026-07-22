import { NextRequest, NextResponse } from "next/server"
import { searchDomains } from "@/lib/domain-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson, missingFieldError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute(
  "/api/asp/domain/search",
  "Check availability of a domain across common TLDs. Free — no tenant data touched.",
  async (req: NextRequest) => {
    const body = await safeJson(req)
    const { query, tlds } = body as { query?: string; tlds?: string[] }
    if (!query) return missingFieldError("query", "Pass just the label — e.g. 'acmecorp' — and optionally a tlds list.")

    const results = await searchDomains({ query, tlds })
    return NextResponse.json({
      results,
      hint: {
        next: "POST /api/asp/domain/register with {domain, years, contact} on any available result — costs $10.00 USDT0 via x402.",
      },
    })
  }
)
