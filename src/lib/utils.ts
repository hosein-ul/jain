import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Number formatting helpers — always tabular. Use these for KPIs and tables.
const compactNF = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const standardNF = new Intl.NumberFormat("en-US")
const usdNF = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
const usdMicroNF = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 })

export function fmtCompact(n: number) { return compactNF.format(n) }
export function fmtNumber(n: number) { return standardNF.format(n) }
export function fmtUsd(n: number) { return usdNF.format(n) }
export function fmtUsdMicro(n: number) { return usdMicroNF.format(n) }
export function fmtPercent(n: number, digits = 1) {
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(digits)}%`
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
export function fmtRelative(from: Date | string | number) {
  const d = from instanceof Date ? from : new Date(from)
  const diffMs = d.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const div: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ]
  for (const [unit, ms] of div) {
    if (abs >= ms || unit === "second") {
      return relative.format(Math.round(diffMs / ms), unit)
    }
  }
  return "just now"
}
