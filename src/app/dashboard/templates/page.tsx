"use client"

import { useEffect, useState } from "react"

interface Template {
  id: string
  name: string
  subject: string
  body: string
  createdAt: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleCreate = async () => {
    if (!name || !subject || !body) return
    setCreating(true)
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, body }),
    })
    setName(""); setSubject(""); setBody("")
    setShowCreate(false)
    setCreating(false)
    fetchTemplates()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" })
    fetchTemplates()
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl">Templates</h1>
          <p className="text-sm text-ink-2 mt-1">Reusable email templates for your agents</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
        >
          New template
        </button>
      </div>

      {showCreate && (
        <div className="border border-line rounded p-5 mb-6 bg-surface-sub">
          <p className="text-sm font-medium mb-4">Create template</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome Email"
                autoFocus
                className="w-full px-3 py-2 text-sm bg-surface-up border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">Subject line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Welcome to {{company}}"
                className="w-full px-3 py-2 text-sm bg-surface-up border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-2 mb-1.5">
                Body <span className="text-ink-3">— use {"{{variable}}"} for substitution</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder={`Hi {{name}},\n\nWelcome aboard!\n\nBest,\n{{agent_name}}`}
                className="w-full px-3 py-2 text-sm bg-surface-up border border-line rounded text-ink placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors resize-none font-mono"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !name || !subject || !body}
              className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setName(""); setSubject(""); setBody("") }}
              className="px-4 py-2 border border-line text-sm text-ink-2 rounded hover:text-ink hover:bg-surface-sub transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="border border-line rounded divide-y divide-line">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-surface-sub rounded w-40 mb-2" />
              <div className="h-3 bg-surface-sub rounded w-64" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="border border-line rounded py-16 text-center">
          <p className="text-ink-2 mb-1">No templates yet</p>
          <p className="text-sm text-ink-3 mb-4">Create reusable templates with variable substitution</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-amber text-white text-sm font-medium rounded hover:bg-amber-h transition-colors"
          >
            Create first template
          </button>
        </div>
      ) : (
        <div className="border border-line rounded divide-y divide-line">
          {templates.map((tmpl) => (
            <div key={tmpl.id}>
              <div className="flex items-center justify-between px-5 py-4 hover:bg-surface-sub transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tmpl.name}</p>
                  <p className="text-xs text-ink-3 mt-0.5 truncate">Subject: {tmpl.subject}</p>
                </div>
                <div className="flex items-center gap-4 ml-4 shrink-0">
                  <span className="text-xs text-ink-3">{new Date(tmpl.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}
                    className="text-xs text-amber hover:text-amber-h transition-colors"
                  >
                    {expanded === tmpl.id ? "Hide" : "Preview"}
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    className="text-xs text-ink-3 hover:text-red transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expanded === tmpl.id && (
                <div className="px-5 pb-4">
                  <pre className="text-xs font-mono text-ink-2 bg-surface-sub border border-line rounded p-4 whitespace-pre-wrap leading-relaxed">
                    {tmpl.body}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
