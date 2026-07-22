import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-14 px-6 gap-3",
        className
      )}
    >
      {icon ? (
        <div className="size-12 rounded-xl border border-line bg-elevated grid place-items-center text-text-2 [&_svg]:size-5 mb-1">
          {icon}
        </div>
      ) : null}
      <div className="text-[15px] font-semibold text-text tracking-[-0.01em]">{title}</div>
      {description ? (
        <p className="text-[13px] text-text-2 max-w-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
