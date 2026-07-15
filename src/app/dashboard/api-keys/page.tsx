"use client"

import { useEffect, useState } from "react"

interface ApiKeyData {
  id: string
  key: string
  name: string
  isActive: boolean
  lastUsed: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchKeys = () => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchKeys() }, [])

  const handleCreate = async () => {
    setCreating(true)
    await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() || "Default" }),
    })
    setNewName("")
    setCreating(false)
    fetchKeys()
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this API key? This cannot be undone.")) return
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" })
    fetchKeys()
  }

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">API Keys</h1>
        <p className="text-sm text-ink-2 mt-1">Authenticate API requests with a Bearer token</p>
      </div>

      {/* Create */}
      <div className="border border-line rounded p-5 mb-6">
        <p className="text-sm font-medium mb-3">New key</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Key name, e.g. Production"
            className="flex-1 px-3 py-2 text-sm bg-surface border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors disabled:opacity-40"
          >
            {creating ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {/* Keys table */}
      <div className="border border-line rounded mb-6">
        {loading ? (
          <div className="p-5 animate-pulse text-sm text-ink-3">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-3">
            No keys yet — generate one above
          </div>
        ) : (
          <div className="divide-y divide-line">
            <div className="grid grid-cols-12 px-5 py-2 text-xs text-ink-3 uppercase tracking-wide font-mono">
              <span className="col-span-3">Name</span>
              <span className="col-span-5">Key</span>
              <span className="col-span-2">Created</span>
              <span className="col-span-1 text-center">Status</span>
              <span className="col-span-1" />
            </div>
            {keys.map((key) => (
              <div key={key.id} className="grid grid-cols-12 px-5 py-3.5 items-center gap-2 hover:bg-surface-sub transition-colors">
                <div className="col-span-3">
                  <span className="text-sm font-medium">{key.name}</span>
                  {key.lastUsed && (
                    <p className="text-xs text-ink-3 mt-0.5">
                      Used {new Date(key.lastUsed).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  <code className="text-xs font-mono text-ink-2 bg-surface-sub px-2 py-1 rounded">
                    {key.key.slice(0, 10)}…{key.key.slice(-4)}
                  </code>
                  <button
                    onClick={() => copyKey(key.id, key.key)}
                    className={`text-xs transition-colors ${copiedId === key.id ? "text-green" : "text-amber hover:text-amber-h"}`}
                  >
                    {copiedId === key.id ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-ink-3">{new Date(key.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-xs font-mono ${key.isActive ? "text-green" : "text-red"}`}>
                    {key.isActive ? "active" : "revoked"}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  {key.isActive && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-ink-3 hover:text-red transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="border border-line rounded p-5 bg-surface-sub">
        <p className="text-xs text-ink-3 uppercase tracking-wide font-mono mb-3">Usage</p>
        <p className="text-sm text-ink-2 mb-3">Pass the key in the Authorization header:</p>
        <pre className="text-xs font-mono text-ink bg-surface px-4 py-3 rounded border border-line overflow-x-auto">
          {`curl -H "Authorization: Bearer am_your_key_here" \\
     https://agentmail.dev/api/agents`}
        </pre>
      </div>
    </div>
  )
}
