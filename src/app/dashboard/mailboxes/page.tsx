"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Mail, Plus, Search, MoreHorizontal, ArrowUpRight } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/ui/section"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { fmtCompact, fmtRelative } from "@/lib/utils"

interface Agent {
  id: string
  name: string
  emailAddress: string
  isActive: boolean
  createdAt: string
  totalEmails?: number
}

export default function MailboxesPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : { agents: [] }))
      .then((d) => setAgents(d.agents ?? d ?? []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = (agents ?? []).filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.emailAddress.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <PageContainer>
      <PageHeader
        title="Mailboxes"
        description="Every agent gets its own real @-address. Send from it, receive at it, thread replies to it."
        actions={
          <Button size="md">
            <Plus /> New mailbox
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-line">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <Input
              placeholder="Search mailboxes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
          <div className="flex-1" />
          <span className="text-[12px] text-muted tabular">
            {filtered.length} of {agents?.length ?? 0}
          </span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Mail />}
            title={agents?.length === 0 ? "No mailboxes yet" : "No results"}
            description={
              agents?.length === 0
                ? "Create your first agent mailbox to start sending and receiving email through the API."
                : "Try a different search term."
            }
            action={
              agents?.length === 0 ? (
                <Button>
                  <Plus /> Create mailbox
                </Button>
              ) : undefined
            }
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                <th className="text-left font-medium px-5 py-2.5">Agent</th>
                <th className="text-left font-medium px-5 py-2.5">Address</th>
                <th className="text-right font-medium px-5 py-2.5">Emails</th>
                <th className="text-left font-medium px-5 py-2.5">Created</th>
                <th className="text-right font-medium px-5 py-2.5">Status</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line last:border-0 hover:bg-elevated/50 transition-colors group"
                >
                  <td className="px-5 py-3 text-text font-medium">
                    <Link
                      href={`/dashboard/agents/${a.id}`}
                      className="hover:text-accent transition-colors flex items-center gap-1.5"
                    >
                      {a.name}
                      <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-text-2 font-mono tabular">{a.emailAddress}</td>
                  <td className="px-5 py-3 text-right tabular text-text">
                    {fmtCompact(a.totalEmails ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-text-2 tabular">
                    {a.createdAt ? fmtRelative(a.createdAt) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge dot variant={a.isActive ? "positive" : "muted"}>
                      {a.isActive ? "Active" : "Paused"}
                    </Badge>
                  </td>
                  <td className="px-1 py-3">
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageContainer>
  )
}
