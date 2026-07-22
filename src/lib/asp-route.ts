import { NextRequest, NextResponse } from "next/server"
import { requirePayment, type EndpointInputSchema } from "./x402"

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

export type Handler = (req: NextRequest) => Promise<NextResponse>
export type PaidHandler = (req: NextRequest, ctx: { payer?: string }) => Promise<NextResponse>

// The three provisioning endpoints — every other endpoint depends on the
// accessToken one of these issues. Recognizing them here lets us surface a
// "START HERE" badge on their GET self-description.
const PROVISIONING_PATHS = new Set([
  "/api/asp/mailbox/create",
  "/api/asp/phone/buy-number",
  "/api/asp/domain/register",
])

// Default input schema for all our REST endpoints: POST + JSON body.
// Callers can override to declare required fields — the buyer's CLI reads this
// and knows to POST JSON instead of probing with the default GET.
function defaultInput(bodySchema?: unknown): EndpointInputSchema {
  return {
    type: "http",
    method: "POST",
    bodyType: "json",
    body: bodySchema ?? { type: "object" },
  }
}

function endpointInfo(path: string, description: string, price?: string, input?: EndpointInputSchema) {
  const url = `${APP_URL}${path}`
  const isProvisioning = PROVISIONING_PATHS.has(path)

  const provisioningBadge = isProvisioning
    ? {
        startHere: true,
        note: "This is an ENTRY-POINT endpoint. Call it first if you have never used AgentOS. It returns an accessToken (at_...) that authenticates every subsequent AgentOS call — free or paid, across email / phone / domain.",
      }
    : undefined

  return NextResponse.json({
    endpoint: url,
    method: "POST",
    description,
    ...(price
      ? { price, payment: "x402 v2 — include PAYMENT-SIGNATURE header (USDT0 on X Layer eip155:196)" }
      : { auth: "Authorization: Bearer <at_...> token issued by a provisioning endpoint (mailbox/create, phone/buy-number, or domain/register)" }),
    inputSchema: input,
    ...(provisioningBadge ? { provisioning: provisioningBadge } : {}),
    hint: {
      why: "This endpoint only accepts POST requests with a JSON body.",
      how: isProvisioning
        ? `You do NOT need an accessToken to call this — it is how you get one. Send POST with Content-Type: application/json plus your x402 PAYMENT-SIGNATURE. If you hit this endpoint without payment first, you will receive a 402 challenge; sign it with your wallet and replay. On success you will receive {accessToken, ...} — save it and use it as Authorization: Bearer <accessToken> on every subsequent call.`
        : price
          ? `You need an accessToken from a provisioning endpoint (mailbox/create, phone/buy-number, or domain/register) BEFORE you can use this endpoint. Once you have one, send POST with Content-Type: application/json, Authorization: Bearer <accessToken>, AND the x402 PAYMENT-SIGNATURE header for this specific call.`
          : `You need an accessToken from a provisioning endpoint (mailbox/create, phone/buy-number, or domain/register) BEFORE you can use this endpoint. Once you have one, send POST with Content-Type: application/json and Authorization: Bearer <accessToken>.`,
      example: isProvisioning
        ? `curl -X POST ${url} -H "Content-Type: application/json" -H "PAYMENT-SIGNATURE: <base64>" -d '{"name":"my-agent"}'`
        : `curl -X POST ${url} -H "Content-Type: application/json" -H "Authorization: Bearer at_..." -d '{}'`,
      manifest: `${APP_URL}/api/asp`,
      agentGuide: `${APP_URL}/api/asp/agent-guide`,
    },
  })
}

export function createPaidRoute(
  path: string,
  price: string,
  description: string,
  handler: PaidHandler,
  opts?: { bodySchema?: unknown }
) {
  const input = defaultInput(opts?.bodySchema)

  async function POST(req: NextRequest) {
    const payment = await requirePayment(req, {
      price,
      description,
      resource: `${APP_URL}${path}`,
      input,
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
    return endpointInfo(path, description, price, input)
  }

  return { POST, GET }
}

export function createFreeRoute(
  path: string,
  description: string,
  handler: Handler,
  opts?: { bodySchema?: unknown }
) {
  const input = defaultInput(opts?.bodySchema)

  async function POST(req: NextRequest) {
    return handler(req)
  }

  function GET() {
    return endpointInfo(path, description, undefined, input)
  }

  return { POST, GET }
}
