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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const daily = stats?.dailyStats ? Object.entries(stats.dailyStats) : []
  const maxDaily = daily.reduce((m, [, d]) => Math.max(m, d.sent + d.received), 1)

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl">Analytics</h1>
        <p className="text-sm text-ink-2 mt-1">Email performance across all agents</p>
      </div>

      {/* Stats row */}
      <div className="border border-line rounded mb-8">
        {loading ? (
          <div className="p-6 animate-pulse text-ink-3 text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-line">
            {[
              { label: "Sent", value: stats?.totalSent ?? 0 },
              { label: "Received", value: stats?.totalReceived ?? 0 },
              { label: "Agents", value: stats?.totalAgents ?? 0 },
              { label: "Unread", value: stats?.unreadCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="p-5">
                <p className="text-xs text-ink-3 uppercase tracking-wide font-mono mb-1">{label}</p>
                <p className="text-2xl font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="border border-line rounded mb-6">
        <div className="px-5 py-3 border-b border-line">
          <p className="text-sm font-medium">Volume — 7 days</p>
        </div>
        <div className="px-5 py-6">
          {loading ? (
            <div className="h-32 animate-pulse bg-surface-sub rounded" />
          ) : daily.length === 0 ? (
            <p className="text-sm text-ink-3 text-center py-8">No data yet</p>
          ) : (
            <>
              <div className="flex items-end gap-3 h-32">
                {daily.map(([date, data]) => {
                  const total = data.sent + data.received
                  const pct = (total / maxDaily) * 100
                  const sentPct = total > 0 ? (data.sent / total) * 100 : 50
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-ink-3 font-mono">{total || ""}</span>
                      <div
                        className="w-full flex flex-col rounded overflow-hidden"
                        style={{ height: `${Math.max(pct, total > 0 ? 4 : 0)}%` }}
                      >
                        <div className="bg-amber-muted" style={{ height: `${sentPct}%` }} />
                        <div className="bg-line-2 flex-1" />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                {daily.map(([date]) => (
                  <span key={date} className="flex-1 text-center text-xs text-ink-3 font-mono">{date.slice(5)}</span>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-ink-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-amber-muted rounded-sm inline-block" />Sent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-line-2 rounded-sm inline-block" />Received
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Agent table */}
      <div className="border border-line rounded">
        <div className="px-5 py-3 border-b border-line">
          <p className="text-sm font-medium">Agent breakdown</p>
        </div>
        {loading ? (
          <div className="p-5 animate-pulse text-sm text-ink-3">Loading…</div>
        ) : !stats?.agentStats?.length ? (
          <div className="py-10 text-center text-sm text-ink-3">
            No agents —{" "}
            <Link href="/dashboard/agents" className="text-amber hover:text-amber-h transition-colors">
              create one
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-line">
            <div className="grid grid-cols-12 px-5 py-2 text-xs text-ink-3 uppercase tracking-wide font-mono">
              <span className="col-span-4">Agent</span>
              <span className="col-span-5">Email</span>
              <span className="col-span-2 text-right">Emails</span>
              <span className="col-span-1 text-right">Status</span>
            </div>
            {stats.agentStats.map((agent) => (
              <div key={agent.id} className="grid grid-cols-12 px-5 py-3 items-center hover:bg-surface-sub transition-colors">
                <div className="col-span-4">
                  <Link href={`/dashboard/agents/${agent.id}`} className="text-sm font-medium hover:text-amber transition-colors">
                    {agent.name}
                  </Link>
                </div>
                <div className="col-span-5">
                  <span className="text-xs font-mono text-ink-2">{agent.emailAddress}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-sm text-ink-2">{agent.totalEmails}</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className={`text-xs font-mono ${agent.isActive ? "text-green" : "text-red"}`}>
                    {agent.isActive ? "on" : "off"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
