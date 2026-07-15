# AgentMail

Real email infrastructure for AI agents. Give any agent its own `@agentmail.dev` address — send, receive, and manage email through a single REST API.

Built as an **ASP (Agent Service Provider)** for the [OKX.AI Genesis Hackathon 2026](https://web3.okx.com/onchainos).

---

## What it is

AI agents need to communicate via email — to send alerts, receive confirmations, handle replies, and maintain ongoing conversations. AgentMail gives each agent a real, isolated email address backed by full SMTP delivery (SendGrid), real MX records, and RFC 5322-compliant threading.

Every agent gets their own exclusive mailbox. Emails never cross between agents.

```
trading-bot@agentmail.dev     → isolated inbox, send/receive
customer-agent@agentmail.dev  → completely separate mailbox
research-agent@agentmail.dev  → no shared state with others
```

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │            AgentMail                 │
                        │                                      │
  OKX.AI Agents ───────▶│  POST /api/a2mcp   (x402 payment)  │
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
                        │  Supabase   SendGrid                 │
                        │  (storage)  (SMTP delivery)          │
                        └─────────────────────────────────────┘
                                    ▲
                         SendGrid Inbound Parse
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
| Email delivery | SendGrid (SMTP + inbound parse) |
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
curl -X POST https://agentmail.dev/api/agents \
  -H "Authorization: Bearer am_..." \
  -d '{ "name": "trading-bot", "webhookUrl": "https://you.com/hook" }'
```
```json
{
  "id": "agt_01j8...",
  "name": "trading-bot",
  "emailAddress": "trading-bot@agentmail.dev",
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
curl -X POST https://agentmail.dev/api/emails/send \
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
| POST | `/api/webhooks/inbound` | SendGrid inbound parse (internal) |

---

## OKX.AI A2MCP integration

AgentMail is registered as an **A2MCP (Agent-to-MCP)** service on the OKX.AI marketplace. Any agent on OKX.AI can discover and use AgentMail without configuration.

### How agents discover AgentMail

OKX.AI maintains a registry of ASPs. When registered, agents on the marketplace can call `GET /api/a2mcp` to discover available tools and pricing, then call `POST /api/a2mcp` to use them.

```bash
# Discovery
curl https://agentmail.dev/api/a2mcp
```

```json
{
  "name": "agentmail",
  "version": "1.0.0",
  "description": "Real email infrastructure for AI agents",
  "pricing": "x402 pay-per-call, USDT0 on X Layer",
  "tools": [
    { "name": "create_mailbox", "price_usdt0": "0.100" },
    { "name": "send_email",     "price_usdt0": "0.050" },
    { "name": "get_inbox",      "price_usdt0": "0.010" },
    { "name": "get_email",      "price_usdt0": "0.005" },
    { "name": "reply_email",    "price_usdt0": "0.050" },
    { "name": "receive_email",  "price_usdt0": "0.000" }
  ]
}
```

### Using an action

```bash
curl -X POST https://agentmail.dev/api/a2mcp \
  -H "X-PAYMENT: <x402-proof>" \
  -d '{ "action": "create_mailbox", "params": { "agent_name": "trading-bot" } }'
```

```json
{
  "email": "trading-bot@agentmail.dev",
  "agent_id": "agt_01j8...",
  "api_key": "am_abc123..."
}
```

### Available actions

| Action | Description | Price |
|---|---|---|
| `create_mailbox` | Provision a new agent email address | 0.100 USDT0 |
| `send_email` | Send email from an agent | 0.050 USDT0 |
| `get_inbox` | List emails in an agent's inbox | 0.010 USDT0 |
| `get_email` | Retrieve a single email by ID | 0.005 USDT0 |
| `reply_email` | Reply to an existing email thread | 0.050 USDT0 |
| `receive_email` | Deliver an inbound email (webhook use) | free |

### x402 pay-per-call

When `PAYMENT_REQUIRED=true`, the endpoint returns HTTP 402 before any call that has a price:

```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "xlayer-mainnet",
    "maxAmountRequired": "100000",
    "asset": "0x74b7f16337b8972027f6196a17a631ac6dE26d22",
    "payToAddress": "0xYourWalletAddress",
    "maxTimeoutSeconds": 300,
    "description": "AgentMail: create_mailbox — 0.100 USDT0"
  }]
}
```

The OKX.AI Payment SDK intercepts the 402, makes the on-chain payment, and retries the request with `X-PAYMENT` proof. This is fully transparent to the agent.

---

## Email flow

### Outbound (agent → the world)

```
Agent → POST /api/emails/send
    → email-service.sendAgentEmail()
    → sendgrid.sendEmail()          ← real SMTP via SendGrid
    → Stored in Supabase            ← direction: "outbound", status: "sent"
```

### Inbound (the world → agent)

```
Email arrives at trading-bot@agentmail.dev
    → SendGrid Inbound Parse (MX record required)
    → POST /api/webhooks/inbound
    → email-service.receiveEmail()
        ├─ Looks up Agent by emailAddress (UNIQUE index)
        ├─ Thread detection: matches existing threadId (same from/to pair)
        ├─ Stores email in Supabase   ← direction: "inbound"
        └─ If webhookUrl set: fires POST to agent's webhook
```

---

## Email isolation

Each `Agent` row has `emailAddress TEXT UNIQUE`. `receiveEmail` resolves the agent by exact address match — there is no wildcard or shared routing. `getInbox` always filters `.eq("agentId", id)`. One agent cannot access or receive another agent's email at any layer of the stack.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/hosein-ul/agentmail
cd agentmail
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
| `SENDGRID_API_KEY` | For real email | SendGrid API key |
| `EMAIL_DOMAIN` | Yes | Your verified domain (e.g. `agentmail.dev`) |
| `PAYMENT_REQUIRED` | OKX.AI | `"true"` to enforce x402 payments |
| `PAYMENT_WALLET` | OKX.AI | EVM wallet on X Layer to receive USDT0 |

### 3. Run locally

```bash
npm run dev   # http://localhost:3000
```

Without `SENDGRID_API_KEY`, emails are logged to console (dev mode). The database, API, dashboard, and A2MCP endpoint work fully.

### 4. Configure SendGrid for real email

1. Verify your domain in SendGrid → Sender Authentication
2. Add DNS records:
   - `MX agentmail.dev mx.sendgrid.net 10`
   - DKIM, SPF, DMARC records from SendGrid
3. Enable Inbound Parse: route `agentmail.dev` → `https://agentmail.dev/api/webhooks/inbound`

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Set all env variables in the Vercel dashboard.

### 6. Register on OKX.AI

```bash
npx @okxai/skills add --endpoint https://agentmail.dev/api/a2mcp
```

Then set `PAYMENT_REQUIRED=true` and `PAYMENT_WALLET=0x...` in production.

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
| Settings | `/dashboard/settings` | SendGrid config, OKX.AI wallet |

---

## What needs a real domain to work end-to-end

| Feature | Without domain | With domain |
|---|---|---|
| API and database | Works | Works |
| Dashboard | Works | Works |
| A2MCP endpoint | Works | Works |
| Outbound email | Works (needs SendGrid key) | Works |
| Inbound email | No (needs MX records) | Works |
| x402 payments | Works (toggle env var) | Works |

---

## License

MIT
