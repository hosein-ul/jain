import {
  LayoutDashboard,
  Mail,
  PhoneCall,
  Globe,
  FileText,
  BarChart3,
  KeyRound,
  Settings2,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    title: "Services",
    items: [
      { href: "/dashboard/mailboxes", label: "Mailboxes", icon: Mail },
      { href: "/dashboard/numbers", label: "Numbers & Calls", icon: PhoneCall },
      { href: "/dashboard/domains", label: "Domains & DNS", icon: Globe },
      { href: "/dashboard/templates", label: "Templates", icon: FileText },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/dashboard/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/dashboard/admin", label: "Admin", icon: Settings2 },
    ],
  },
]
