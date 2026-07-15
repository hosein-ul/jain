"use client"

export default function SettingsPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://agentmail.dev"
  const a2mcpActions = ["create_mailbox", "send_email", "get_inbox", "get_email", "reply_email", "receive_email"]

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="text-sm text-ink-2 mt-1">Account and integration configuration</p>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <section className="border border-line rounded">
          <div className="px-5 py-3 border-b border-line">
            <p className="text-sm font-medium">Account</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Account email</label>
              <input
                type="email"
                value="demo@agentmail.dev"
                disabled
                className="w-full px-3 py-2 text-sm bg-surface-sub border border-line rounded text-ink-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Email domain</label>
              <input
                type="text"
                value="agentmail.dev"
                disabled
                className="w-full px-3 py-2 text-sm bg-surface-sub border border-line rounded text-ink-2 font-mono"
              />
              <p className="text-xs text-ink-3 mt-1.5">All agent mailboxes use this domain</p>
            </div>
          </div>
        </section>

        {/* SendGrid */}
        <section className="border border-line rounded">
          <div className="px-5 py-3 border-b border-line">
            <p className="text-sm font-medium">SendGrid</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">API key</p>
                <p className="text-xs text-ink-3 mt-0.5">Set SENDGRID_API_KEY in .env</p>
              </div>
              <span className="text-xs font-mono text-ink-3 bg-surface-sub px-2 py-1 rounded border border-line">
                not configured
              </span>
            </div>
            <div>
              <p className="text-xs text-ink-2 mb-1.5">Inbound Parse webhook</p>
              <pre className="text-xs font-mono text-ink bg-surface-sub border border-line rounded px-3 py-2 overflow-x-auto">
                POST {origin}/api/webhooks/inbound
              </pre>
              <p className="text-xs text-ink-3 mt-1.5">
                Configure this URL in SendGrid › Settings › Inbound Parse
              </p>
            </div>
          </div>
        </section>

        {/* OKX.AI */}
        <section className="border border-line rounded">
          <div className="px-5 py-3 border-b border-line">
            <p className="text-sm font-medium">OKX.AI A2MCP</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm">Service type</p>
              <span className="text-xs font-mono text-amber bg-amber-bg px-2 py-1 rounded">
                A2MCP · pay-per-call
              </span>
            </div>
            <div>
              <p className="text-xs text-ink-2 mb-1.5">Endpoint</p>
              <pre className="text-xs font-mono text-ink bg-surface-sub border border-line rounded px-3 py-2 overflow-x-auto">
                POST {origin}/api/a2mcp
              </pre>
            </div>
            <div>
              <p className="text-xs text-ink-2 mb-2">Available actions</p>
              <div className="flex flex-wrap gap-2">
                {a2mcpActions.map((action) => (
                  <span key={action} className="text-xs font-mono text-ink-2 bg-surface-sub px-2 py-1 rounded border border-line">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
