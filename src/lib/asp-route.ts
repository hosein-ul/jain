import { NextRequest, NextResponse } from "next/server"
import { requirePayment } from "./x402"

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

export type Handler = (req: NextRequest) => Promise<NextResponse>
export type PaidHandler = (req: NextRequest, ctx: { payer?: string }) => Promise<NextResponse>

export function createPaidRoute(
  path: string,
  price: string,
  description: string,
  handler: PaidHandler
) {
  return async function POST(req: NextRequest) {
    const payment = await requirePayment(req, {
      price,
      description,
      resource: `${APP_URL}${path}`,
    })

    if (payment.status === "required") return payment.response

    const payer = payment.status === "paid" ? payment.payer : undefined
    const res = await handler(req, { payer })

    if (payment.status === "paid" && payment.settlementHeader) {
      res.headers.set("PAYMENT-RESPONSE", payment.settlementHeader)
    }
    return res
  }
}

export function createFreeRoute(handler: Handler) {
  return async function POST(req: NextRequest) {
    return handler(req)
  }
}
