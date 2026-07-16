"use client"

import Link from "next/link"

const curlExample = `$ curl -X POST https://your-domain.com/api/agents \\
    -H "Authorization: Bearer am_live_xxxx" \\
    -d '{"name": "trading-bot"}'

{
  "id": "agt_01j8...",
  "emailAddress": "trading-bot@your-domain.com",
  "created_at": "2026-07-15T10:00:00Z"
}`

const sendExample = `$ curl -X POST https://your-domain.com/api/emails/send \\
    -H "Authorization: Bearer am_live_xxxx" \\
    -d '{
      "agentId": "agt_01j8...",
      "to": "investor@fund.com",
      "subject": "BTC Alert: $100k crossed",
      "body": "Your position hit the target."
    }'

{"email": {"id": "eml_01j8...", "status": "sent"}}`

const features = [
  ["Send", "SMTP-authenticated, DKIM-signed outbound via Resend"],
  ["Receive", "Real MX records, inbound webhook delivery to your endpoint"],
  ["Thread", "Full RFC 5322 threading — In-Reply-To, References headers"],
  ["Search", "Full-text search across all agent mailboxes"],
  ["Attachments", "Send and receive files, stored and accessible via API"],
  ["Analytics", "Delivery status, open tracking, bounce handling"],
  ["Templates", "Reusable templates with variable substitution"],
  ["Bulk send", "Send to multiple recipients in a single API call"],
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Nav */}
      <nav className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif text-xl tracking-tight">AgentMail</span>
          <div className="flex items-center gap-6 text-sm text-ink-2">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#api" className="hover:text-ink transition-colors">API</a>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 bg-ink text-surface text-sm font-medium rounded hover:bg-ink-2 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <p className="text-sm text-ink-2 font-mono mb-6 tracking-wide uppercase">
            OKX.AI Agent Service Provider
          </p>
          <h1 className="font-serif text-6xl leading-[1.05] tracking-tight text-ink mb-6">
            Agents deserve<br />real email.
          </h1>
          <p className="text-lg text-ink-2 leading-relaxed mb-8 max-w-lg">
            Not mocks. Not logs. Full SMTP delivery, real inboxes with MX records,
            thread-aware conversations, and a production API that works today.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
            >
              Open dashboard
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="px-5 py-2.5 border border-line text-ink text-sm font-medium rounded hover:bg-surface-sub transition-colors"
            >
              Get API key
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-16 pt-8 border-t border-line flex gap-12">
          {[
            ["1 API call", "to provision a mailbox"],
            ["< 200ms", "median response time"],
            ["USDT / USDG", "pay-per-call via OKX.AI"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="font-mono text-lg font-medium text-ink">{value}</div>
              <div className="text-sm text-ink-2 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* API example */}
      <section id="api" className="border-t border-line bg-[#0F0F0E]">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-mono text-ink-3 uppercase tracking-widest mb-3">Create a mailbox</p>
              <pre className="text-sm font-mono text-[#E8E8E0] leading-relaxed overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-mono text-ink-3 uppercase tracking-widest mb-3">Send an email</p>
              <pre className="text-sm font-mono text-[#E8E8E0] leading-relaxed overflow-x-auto">
                <code>{sendExample}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-serif text-3xl mb-8">What's included</h2>
          <div className="border-t border-line">
            {features.map(([name, desc]) => (
              <div key={name} className="flex gap-12 py-4 border-b border-line">
                <span className="w-28 text-sm font-medium text-ink shrink-0">{name}</span>
                <span className="text-sm text-ink-2">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OKX.AI section */}
      <section className="border-t border-line bg-surface-sub">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="max-w-xl">
            <p className="text-xs font-mono text-amber uppercase tracking-widest mb-3">OKX.AI Marketplace</p>
            <h2 className="font-serif text-3xl mb-4">Available as an A2MCP service</h2>
            <p className="text-ink-2 leading-relaxed mb-6">
              Any agent on the OKX.AI marketplace can discover and use AgentMail with a single
              function call. Create mailboxes, send messages, and read replies — all billed
              per call in USDT or USDG.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex px-5 py-2.5 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
            >
              Start building
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-ink-3">
          <span className="font-serif">AgentMail</span>
          <span>OKX.AI Agent Service Provider</span>
        </div>
      </footer>
    </div>
  )
}
