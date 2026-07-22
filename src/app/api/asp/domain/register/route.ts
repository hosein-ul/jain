import { NextRequest, NextResponse } from "next/server"
import { issueAccessToken } from "@/lib/auth"
import { registerDomain } from "@/lib/domain-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, missingFieldError, unauthorizedError, provisioningResponse } from "@/lib/asp-hints"

const REQUIRED_CONTACT_FIELDS = ["firstName", "lastName", "email", "phone", "address1", "city", "postalCode", "country"] as const

export const { POST, GET } = createPaidRoute(
  "/api/asp/domain/register",
  "$10.00",
  "Register a domain with the configured registrar. Fixed-price service — pricing is separate from registrar wholesale (may vary by TLD/premium).",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("domain")

    const body = await safeJson(req)
    const { domain, years = 1, contact, nameservers, autoRenew } = body as {
      domain?: string
      years?: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contact?: any
      nameservers?: string[]
      autoRenew?: boolean
    }
    if (!domain) return missingFieldError("domain")
    if (!contact || typeof contact !== "object") return missingFieldError("contact", "Registrars require a contact object per ICANN.")
    for (const f of REQUIRED_CONTACT_FIELDS) {
      if (!contact[f]) return NextResponse.json({
        error: `contact.${f} is required`,
        hint: {
          why: "ICANN requires a complete registrant contact for every domain.",
          required: REQUIRED_CONTACT_FIELDS,
          example: {
            firstName: "Jane", lastName: "Doe", email: "jane@example.com",
            phone: "+14155551234", address1: "1 Market St", city: "San Francisco",
            state: "CA", postalCode: "94103", country: "US",
          },
        },
      }, { status: 400 })
    }

    try {
      const registered = await registerDomain(user.id, { domain, years, contact, nameservers, autoRenew })
      const accessToken = await issueAccessToken(user.id)
      return provisioningResponse({
        service: "domain",
        resource: { ...registered, domainId: registered.id },
        resourceIdField: "domainId",
        resourceIdValue: registered.id,
        humanIdentifier: registered.name,
        accessToken,
        recommendedNext: [
          "POST /api/asp/domain/dns/list with {domainId} — read live DNS state (free)",
          "POST /api/asp/domain/dns/update with {domainId, record: {...}} — write a DNS record ($0.01)",
          "POST /api/asp/domain/renew with {domainId, years} — extend registration ($10.00)",
        ],
      })
    } catch (err) {
      return NextResponse.json({
        error: err instanceof Error ? err.message : String(err),
        hint: {
          why: "The registrar rejected the registration — most commonly the domain is already registered by someone else, or a contact field failed ICANN validation.",
          next: "Verify availability first with POST /api/asp/domain/search {query: 'yourname'}. If it's available, double-check every contact field (country must be ISO alpha-2, email valid, phone with country code).",
        },
      }, { status: 400 })
    }
  }
)
