import { NextRequest, NextResponse } from "next/server"
import { requirePayment } from "./x402"

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

export type Handler = (req: NextRequest) => Promise<NextResponse>
export type PaidHandler = (req: NextRequest, ctx: { payer?: string }) => Promise<NextResponse>

function endpointInfo(path: string, description: string, price?: string) {
  const url = `${APP_URL}${path}`
  return NextResponse.json({
    endpoint: url,
    method: "POST",
    description,
    ...(price ? { price, payment: "x402 v2 — include PAYMENT-SIGNATURE header (USDT0 on X Layer eip155:196)" } : { auth: "Authorization: Bearer <at_...> token from mailbox/create" }),
    hint: {
      why: "This endpoint only accepts POST requests with a JSON body.",
      how: price
        ? `Send POST with Content-Type: application/json. Pay via x402: hit this endpoint once to receive a 402 challenge, sign it with your wallet, then replay with PAYMENT-SIGNATURE header. After mailbox/create, save the returned accessToken and send it as 'Authorization: Bearer <token>' on all future calls.`
        : `Send POST with Content-Type: application/json and Authorization: Bearer <accessToken> header. Get your accessToken from POST /api/asp/mailbox/create.`,
      example: `curl -X POST ${url} -H "Content-Type: application/json" -H "Authorization: Bearer at_..." -d '{}'`,
      manifest: `${APP_URL}/api/asp`,
    },
  })
}

export function createPaidRoute(
  path: string,
  price: string,
  description: string,
  handler: PaidHandler
) {
  async function POST(req: NextRequest) {
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

  function GET() {
    return endpointInfo(path, description, price)
  }

  return { POST, GET }
}

export function createFreeRoute(path: string, description: string, handler: Handler) {
  async function POST(req: NextRequest) {
    return handler(req)
  }

  function GET() {
    return endpointInfo(path, description)
  }

  return { POST, GET }
}
