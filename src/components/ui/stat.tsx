"use client"

import * as React from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn, fmtCompact, fmtPercent } from "@/lib/utils"
import { Card } from "./card"

interface StatProps {
  label: string
  value: number
  format?: (n: number) => string
  delta?: number            // percent change
  trend?: number[]          // sparkline data
  icon?: React.ReactNode
  suffix?: string
  className?: string
}

export function Stat({ label, value, format = fmtCompact, delta, trend, icon, suffix, className }: StatProps) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => format(v))

  React.useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.9,
      ease: [0.2, 0.8, 0.2, 1],
    })
    return controls.stop
  }, [mv, value])

  const deltaPositive = delta !== undefined && delta >= 0

  return (
    <Card className={cn("p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] text-text-2 font-medium">{label}</span>
        {icon ? (
          <span className="size-8 grid place-items-center rounded-lg bg-elevated text-text-2 [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <motion.span className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular text-text">
          {rounded}
        </motion.span>
        {suffix ? (
          <span className="text-[13px] font-medium text-muted">{suffix}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {delta !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[12px] tabular font-medium",
              deltaPositive ? "text-positive" : "text-negative"
            )}
          >
            {deltaPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {fmtPercent(delta)}
          </span>
        ) : (
          <span className="text-[12px] text-muted">&nbsp;</span>
        )}
        {trend && trend.length > 1 ? (
          <Sparkline data={trend} positive={deltaPositive} />
        ) : null}
      </div>
    </Card>
  )
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 80
  const h = 20
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((d, i) => `${i * step},${h - ((d - min) / range) * h}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="ml-auto shrink-0">
      <polyline
        fill="none"
        stroke={positive ? "var(--positive)" : "var(--negative)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}
