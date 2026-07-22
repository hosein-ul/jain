"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
    "transition-[background-color,border-color,color,box-shadow] duration-[var(--dur-fast)] " +
    "ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] " +
    "disabled:pointer-events-none disabled:opacity-50 select-none " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-[var(--accent-hover)] shadow-token-xs",
        secondary:
          "bg-surface text-text border border-line hover:bg-elevated hover:border-line-strong",
        ghost: "text-text-2 hover:text-text hover:bg-elevated",
        outline:
          "border border-line-strong text-text hover:bg-elevated",
        danger:
          "bg-negative text-white hover:opacity-90 shadow-token-xs",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-md [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-sm rounded-md [&_svg]:size-4",
        lg: "h-10 px-4 text-sm rounded-lg [&_svg]:size-4",
        icon: "h-9 w-9 rounded-md [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { buttonVariants }
