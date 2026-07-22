"use client"

import * as React from "react"
import { Search, Bell, Wallet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function TopBar() {
  return (
    <header className="h-14 border-b border-line bg-surface/70 backdrop-blur-md sticky top-0 z-30">
      <div className="h-full flex items-center gap-3 px-5">
        {/* Search */}
        <div className="flex items-center gap-2 w-full max-w-md h-8 px-2.5 rounded-md border border-line bg-elevated/40 text-muted hover:bg-elevated transition-colors cursor-text">
          <Search className="size-3.5" strokeWidth={1.75} />
          <span className="text-[13px] flex-1 truncate">Search mailboxes, calls, domains…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-line-strong bg-surface px-1.5 py-[1px] text-[10px] font-mono text-muted">
            ⌘K
          </kbd>
        </div>

        <div className="flex-1" />

        {/* Wallet balance chip */}
        <div className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-line bg-elevated/40 text-[12.5px]">
          <Wallet className="size-3.5 text-text-2" strokeWidth={1.75} />
          <span className="text-text-2">Balance</span>
          <span className="font-mono tabular text-text font-medium">12.4820</span>
          <span className="text-muted">USDT0</span>
        </div>

        <Button variant="ghost" size="icon-sm" aria-label="Notifications">
          <Bell strokeWidth={1.75} />
        </Button>

        <ThemeToggle />
      </div>
    </header>
  )
}
