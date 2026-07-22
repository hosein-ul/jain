# AgentOS

Real communication and identity infrastructure for AI agents. Give any agent its own email address, phone number, and domain — send email, place calls, register DNS, all through a single REST API.

Built as an **ASP (Agent Service Provider)** on OKX.AI.

The initial services are:

- **Email** — send/receive mail, threads, templates
- **Phone** — buy real numbers, place outbound calls, receive inbound calls, transcripts
- **Domain** — search availability, register domains, manage DNS

The Email service is the most mature and preserves the original AgentMail behavior. Phone and Domain are new MVP services built on the same architecture.

---

## What it is

AI agents need to communicate via email — to send alerts, receive confirmations, handle replies, and maintain ongoing conversations. AgentMail gives each agent a real, isolated email address backed by full SMTP delivery (Resend), real MX records, and RFC 5322-compliant threading.

Every agent gets their own exclusive mailbox. Emails never cross between agents.

```
trading-bot@yourdomain.com     → isolated inbox, send/receive
customer-agent@yourdomain.com  → completely separate mailbox
research-agent@yourdomain.com  → no shared state with others
```

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │            AgentMail                 │
                        │                                      │
  OKX.AI Agents ───────▶│  POST /api/asp/**  (x402 payment)   │
                        │           │                          │
  REST API clients ────▶│  /api/*   │                          │
                        │           ▼                          │
                        │  ┌─────────────────┐                │
                        │  │  email-service  │                │
                        │  │  (core logic)   │                │
                        │  └────────┬────────┘                │
                        │           │                          │
                        │    ┌──────┴──────┐                  │
                        │    │             │                   │
                        │    ▼             ▼                   │
                        │  Supabase    Resend                  │
                        │  (storage)  (SMTP delivery)          │
                        └─────────────────────────────────────┘
                                    ▲
                         Resend inbound webhook
                         POST /api/webhooks/inbound
                         (real incoming emails → agent inbox)
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Email delivery | Resend (SMTP + inbound webhooks) |
| Auth | API key (`am_...` bearer token) |
| OKX.AI payments | x402 protocol, USDT0 on X Layer |

---

## Database schema

```
User
 └─ id, email, name, createdAt

Agent
 └─ id, name, emailAddress (UNIQUE), userId, webhookUrl, isActive, createdAt
    Each agent owns exactly one address. Inbox queries always filter by agentId.

Email
 └─ id, agentId (FK→Agent), from, to, subject, body, html,
    direction ("inbound"|"outbound"), threadId, isRead, status, createdAt

ApiKey
 └─ id, key (UNIQUE, am_...), name, userId, isActive, lastUsed, createdAt

EmailTemplate
 └─ id, name, subject, body, userId, createdAt
```

---

## REST API

### Authentication

All requests require a bearer token:

```
Authorization: Bearer am_live_xxxxxxxxxxxx
```

Generate a key from the dashboard (`/dashboard/api-keys`) or via `POST /api/api-keys`.

---

### Agents

| Method | Path | Description |
|---|---|---|
| POST | `/api/agents` | Create a new agent mailbox |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get a single agent |
| DELETE | `/api/agents/:id` | Delete an agent |

**Create agent:**
```bash
curl -X POST https://YOUR_DOMAIN/api/agents \
  -H "Authorization: Bearer am_..." \
  -d '{ "name": "trading-bot", "webhookUrl": "https://you.com/hook" }'
```
```json
{
  "id": "agt_01j8...",
  "name": "trading-bot",
  "emailAddress": "trading-bot@yourdomain.com",
  "isActive": true
}
```

---

### Email

| Method | Path | Description |
|---|---|---|
| POST | `/api/emails/send` | Send email from an agent |
| GET | `/api/emails/inbox?agentId=...&limit=20` | List agent inbox |
| GET | `/api/emails/:id` | Get single email |

**Send email:**
```bash
curl -X POST https://YOUR_DOMAIN/api/emails/send \
  -H "Authorization: Bearer am_..." \
  -d '{
    "agentId": "agt_01j8...",
    "to": "user@example.com",
    "subject": "BTC Alert",
    "body": "Position crossed $100k."
  }'
```

---

### Other endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics` | Daily send/receive stats |
| POST/GET/DELETE | `/api/api-keys` | Manage bearer tokens |
| POST/GET/DELETE | `/api/templates` | Email templates |
| POST | `/api/webhooks/inbound` | Resend inbound webhook (internal) |

---

## OKX.AI ASP integration

AgentMail is registered as an **ASP (Agent Service Provider)** on the OKX.AI marketplace. Each action has its own dedicated endpoint — OKX.AI registers one price per endpoint URL.

### Service discovery

```bash
# Returns full manifest with all endpoints and pricing
curl https://YOUR_DOMAIN/api/asp
```

```json
{
  "name": "AgentMail",
  "version": "1.0.0",
  "description": "Real email infrastructure for AI agents — send, receive, and manage agent mailboxes on your domain",
  "authentication": "Bearer <api_key> in Authorization header",
  "paymentProtocol": "x402 v2 (USDT0 on X Layer / eip155:196)",
  "services": [...]
}
```

### Endpoints & pricing

Each endpoint accepts `POST` with a JSON body. Free endpoints return `200` directly. Paid endpoints require x402 payment — the OKX.AI agent pays automatically.

| Endpoint | Price | Description |
|---|---|---|
| `POST /api/asp/mailbox/list` | free | List all agent mailboxes |
| `POST /api/asp/inbox/get` | free | Fetch inbox with filters |
| `POST /api/asp/email/get` | free | Get single email + attachments |
| `POST /api/asp/thread/get` | free | Full conversation thread |
| `POST /api/asp/email/mark-read` | free | Mark as read |
| `POST /api/asp/email/mark-unread` | free | Mark as unread |
| `POST /api/asp/email/archive` | free | Archive email |
| `POST /api/asp/email/delete` | free | Delete email permanently |
| `POST /api/asp/email/attachments` | free | List/download attachments |
| `POST /api/asp/mailbox/create` | **$0.25** | Create new agent mailbox |
| `POST /api/asp/email/send` | **$0.02** | Send email |
| `POST /api/asp/template/send` | **$0.02** | Send via template |
| `POST /api/asp/email/reply` | **$0.01** | Reply to email |
| `POST /api/asp/email/reply-all` | **$0.01** | Reply all |
| `POST /api/asp/email/forward` | **$0.01** | Forward email |
| `POST /api/asp/template/send-bulk` | **$0.05** | Bulk send to many recipients |
| `POST /api/asp/mailbox/update` | **$0.005** | Update mailbox settings |
| `POST /api/asp/mailbox/delete` | **$0.005** | Delete mailbox |
| `POST /api/asp/email/cancel-scheduled` | **$0.005** | Cancel scheduled email |
| `POST /api/asp/email/search` | **$0.005** | Full-text search emails |
| `POST /api/asp/template/create` | free | Create reusable email template |
| `POST /api/asp/template/list` | free | List all templates |
| `POST /api/asp/template/delete` | free | Delete a template |

### Example: create a mailbox

```bash
curl -X POST https://YOUR_DOMAIN/api/asp/mailbox/create \
  -H "Authorization: Bearer am_your_key" \
  -H "PAYMENT-SIGNATURE: <x402-proof>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "trading-bot", "displayName": "Trading Bot" }'
```

```json
{
  "mailbox": {
    "id": "agt_01j8...",
    "emailAddress": "trading-bot@yourdomain.com",
    "name": "trading-bot"
  }
}
```

### Example: send an email

```bash
curl -X POST https://YOUR_DOMAIN/api/asp/email/send \
  -H "Authorization: Bearer am_your_key" \
  -H "PAYMENT-SIGNATURE: <x402-proof>" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agt_01j8...",
    "to": "user@example.com",
    "subject": "Hello from AgentMail",
    "body": "This email was sent by an AI agent."
  }'
```

### x402 v2 pay-per-call

When `PAYMENT_REQUIRED=true`, each paid endpoint returns HTTP 402 if no payment proof is included:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64-encoded-challenge>
Content-Type: application/json
```

The OKX.AI runtime intercepts the 402, makes the on-chain USDT0 payment on X Layer (`eip155:196`), and retries the request with a `PAYMENT-SIGNATURE` header (the x402 v2 proof; `X-PAYMENT` is the legacy v1 header). On success the endpoint returns `200` with a `PAYMENT-RESPONSE` header carrying the settlement result. This is fully transparent to the agent — no manual payment handling needed.

**Network:** X Layer Mainnet (`eip155:196`)  
**Token:** USDT0 (`0x779ded0c9e1022225f8e0630b35a9b54be713736`)

---

## Email flow

### Outbound (agent → the world)

```
Agent → POST /api/emails/send
    → email-service.sendAgentEmail()
    → resend.sendEmail()            ← real SMTP via Resend
    → Stored in Supabase            ← direction: "outbound", status: "sent"
```

### Inbound (the world → agent)

```
Email arrives at trading-bot@yourdomain.com
    → Resend receives it (MX record required)
    → POST /api/webhooks/inbound    ← event: email.received (metadata only)
        → verifyWebhook()           ← Svix signature check
        → resend.getReceivedEmail() ← fetch full body (text/html) from Resend API
    → email-service.receiveEmail()
        ├─ Looks up Agent by emailAddress (UNIQUE index)
        ├─ Thread detection: matches existing threadId (same from/to pair)
        ├─ Stores email in Supabase   ← direction: "inbound"
        └─ If webhookUrl set: fires POST to agent's webhook (HMAC-signed)
```

---

## Email isolation

Each `Agent` row has `emailAddress TEXT UNIQUE`. `receiveEmail` resolves the agent by exact address match — there is no wildcard or shared routing. `getInbox` always filters `.eq("agentId", id)`. One agent cannot access or receive another agent's email at any layer of the stack.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/hosein-ul/jain
cd jain
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `RESEND_API_KEY` | For real email | Resend API key |
| `RESEND_WEBHOOK_SECRET` | For inbound email | Signing secret from Resend › Webhooks |
| `EMAIL_DOMAIN` | Yes | Your verified domain (e.g. `yourdomain.com`) |
| `PAYMENT_REQUIRED` | OKX.AI | `"true"` to enforce x402 payments |
| `PAYMENT_WALLET` | OKX.AI | EVM wallet on X Layer to receive USDT0 |

### 3. Run locally

```bash
npm run dev   # http://localhost:3000
```

Without `RESEND_API_KEY`, emails are logged to console (dev mode). The database, API, dashboard, and ASP endpoints work fully.

### 4. Configure Resend for real email

1. Add your domain in Resend → Domains and verify DNS
2. Add DNS records provided by Resend:
   - MX record pointing to Resend's inbound servers
   - DKIM, SPF, DMARC records
3. Add a webhook in Resend → Webhooks:
   - URL: `https://yourdomain.com/api/webhooks/inbound`
   - Events: `email.received`
   - Copy the signing secret → set `RESEND_WEBHOOK_SECRET`

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Set all env variables in the Vercel dashboard.

### 6. Register on OKX.AI

Registration happens **in conversation with the OKX.AI agent** (not a web form or CLI flag). You register once as an **ASP** (role `asp`) with a name, description, and avatar, then add one **A2MCP service per endpoint**. For each service you provide:

- **Service name** — a 5–30 char noun phrase (e.g. "Create Agent Mailbox"), not the ASP name, no price in the name
- **Description** — two parts: ① what it does + who it's for, ② what the caller must supply (e.g. "1. agent name")
- **Type** — `A2MCP` (API service)
- **Fee** — a bare number in **USDT**, digits only, no `$`/symbol/unit (e.g. `0.25`). Free services omit the fee.
- **Endpoint** — a public `https://` URL (permanent on-chain; localhost/http rejected)

Replace `YOUR_DOMAIN` with your actual deployed URL (e.g. your Vercel URL). Endpoint URLs are permanent on-chain once registered.

The paid services to register (fee is USDT; the on-chain asset is USDT0 on X Layer):

| Service | Endpoint | Fee (USDT) |
|---|---|---|
| Create Agent Mailbox | `https://YOUR_DOMAIN/api/asp/mailbox/create` | `0.25` |
| Send Email | `https://YOUR_DOMAIN/api/asp/email/send` | `0.02` |
| Send Templated Email | `https://YOUR_DOMAIN/api/asp/template/send` | `0.02` |
| Reply to Email | `https://YOUR_DOMAIN/api/asp/email/reply` | `0.01` |
| Reply All | `https://YOUR_DOMAIN/api/asp/email/reply-all` | `0.01` |
| Forward Email | `https://YOUR_DOMAIN/api/asp/email/forward` | `0.01` |
| Bulk Template Send | `https://YOUR_DOMAIN/api/asp/template/send-bulk` | `0.05` |
| Update Mailbox | `https://YOUR_DOMAIN/api/asp/mailbox/update` | `0.005` |
| Delete Mailbox | `https://YOUR_DOMAIN/api/asp/mailbox/delete` | `0.005` |
| Cancel Scheduled Email | `https://YOUR_DOMAIN/api/asp/email/cancel-scheduled` | `0.005` |
| Search Emails | `https://YOUR_DOMAIN/api/asp/email/search` | `0.005` |

Free services (template/create, template/list, template/delete, inbox/get, email/get, thread/get, mark-read, archive, delete, list-attachments, mailbox/list) can be registered the same way with no fee. Each submission is reviewed within 24 hours; the result arrives at your Agentic Wallet email and in the agent conversation.

Then set `PAYMENT_REQUIRED=true`, `PAYMENT_WALLET=0x...`, and `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` in your Vercel env vars.

---

## Dashboard

The built-in dashboard at `/dashboard` provides full management UI:

| Page | Path | What it does |
|---|---|---|
| Overview | `/dashboard` | Activity chart, agent list, stats |
| Agents | `/dashboard/agents` | Create/manage agent mailboxes |
| Agent inbox | `/dashboard/agents/:id` | Split-pane email client — read, compose, reply |
| Analytics | `/dashboard/analytics` | Daily send/receive breakdown per agent |
| API Keys | `/dashboard/api-keys` | Generate and revoke bearer tokens |
| Templates | `/dashboard/templates` | Reusable email templates with `{{variables}}` |
| Settings | `/dashboard/settings` | Resend config, OKX.AI ASP endpoints |

---

## What needs a real domain to work end-to-end

| Feature | Without domain | With domain |
|---|---|---|
| API and database | Works | Works |
| Dashboard | Works | Works |
| A2MCP endpoint | Works | Works |
| Outbound email | Works (needs Resend key) | Works |
| Inbound email | No (needs MX records) | Works |
| x402 payments | Works (toggle env var) | Works |

---

## Phone

Real phone numbers for agents. Each tenant owns their own numbers; inbound calls and transcripts are mapped to the correct tenant via the destination E.164 number.

### Endpoints

| Endpoint | Price | Description |
|---|---|---|
| `POST /api/asp/phone/numbers` | free | List your numbers |
| `POST /api/asp/phone/calls/get` | free | Get a call by id |
| `POST /api/asp/phone/calls/transcript` | free | Get STT transcript of a completed call |
| `POST /api/asp/phone/buy-number` | **$1.00** | Buy a real number (exact e164, or `{country, areaCode?}`) |
| `POST /api/asp/phone/release-number` | **$0.005** | Release a number |
| `POST /api/asp/phone/start-call` | **$0.05** | Outbound call |
| `POST /api/asp/phone/answer-call` | **$0.005** | Answer an inbound ringing call |
| `POST /api/asp/phone/end-call` | **$0.005** | Hang up |

### Provider

`PhoneProvider` interface (`src/lib/providers/phone.ts`) with two adapters shipped:

- `MockPhoneProvider` — default, deterministic, no external calls (dev + tests)
- `TwilioPhoneProvider` — thin Twilio REST adapter (activated by `PHONE_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`)

Inbound events land at `POST /api/webhooks/phone`. The handler verifies the provider signature, deduplicates via `WebhookEvent.externalId`, then routes to `ingestCallEvent` which either updates an existing call or provisions a new `Call` row scoped to the tenant that owns the destination number.

---

## Domain

Domain registration and DNS management for agents. Every domain and DNS record row is tenant-scoped by `userId`.

### Endpoints

| Endpoint | Price | Description |
|---|---|---|
| `POST /api/asp/domain/search` | free | Check availability across TLDs |
| `POST /api/asp/domain/list` | free | List your registered domains |
| `POST /api/asp/domain/dns/list` | free | List live DNS records for a domain you own |
| `POST /api/asp/domain/register` | **$10.00** | Register a domain (ICANN contact required) |
| `POST /api/asp/domain/renew` | **$10.00** | Extend registration |
| `POST /api/asp/domain/dns/update` | **$0.01** | Create/update a DNS record |
| `POST /api/asp/domain/dns/delete` | **$0.005** | Delete a DNS record |

### Provider

`DomainProvider` interface (`src/lib/providers/domain.ts`). MVP ships with `MockDomainProvider`; production would plug in Namecheap / Porkbun / Cloudflare Registrar behind the same interface. The service layer always calls the provider first (source of truth), then reconciles the local mirror row for indexing and tenant scoping.

Registrar events land at `POST /api/webhooks/domain` and update the local domain state.

---

## Architecture principles

- **API-first, not MCP.** REST endpoints are the public product surface. Every capability is one endpoint with one fixed price, as the OKX.AI ASP marketplace registers per URL.
- **Fixed price per service.** If two capabilities need different prices, they are split into separate URLs. Never a single endpoint with variable pricing.
- **Provider-agnostic core.** Business logic lives in `src/lib/{email,phone,domain}-service.ts`. Provider-specific code lives in `src/lib/providers/*.ts` behind a normalized interface. Swapping providers touches only the adapter.
- **Tenant isolation at every layer.** All service queries filter by `userId`. Resources are resolved by `(id, userId)` before any write. Inbound webhooks map back to the owning tenant via the resource identifier (destination phone number, registered domain name).
- **Credentials never leak.** Provider API keys stay server-side. Callers get a session token (`at_...`) after their first paid call and use it as `Authorization: Bearer` on subsequent calls (both free and paid).
- **Free ≠ public.** Tenant-scoped read endpoints (inbox, call transcripts, DNS list) still require auth and still scope reads to the caller's tenant.
- **x402 pay-per-call.** Paid endpoints return 402 when payment is missing/invalid and are retryable with a valid `PAYMENT-SIGNATURE`. When `PAYMENT_REQUIRED != true` the middleware short-circuits to dev mode; auth still applies.

### Layered request path

```
Client / OKX.AI Agent
   │
   ▼
POST /api/asp/<service>/<action>
   │
   ▼   createPaidRoute / createFreeRoute  (src/lib/asp-route.ts)
   │
   ├── x402 requirePayment (paid only)         → 402 or verified payer
   ├── auth: resolvePaidUser | getRequestUser  → tenant identity
   │
   ▼
Service layer  (email-service | phone-service | domain-service)
   │  ── every read/write filters by userId
   │
   ▼
Provider adapter  (Resend | MockPhone / Twilio | MockDomain)
   │
   ▼
Database (Supabase)  |  External provider API
```

### Database (per-tenant)

Every non-lookup table carries `userId`. New tables added for this milestone:

- `PhoneNumber (id, userId, e164 UNIQUE, provider, providerNumberId, capabilities, webhookUrl, isActive)`
- `Call (id, userId, phoneNumberId, direction, fromNumber, toNumber, status, providerCallId, startedAt, answeredAt, endedAt, durationSec, recordingUrl)`
- `CallTranscript (id, callId UNIQUE, userId, text, language, segments)`
- `Domain (id, userId, name UNIQUE, provider, providerDomainId, status, registeredAt, expiresAt, autoRenew, nameservers)`
- `DnsRecord (id, userId, domainId, type, name, value, ttl, priority, providerRecordId)`
- `WebhookEvent (id, provider, kind, externalId UNIQUE, payload, receivedAt, processedAt)` — inbound event idempotency
- `AccessToken (token, userId, createdAt, lastUsedAt)` — session tokens issued after first paid call

Migration SQL lives in `prisma/migrations/20260721000000_phone_domain/migration.sql`. Prisma schema is documentation-only; the app talks to Supabase directly.

### Environment variables

Existing (see Setup section above): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_DOMAIN`, `PAYMENT_REQUIRED`, `PAYMENT_WALLET`, `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`.

New:

| Variable | Purpose |
|---|---|
| `PHONE_PROVIDER` | `mock` (default) or `twilio` |
| `TWILIO_ACCOUNT_SID` | Twilio credentials (only when `PHONE_PROVIDER=twilio`) |
| `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `DOMAIN_PROVIDER` | reserved — MVP ships mock only |

---

## License

MIT
