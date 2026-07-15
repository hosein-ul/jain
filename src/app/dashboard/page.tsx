"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Stats {
  totalSent: number
  totalReceived: number
  totalAgents: number
  unreadCount: number
  dailyStats: Record<string, { sent: number; received: number }>
  agentStats: Array<{
    id: string
    name: string
    emailAddress: string
    totalEmails: number
    isActive: boolean
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const daily = stats?.dailyStats ? Object.entries(stats.dailyStats) : []
  const maxCount = daily.reduce((m, [, d]) => Math.max(m, d.sent + d.received), 1)

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Overview</h1>
        <p className="text-sm text-ink-2 mt-1">Email activity across all agents</p>
      </div>

      {/* Stats */}
      <div className="border border-line rounded divide-y divide-line mb-8">
        {loading ? (
          <div className="p-6 text-sm text-ink-3 animate-pulse">Loading…</div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-line">
            {[
              { label: "Agents", value: stats?.totalAgents ?? 0 },
              { label: "Sent", value: stats?.totalSent ?? 0 },
              { label: "Received", value: stats?.totalReceived ?? 0 },
              { label: "Unread", value: stats?.unreadCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="p-5">
                <p className="text-xs text-ink-3 uppercase tracking-wide font-mono mb-1">{label}</p>
                <p className="text-2xl font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity chart */}
        <div className="border border-line rounded">
          <div className="px-5 py-3 border-b border-line">
            <p className="text-sm font-medium">Email activity — 7 days</p>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-32 animate-pulse bg-surface-sub rounded" />
            ) : daily.length === 0 ? (
              <p className="text-sm text-ink-3 py-8 text-center">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {daily.map(([date, data]) => {
                  const total = data.sent + data.received
                  const width = Math.max((total / maxCount) * 100, total > 0 ? 2 : 0)
                  const sentW = total > 0 ? (data.sent / total) * width : 0
                  const rcvW = width - sentW
                  return (
                    <div key={date} className="flex items-center gap-3 text-xs">
                      <span className="w-10 text-ink-3 font-mono shrink-0">{date.slice(5)}</span>
                      <div className="flex-1 h-4 flex rounded overflow-hidden bg-surface-sub">
                        {data.sent > 0 && (
                          <div className="bg-amber-muted h-full" style={{ width: `${sentW}%` }} />
                        )}
                        {data.received > 0 && (
                          <div className="bg-line-2 h-full" style={{ width: `${rcvW}%` }} />
                        )}
                      </div>
                      <span className="text-ink-3 w-16 text-right font-mono shrink-0">
                        {data.sent}↑ {data.received}↓
                      </span>
                    </div>
                  )
                })}
                <div className="flex gap-4 mt-3 text-xs text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-amber-muted rounded-sm inline-block" />
                    Sent
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-line-2 rounded-sm inline-block" />
                    Received
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agents table */}
        <div className="border border-line rounded">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <p className="text-sm font-medium">Agents</p>
            <Link href="/dashboard/agents" className="text-xs text-amber hover:text-amber-h transition-colors">
              Manage →
            </Link>
          </div>
          <div>
            {loading ? (
              <div className="p-5 text-sm text-ink-3 animate-pulse">Loading…</div>
            ) : !stats?.agentStats?.length ? (
              <div className="p-8 text-center">
                <p className="text-sm text-ink-3 mb-3">No agents yet</p>
                <Link href="/dashboard/agents" className="text-sm text-amber hover:text-amber-h transition-colors">
                  Create first agent →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {stats.agentStats.slice(0, 6).map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/${agent.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-surface-sub transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-ink-3 font-mono truncate">{agent.emailAddress}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-xs text-ink-2">{agent.totalEmails} emails</span>
                      <span className={`text-xs font-mono ${agent.isActive ? "text-green" : "text-red"}`}>
                        {agent.isActive ? "active" : "off"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
