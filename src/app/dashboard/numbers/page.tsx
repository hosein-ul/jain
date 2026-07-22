"use client"

import { useState } from "react"
import { PhoneCall, Plus, PhoneIncoming, PhoneOutgoing, Search, MoreHorizontal } from "lucide-react"
import { PageContainer, PageHeader, Section } from "@/components/ui/section"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Stat } from "@/components/ui/stat"
import { fmtRelative } from "@/lib/utils"

interface PhoneNumber {
  id: string
  e164: string
  provider: string
  capabilities: string
  isActive: boolean
  createdAt: string
}

// Placeholder data — real fetch lands when Telnyx adapter is wired.
const STUB_NUMBERS: PhoneNumber[] = []
const STUB_CALLS: {
  id: string; direction: "inbound" | "outbound"; from: string; to: string
  status: string; durationSec?: number; startedAt: string
}[] = []

export default function NumbersPage() {
  const [query, setQuery] = useState("")
  const numbers = STUB_NUMBERS.filter((n) => n.e164.includes(query))
  const calls = STUB_CALLS

  return (
    <PageContainer>
      <PageHeader
        title="Numbers & Calls"
        description="Real phone numbers for your agents. Place calls, receive inbound via webhook, retrieve STT transcripts."
        actions={
          <Button size="md">
            <Plus /> Buy number
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Active numbers" value={numbers.length} format={(n) => String(Math.round(n))} icon={<PhoneCall />} />
        <Stat label="Calls this week" value={0} format={(n) => String(Math.round(n))} icon={<PhoneOutgoing />} />
        <Stat label="Minutes talked" value={0} format={(n) => n.toFixed(1)} suffix="min" icon={<PhoneIncoming />} />
      </div>

      <Section title="Your numbers" description="Numbers you own via the current provider.">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-line">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <Input
                placeholder="Search by e164…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-[13px]"
              />
            </div>
            <div className="flex-1" />
            <span className="text-[12px] text-muted tabular">
              {numbers.length} number{numbers.length === 1 ? "" : "s"}
            </span>
          </div>
          {numbers.length === 0 ? (
            <EmptyState
              icon={<PhoneCall />}
              title="No numbers yet"
              description="Buy your first real phone number. The provisioning call returns an accessToken that unlocks every other endpoint."
              action={
                <Button>
                  <Plus /> Buy your first number
                </Button>
              }
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                  <th className="text-left font-medium px-5 py-2.5">Number</th>
                  <th className="text-left font-medium px-5 py-2.5">Provider</th>
                  <th className="text-left font-medium px-5 py-2.5">Capabilities</th>
                  <th className="text-left font-medium px-5 py-2.5">Acquired</th>
                  <th className="text-right font-medium px-5 py-2.5">Status</th>
                  <th className="w-8 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => (
                  <tr key={n.id} className="border-b border-line last:border-0 hover:bg-elevated/50 transition-colors">
                    <td className="px-5 py-3 font-mono tabular text-text font-medium">{n.e164}</td>
                    <td className="px-5 py-3 text-text-2 capitalize">{n.provider}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {n.capabilities.split(",").filter(Boolean).map((c) => (
                          <Badge key={c} variant="outline">{c.trim()}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-2 tabular">{fmtRelative(n.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge dot variant={n.isActive ? "positive" : "muted"}>
                        {n.isActive ? "Active" : "Released"}
                      </Badge>
                    </td>
                    <td className="px-1 py-3">
                      <Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Section>

      <Section title="Recent calls" description="Inbound and outbound, across all your numbers.">
        <Card className="overflow-hidden">
          {calls.length === 0 ? (
            <EmptyState
              icon={<PhoneOutgoing />}
              title="No calls yet"
              description="Once you buy a number and place your first call, it lands here with live status."
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                  <th className="w-8 px-2 py-2.5" />
                  <th className="text-left font-medium px-5 py-2.5">From</th>
                  <th className="text-left font-medium px-5 py-2.5">To</th>
                  <th className="text-left font-medium px-5 py-2.5">Status</th>
                  <th className="text-right font-medium px-5 py-2.5">Duration</th>
                  <th className="text-right font-medium px-5 py-2.5">Started</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-elevated/50 transition-colors">
                    <td className="pl-4 py-3 text-text-2">
                      {c.direction === "inbound" ? <PhoneIncoming className="size-3.5" /> : <PhoneOutgoing className="size-3.5" />}
                    </td>
                    <td className="px-5 py-3 font-mono tabular text-text">{c.from}</td>
                    <td className="px-5 py-3 font-mono tabular text-text-2">{c.to}</td>
                    <td className="px-5 py-3"><Badge variant="outline">{c.status}</Badge></td>
                    <td className="px-5 py-3 text-right tabular text-text">
                      {c.durationSec ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-text-2 tabular">{fmtRelative(c.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </Section>
    </PageContainer>
  )
}
