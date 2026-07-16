"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  emailAddress: string
  isActive: boolean
  webhookUrl: string | null
  createdAt: string
  _count: { emails: number }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newWebhook, setNewWebhook] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchAgents = () => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => setAgents(d.agents || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAgents() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, webhookUrl: newWebhook || undefined }),
    })
    setNewName("")
    setNewWebhook("")
    setShowCreate(false)
    setCreating(false)
    fetchAgents()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent and all its emails?")) return
    await fetch(`/api/agents/${id}`, { method: "DELETE" })
    fetchAgents()
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchAgents()
  }

  const emailSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">Agents</h1>
          <p className="text-sm text-ink-2 mt-1">{agents.length} mailbox{agents.length !== 1 ? "es" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
        >
          New agent
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-line rounded mb-6 p-5 bg-surface-sub">
          <h3 className="text-sm font-medium mb-4">Create agent</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Agent name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="trading-bot"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-surface-up border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
              />
              {newName && (
                <p className="text-xs text-ink-3 font-mono mt-1.5">
                  {emailSlug(newName)}@{process.env.NEXT_PUBLIC_EMAIL_DOMAIN ?? "your-domain"}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Webhook URL <span className="text-ink-3">(optional)</span></label>
              <input
                type="url"
                value={newWebhook}
                onChange={(e) => setNewWebhook(e.target.value)}
                placeholder="https://yourapp.com/webhook"
                className="w-full px-3 py-2 text-sm bg-surface-up border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); setNewWebhook("") }}
              className="px-4 py-2 border border-line text-sm text-ink-2 rounded hover:text-ink hover:bg-surface-sub transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="border border-line rounded divide-y divide-line">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="h-4 bg-surface-sub rounded w-32 mb-2" />
              <div className="h-3 bg-surface-sub rounded w-48" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="border border-line rounded py-16 text-center">
          <p className="text-ink-2 mb-1">No agents yet</p>
          <p className="text-sm text-ink-3 mb-4">Create a mailbox to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
          >
            Create first agent
          </button>
        </div>
      ) : (
        <div className="border border-line rounded divide-y divide-line">
          {/* Header */}
          <div className="grid grid-cols-12 px-5 py-2 text-xs text-ink-3 uppercase tracking-wide font-mono">
            <span className="col-span-4">Name</span>
            <span className="col-span-4">Email</span>
            <span className="col-span-1 text-center">Emails</span>
            <span className="col-span-1 text-center">Status</span>
            <span className="col-span-2" />
          </div>
          {agents.map((agent) => (
            <div key={agent.id} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-surface-sub transition-colors">
              <div className="col-span-4">
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="text-sm font-medium hover:text-amber transition-colors"
                >
                  {agent.name}
                </Link>
                <p className="text-xs text-ink-3 mt-0.5">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-4">
                <span className="text-xs font-mono text-ink-2">{agent.emailAddress}</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-sm text-ink-2">{agent._count.emails}</span>
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() => handleToggle(agent.id, agent.isActive)}
                  className={`text-xs font-mono ${agent.isActive ? "text-green hover:text-ink-2" : "text-red hover:text-ink-2"} transition-colors`}
                >
                  {agent.isActive ? "active" : "off"}
                </button>
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="text-xs text-ink-3 hover:text-amber transition-colors"
                >
                  Inbox
                </Link>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="text-xs text-ink-3 hover:text-red transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
