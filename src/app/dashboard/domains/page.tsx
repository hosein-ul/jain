"use client"

import { useState } from "react"
import { Globe, Plus, Search, ShieldCheck, Server, Clock } from "lucide-react"
import { PageContainer, PageHeader, Section } from "@/components/ui/section"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Stat } from "@/components/ui/stat"
import { fmtRelative } from "@/lib/utils"

interface Domain {
  id: string
  name: string
  status: string
  registeredAt: string
  expiresAt: string
  autoRenew: boolean
}

const STUB: Domain[] = []

export default function DomainsPage() {
  const [query, setQuery] = useState("")
  const domains = STUB.filter((d) => d.name.includes(query))

  return (
    <PageContainer>
      <PageHeader
        title="Domains & DNS"
        description="Register domains via the configured registrar. Manage DNS records with live registrar state."
        actions={
          <>
            <Button variant="secondary" size="md">
              <Search /> Check availability
            </Button>
            <Button size="md">
              <Plus /> Register domain
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Registered domains" value={domains.length} format={(n) => String(Math.round(n))} icon={<Globe />} />
        <Stat label="DNS records" value={0} format={(n) => String(Math.round(n))} icon={<Server />} />
        <Stat label="Expiring in 30d" value={0} format={(n) => String(Math.round(n))} icon={<Clock />} />
      </div>

      <Section title="Your domains">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-line">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <Input
                placeholder="Search domains…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-8 text-[13px]"
              />
            </div>
            <div className="flex-1" />
            <span className="text-[12px] text-muted tabular">
              {domains.length} domain{domains.length === 1 ? "" : "s"}
            </span>
          </div>
          {domains.length === 0 ? (
            <EmptyState
              icon={<Globe />}
              title="No domains yet"
              description="Register your first domain. The registration includes an accessToken that unlocks DNS management and every other AgentOS endpoint."
              action={
                <Button>
                  <Plus /> Register your first domain
                </Button>
              }
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.06em] text-muted">
                  <th className="text-left font-medium px-5 py-2.5">Domain</th>
                  <th className="text-left font-medium px-5 py-2.5">Registered</th>
                  <th className="text-left font-medium px-5 py-2.5">Expires</th>
                  <th className="text-left font-medium px-5 py-2.5">Auto-renew</th>
                  <th className="text-right font-medium px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id} className="border-b border-line last:border-0 hover:bg-elevated/50 transition-colors">
                    <td className="px-5 py-3 font-mono tabular text-text font-medium">{d.name}</td>
                    <td className="px-5 py-3 text-text-2 tabular">{fmtRelative(d.registeredAt)}</td>
                    <td className="px-5 py-3 text-text-2 tabular">{fmtRelative(d.expiresAt)}</td>
                    <td className="px-5 py-3">
                      {d.autoRenew ? (
                        <Badge variant="positive" dot><ShieldCheck className="size-3" /> On</Badge>
                      ) : (
                        <Badge variant="muted">Off</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge dot variant="positive">{d.status}</Badge>
                    </td>
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
