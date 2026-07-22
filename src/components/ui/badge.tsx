import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium leading-none " +
    "px-2 py-1 tracking-[0.01em] border transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-elevated text-text-2 border-line",
        muted:
          "bg-transparent text-muted border-line",
        accent:
          "bg-accent-soft text-accent border-transparent",
        positive:
          "bg-positive-soft text-positive border-transparent",
        negative:
          "bg-negative-soft text-negative border-transparent",
        warn:
          "bg-warn-soft text-warn border-transparent",
        outline:
          "bg-transparent text-text-2 border-line-strong",
      },
      dot: {
        true: "pl-1.5",
        false: "",
      },
    },
    defaultVariants: { variant: "default", dot: false },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, dot }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            variant === "positive" && "bg-positive",
            variant === "negative" && "bg-negative",
            variant === "warn" && "bg-warn",
            variant === "accent" && "bg-accent",
            (!variant || variant === "default" || variant === "muted" || variant === "outline") &&
              "bg-muted"
          )}
        />
      ) : null}
      {children}
    </span>
  )
}
