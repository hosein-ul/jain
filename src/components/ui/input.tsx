import * as React from "react"
import { cn } from "@/lib/utils"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-line bg-surface px-3 py-1 text-sm text-text " +
          "placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 " +
          "focus-visible:ring-[var(--ring)] focus-visible:border-transparent " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          "transition-[border-color,box-shadow] duration-[var(--dur-fast)]",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
