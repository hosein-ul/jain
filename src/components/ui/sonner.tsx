"use client"

import { useTheme } from "next-themes"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface !border !border-line !text-text !rounded-lg !shadow-token-md",
          description: "!text-text-2",
          actionButton: "!bg-accent !text-white",
          cancelButton: "!bg-elevated !text-text-2",
        },
      }}
    />
  )
}
