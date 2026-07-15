"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/agents", label: "Agents" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/settings", label: "Settings" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-surface text-ink overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 border-r border-line flex flex-col shrink-0">
        <div className="h-14 border-b border-line flex items-center px-5">
          <Link href="/" className="font-serif text-lg tracking-tight hover:text-ink-2 transition-colors">
            AgentMail
          </Link>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center h-9 px-5 text-sm transition-colors relative ${
                  isActive
                    ? "text-ink font-medium"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber rounded-r" />
                )}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs font-mono text-ink-3">agentmail.dev</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
