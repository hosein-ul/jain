import { NextRequest, NextResponse } from "next/server"
import { getOrCreateUserByWallet, getRequestUser } from "./auth"

// Resolve the calling agent's identity for a PAID endpoint.
// Priority: (1) wallet from verified x402 payment proof, (2) session token / dev headers.
export async function resolvePaidUser(req: NextRequest, payer: string | undefined) {
  if (payer) {
    const user = await getOrCreateUserByWallet(payer)
    if (user) return user
  }
  return getRequestUser(req)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson(req: NextRequest): Promise<any> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

export function missingFieldError(field: string, guidance?: string) {
  return NextResponse.json({
    error: `${field} is required`,
    hint: {
      why: `This endpoint operates on a specific resource identified by '${field}'.`,
      next: guidance ?? `See GET ${APP_URL}/api/asp for the full input schema of every service, or GET this endpoint's URL for its own schema and a curl example.`,
      manifest: `${APP_URL}/api/asp`,
      agentGuide: `${APP_URL}/api/asp/agent-guide`,
    },
  }, { status: 400 })
}

export function notFoundError(resource: string, guidance: string) {
  return NextResponse.json({
    error: `${resource} not found`,
    hint: {
      why: `No ${resource} with this id exists under your tenant. This may mean the id belongs to a different tenant, or it was never created.`,
      next: guidance,
      manifest: `${APP_URL}/api/asp`,
    },
  }, { status: 404 })
}

// Unified 401 — onboarding-first. Every endpoint knows which service it belongs
// to and passes it here, so a first-time agent that lands on (say) email/send
// isn't told to "pay this endpoint" — they're told to first go create a mailbox
// at the provisioning URL that unlocks the whole email surface.
//
// Pass "email" | "phone" | "domain" for endpoints tied to one service.
// Pass "any" for endpoints that work under any tenant (e.g. cross-service ops).
export type ServiceScope = "email" | "phone" | "domain" | "any"

const PROVISIONING = {
  email: {
    endpoint: `${APP_URL}/api/asp/mailbox/create`,
    price: "$0.25",
    resource: "a mailbox (a real @-address you can send from and receive at)",
    example: `curl -X POST ${APP_URL}/api/asp/mailbox/create -H "Content-Type: application/json" -d '{"name":"trading-bot"}'`,
    yields: "an accessToken (at_...), an agentId, and your new emailAddress",
  },
  phone: {
    endpoint: `${APP_URL}/api/asp/phone/buy-number`,
    price: "$1.00",
    resource: "a real phone number you can call from and receive calls on",
    example: `curl -X POST ${APP_URL}/api/asp/phone/buy-number -H "Content-Type: application/json" -d '{"country":"US"}'`,
    yields: "an accessToken (at_...), a phoneNumberId, and your new e164 number",
  },
  domain: {
    endpoint: `${APP_URL}/api/asp/domain/register`,
    price: "$10.00",
    resource: "a registered domain you can manage DNS on",
    example: `curl -X POST ${APP_URL}/api/asp/domain/register -H "Content-Type: application/json" -d '{"domain":"acmecorp.com","years":1,"contact":{...}}'`,
    yields: "an accessToken (at_...), a domainId, and your registered domain",
  },
} as const

export function unauthorizedError(service: ServiceScope = "any") {
  const primary = service === "any" ? null : PROVISIONING[service]
  const alternatives = service === "any"
    ? [PROVISIONING.email, PROVISIONING.phone, PROVISIONING.domain]
    : Object.entries(PROVISIONING).filter(([k]) => k !== service).map(([, v]) => v)

  const startHere = primary
    ? {
        title: `START HERE if this is your first time — you need to create ${primary.resource} first.`,
        step1: `POST ${primary.endpoint} — pays ${primary.price} in USDT0 via x402. You will receive ${primary.yields}.`,
        step2: `Save the accessToken to your long-term memory. It's how you authenticate every subsequent AgentOS call — free or paid, across all three services.`,
        step3: `Retry THIS endpoint with the header: Authorization: Bearer <accessToken>. It will now work.`,
        example: primary.example,
      }
    : {
        title: "START HERE if this is your first time — you need a tenant identity before you can call anything.",
        step1: "Pick the capability you need first (email / phone / domain) and provision it below. Each provisioning call returns an accessToken.",
        step2: "Save the accessToken. It authenticates every subsequent AgentOS call — free or paid, across all three services.",
        step3: "Retry this endpoint with Authorization: Bearer <accessToken>.",
      }

  return NextResponse.json({
    error: "Unauthorized — this endpoint could not identify your tenant.",
    hint: {
      why: "AgentOS is tenant-scoped: every response is filtered to the caller's tenant. Even free endpoints refuse to leak data without auth, because 'free' does not mean 'public'.",

      startHere,

      ifYouAlreadyHaveAToken: {
        instruction: "Retry with Authorization: Bearer <your accessToken>.",
        example: `curl -X POST <this-endpoint> -H "Authorization: Bearer at_..." -H "Content-Type: application/json" -d '{...}'`,
      },

      ifYouWantToTryOtherCapabilities: alternatives.map(a => ({
        endpoint: a.endpoint,
        price: a.price,
        provides: a.resource,
      })),

      identityModel: "One accessToken unlocks all three services. Provisioning phone/buy-number and then calling email/send both work with the same token — as long as you own a mailbox in that tenant.",
      manifest: `${APP_URL}/api/asp`,
      agentGuide: `${APP_URL}/api/asp/agent-guide`,
    },
  }, { status: 401 })
}

// Response builder for the three provisioning endpoints (mailbox/create,
// phone/buy-number, domain/register). Enforces one consistent, agent-friendly
// structure that emphasizes: SAVE THIS + REPORT TO OWNER.
export interface ProvisioningPayload {
  service: "email" | "phone" | "domain"
  resource: Record<string, unknown>         // the provisioned resource (mailbox / number / domain)
  resourceIdField: string                    // e.g. "agentId" / "phoneNumberId" / "domainId"
  resourceIdValue: string
  humanIdentifier: string                    // the thing to tell the human — an email / e164 / domain name
  accessToken: string
  recommendedNext: string[]                  // 2–4 next-call suggestions
}

export function provisioningResponse(payload: ProvisioningPayload, status = 201) {
  const { service, resource, resourceIdField, resourceIdValue, humanIdentifier, accessToken, recommendedNext } = payload

  return NextResponse.json({
    // Machine-shaped result — same across all three services.
    [service]: resource,
    accessToken,
    [resourceIdField]: resourceIdValue,

    // ── CRITICAL — the agent must not ignore this ──────────────────────────
    critical: {
      title: "IMPORTANT — you must do BOTH of the following before continuing.",

      persist: {
        instruction: "Save the following to your long-term memory / persistent storage NOW.",
        why: "Losing the accessToken means paying again to provision a new resource. Losing the resource identifier means you cannot address, read, or manage this resource. Neither is recoverable.",
        toSave: {
          accessToken,
          [resourceIdField]: resourceIdValue,
          humanIdentifier,
          service,
        },
      },

      reportToOwner: {
        instruction: "Report the provisioned resource to your human owner / principal in your next reply.",
        why: "The human is the entity that will actually use this — they need to know their new email address / phone number / domain. They do NOT need the accessToken (that's your machine credential); they DO need the humanIdentifier.",
        suggestedReply: {
          email: `I've created a mailbox for you: ${humanIdentifier}. You can email this address and I'll receive and read the messages.`,
          phone: `I've provisioned a phone number for you: ${humanIdentifier}. This is now my line — calls to it reach me.`,
          domain: `I've registered the domain ${humanIdentifier} for you. It's active and I'll manage the DNS.`,
        }[service],
      },
    },

    // Standard hint block — same shape as every other endpoint.
    hint: {
      identityModel: "The accessToken above authenticates ALL subsequent AgentOS calls (email / phone / domain) as this tenant. Send it as: Authorization: Bearer <accessToken>.",
      next: recommendedNext,
      manifest: `${(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online")}/api/asp`,
      agentGuide: `${(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online")}/api/asp/agent-guide`,
    },
  }, { status })
}
