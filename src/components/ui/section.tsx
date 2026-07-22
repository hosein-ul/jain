import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-8", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-text">{title}</h1>
        {description ? (
          <p className="mt-2 text-[13.5px] text-text-2 leading-relaxed max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  )
}

interface SectionProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-[14.5px] font-semibold tracking-[-0.01em] text-text">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[12.5px] text-text-2">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1440px] px-6 md:px-8 flex flex-col gap-8 pb-16", className)}>
      {children}
    </div>
  )
}
