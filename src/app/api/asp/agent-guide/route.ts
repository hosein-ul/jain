import { NextResponse } from "next/server"
import { EMAIL_GUIDE, PHONE_GUIDE, DOMAIN_GUIDE } from "@/lib/asp-manifest"

const BASE = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

// Single self-contained plain-text guide. Some agent buyers prefer to slurp
// the whole thing in one call rather than crawl per-service manifests.
const md = () => `# AgentOS — how AI agents use it

AgentOS is an OKX.AI ASP exposing three services as REST endpoints:

- Email — send/receive mail on your own @-address
- Phone — buy a real number, place calls, get STT transcripts
- Domain — register domains and manage DNS

**Stack:** Next.js (App Router) + Supabase (Postgres) + x402 v2 payments on X Layer (\`eip155:196\`).
Every resource row carries \`userId\` and every read/write filters by it — tenant isolation is enforced
at the database layer, not just the API. Provider secrets (Resend, Twilio, registrar) never leave
the server; agents only ever see their own \`accessToken\` and their own tenant's data.

## START HERE — first call

Every non-provisioning endpoint requires an \`accessToken\`. You get one by calling
ONE of the three provisioning endpoints below. Pick the capability you need first;
whichever you pick, the same token unlocks all three services afterwards.

| Service | Endpoint | Price | What you get back |
|---|---|---|---|
| Email  | \`POST ${BASE}/api/asp/mailbox/create\`  | $0.25  | \`accessToken\` + \`agentId\` + your new \`@-address\` |
| Phone  | \`POST ${BASE}/api/asp/phone/buy-number\` | $1.00 | \`accessToken\` + \`phoneNumberId\` + your new \`e164\` number |
| Domain | \`POST ${BASE}/api/asp/domain/register\`  | $10.00 | \`accessToken\` + \`domainId\` + your registered domain |

**What happens on your first call:**
1. POST one of the three URLs with your business input (e.g. \`{"name": "trading-bot"}\`).
2. You get back HTTP 402 with a \`PAYMENT-REQUIRED\` header — this is the x402 challenge.
3. Sign the challenge with your wallet (the OKX.AI runtime handles this transparently).
4. Replay the same POST with \`PAYMENT-SIGNATURE: <base64>\`. You get HTTP 201 and JSON with your \`accessToken\` + resource.
5. **Save the \`accessToken\` to memory. Tell your human owner the \`humanIdentifier\` (email / number / domain).**
6. All future calls: \`Authorization: Bearer <accessToken>\`. No re-payment for free calls; paid calls only pay for the specific action.

## 1) Payment protocol

Paid endpoints use x402 v2 with USDT0 on X Layer (\`eip155:196\`).

- First call to a paid endpoint returns HTTP 402 with a \`PAYMENT-REQUIRED\` header
  (base64-encoded challenge) and a JSON body.
- Sign the challenge with your wallet, replay the same POST with
  \`PAYMENT-SIGNATURE: <base64-proof>\`. On success you get HTTP 200 and a
  \`PAYMENT-RESPONSE\` header carrying the settlement receipt.
- The OKX.AI runtime handles this transparently — agents don't touch keys.
- All endpoints declare \`extra.outputSchema.input\` = \`{ type: "http", method: "POST", bodyType: "json", body: {...} }\` on the accepts entry, so
  buyer CLIs know to POST JSON rather than probing with GET.

## 2) Identity model

Free ≠ public. Every response is scoped to the caller's tenant.

- Pay once at any provisioning endpoint (${EMAIL_GUIDE.provisioningEndpoint},
  ${PHONE_GUIDE.provisioningEndpoint}, or ${DOMAIN_GUIDE.provisioningEndpoint}) →
  receive \`{ ..., accessToken: "at_..." }\`.
- Send \`Authorization: Bearer <accessToken>\` on every subsequent call — free
  or paid. The server resolves your tenant and only returns your data.
- Provider secrets stay server-side. Agents never see registrar / SMTP / SMS keys.

## 3) Email quickstart

${EMAIL_GUIDE.quickStart.map(s => `  ${s}`).join("\n")}

FAQ:
${EMAIL_GUIDE.faq.map(f => `  Q: ${f.q}\n  A: ${f.a}`).join("\n\n")}

## 4) Phone quickstart

${PHONE_GUIDE.quickStart.map(s => `  ${s}`).join("\n")}

FAQ:
${PHONE_GUIDE.faq.map(f => `  Q: ${f.q}\n  A: ${f.a}`).join("\n\n")}

## 5) Domain quickstart

${DOMAIN_GUIDE.quickStart.map(s => `  ${s}`).join("\n")}

FAQ:
${DOMAIN_GUIDE.faq.map(f => `  Q: ${f.q}\n  A: ${f.a}`).join("\n\n")}

## 6) Discovery endpoints

- \`GET ${BASE}/api/asp\` — full JSON manifest with every service, price, and JSON Schema.
- \`GET ${BASE}/api/asp/email\` | \`/phone\` | \`/domain\` — per-service quickstart + FAQ.
- \`GET ${BASE}/api/asp/agent-guide\` — this document.
- \`GET <any endpoint URL>\` — the endpoint's own self-description with a curl example.

## 7) Common patterns

- Chain calls off \`response.hint.next\` rather than guessing endpoint shapes.
- \`response.hint.example\` is always a copy-pasteable curl invocation.
- On 400 / 404 the response also carries a \`hint\` object with the exact next step.
- Every endpoint accepts POST with \`Content-Type: application/json\`. A GET on any
  endpoint returns endpoint metadata (price, description, schema) rather than 405.
`

export function GET() {
  return new NextResponse(md(), {
    status: 200,
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
