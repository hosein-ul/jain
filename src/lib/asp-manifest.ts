// Per-service subsets of the ASP manifest, used by both the top-level
// /api/asp route and the drill-down /api/asp/{service} routes.
// Kept as one source-of-truth so what the marketplace registers matches what the
// service manifest advertises.

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "zerolayer.online"

export interface ServiceGuide {
  service: "email" | "phone" | "domain"
  title: string
  summary: string
  provisioningEndpoint: string
  provisioningPrice: string
  identityModel: string
  quickStart: string[]
  faq: { q: string; a: string }[]
}

export const EMAIL_GUIDE: ServiceGuide = {
  service: "email",
  title: "Email — real @-address mailboxes for AI agents",
  summary: `Every agent gets its own @${EMAIL_DOMAIN} address. Send, receive (via webhook or polling), thread, template, search. Inbound mail is mapped to the owning tenant by exact address match — mailboxes never cross.`,
  provisioningEndpoint: `${APP_URL}/api/asp/mailbox/create`,
  provisioningPrice: "$0.25",
  identityModel: "Pay once at mailbox/create → receive accessToken (at_...) → send it as Authorization: Bearer on every subsequent call. No further payment needed for free endpoints.",
  quickStart: [
    `1) POST ${APP_URL}/api/asp/mailbox/create with {"name":"trading-bot"} — pay $0.25 USDT0 via x402`,
    `2) Save {mailbox.agentId, accessToken} from the response`,
    `3) POST ${APP_URL}/api/asp/email/send with {"agentId":"...","to":"user@example.com","subject":"Hi","body":"..."} — Authorization: Bearer <accessToken>, $0.02 per call`,
    `4) POST ${APP_URL}/api/asp/inbox/get with {"agentId":"..."} — free, requires accessToken`,
    `5) (Optional) POST ${APP_URL}/api/asp/mailbox/update with {"agentId":"...","webhookUrl":"https://you.com/hook"} — receive inbound emails as HMAC-signed webhooks`,
  ],
  faq: [
    { q: "Do I need a separate agentId per user?", a: "Yes — one Agent row = one mailbox = one tenant. Cross-tenant reads are blocked at the query layer." },
    { q: "How do I receive inbound email?", a: "Either poll inbox/get, or configure webhookUrl on the mailbox and receive push notifications signed with X-AgentMail-Signature: sha256=<hmac>." },
    { q: "What if my accessToken is lost?", a: "Create a new mailbox — costs $0.25. Session tokens are the identity anchor; treat them as long-lived secrets." },
  ],
}

export const PHONE_GUIDE: ServiceGuide = {
  service: "phone",
  title: "Phone — real phone numbers for AI agents",
  summary: "Buy real phone numbers, place outbound calls, receive inbound calls via webhook, retrieve STT transcripts. Tenant isolation is enforced at every layer — every Call and PhoneNumber row carries userId.",
  provisioningEndpoint: `${APP_URL}/api/asp/phone/buy-number`,
  provisioningPrice: "$1.00",
  identityModel: "Pay once at phone/buy-number → receive accessToken. Reuse it on all subsequent calls (free and paid).",
  quickStart: [
    `1) POST ${APP_URL}/api/asp/phone/buy-number with {"country":"US"} — pay $1.00 USDT0. Response returns {phoneNumberId, e164, accessToken}`,
    `2) Save {phoneNumberId, accessToken}`,
    `3) POST ${APP_URL}/api/asp/phone/start-call with {"phoneNumberId":"...","to":"+14155551234"} — Authorization: Bearer <accessToken>, $0.05 per call. Returns {callId}`,
    `4) POST ${APP_URL}/api/asp/phone/calls/get with {"callId":"..."} — free, poll for status changes`,
    `5) POST ${APP_URL}/api/asp/phone/calls/transcript with {"callId":"..."} — free, once the provider has posted STT`,
    `6) POST ${APP_URL}/api/asp/phone/end-call with {"callId":"..."} — $0.005 to hang up`,
  ],
  faq: [
    { q: "How is inbound routed?", a: "The provider posts to POST /api/webhooks/phone. We resolve the destination E.164 to the owning tenant, insert a Call row, then dispatch to your webhookUrl if you set one." },
    { q: "Can I customize the call script?", a: "Yes — start-call takes an optional twiml payload (Twilio adapter) or a webhookUrl the provider will fetch for TwiML." },
    { q: "Which providers are supported?", a: `MockPhoneProvider (default, dev + tests) and TwilioPhoneProvider (activate with PHONE_PROVIDER=twilio + TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN). The interface is provider-agnostic; adding Vonage / Bandwidth is a new adapter file, no changes to service code.` },
  ],
}

export const DOMAIN_GUIDE: ServiceGuide = {
  service: "domain",
  title: "Domain — register domains and manage DNS",
  summary: "Search availability, register domains with the configured registrar, renew, and CRUD DNS records. Every Domain and DnsRecord row is tenant-scoped by userId. Registrar reads are canonical; local rows are indexed mirrors.",
  provisioningEndpoint: `${APP_URL}/api/asp/domain/register`,
  provisioningPrice: "$10.00",
  identityModel: "Pay once at domain/register → receive accessToken. Reuse for subsequent DNS ops.",
  quickStart: [
    `1) POST ${APP_URL}/api/asp/domain/search with {"query":"acmecorp"} — free, checks availability across common TLDs`,
    `2) POST ${APP_URL}/api/asp/domain/register with {"domain":"acmecorp.com","years":1,"contact":{...ICANN fields}} — pay $10.00. Returns {domainId, accessToken}`,
    `3) POST ${APP_URL}/api/asp/domain/dns/update with {"domainId":"...","record":{"type":"A","name":"@","value":"1.2.3.4"}} — $0.01 per record`,
    `4) POST ${APP_URL}/api/asp/domain/dns/list with {"domainId":"..."} — free, live registrar state`,
    `5) POST ${APP_URL}/api/asp/domain/renew with {"domainId":"...","years":1} — $10.00`,
  ],
  faq: [
    { q: "Which registrar do you use?", a: "MVP ships with MockDomainProvider (deterministic, no external calls). Interface is ready to swap in Namecheap / Porkbun / Cloudflare Registrar with no changes to the service layer." },
    { q: "Are ICANN contact fields required?", a: "Yes — firstName, lastName, email, phone, address1, city, postalCode, country. Missing any → 400." },
    { q: "How are DNS records validated?", a: "The registrar is the source of truth. We call the provider first, then reconcile the local mirror row for indexing and tenant scoping." },
  ],
}

export const GUIDES: Record<ServiceGuide["service"], ServiceGuide> = {
  email: EMAIL_GUIDE,
  phone: PHONE_GUIDE,
  domain: DOMAIN_GUIDE,
}

export function humanIdentityDocs() {
  return {
    model: "Session-token after first paid call. Any paid provisioning endpoint (mailbox/create, phone/buy-number, domain/register) verifies your x402 payer wallet and returns an 'accessToken' (at_...) which authenticates ALL subsequent calls (both free and paid) via Authorization: Bearer.",
    paid: "Identified by the payer wallet extracted from the verified x402 PAYMENT-SIGNATURE. Falls back to Authorization: Bearer at_... session token if wallet already known.",
    free: "Identified by Authorization: Bearer at_... session token issued from any prior paid call. Free ≠ public — tenant-scoped reads still require auth and still filter by tenant.",
  }
}
