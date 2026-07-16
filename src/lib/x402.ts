import { NextRequest, NextResponse } from "next/server"
import { x402ResourceServer } from "@okxweb3/x402-core/server"
import { OKXFacilitatorClient } from "@okxweb3/x402-core"
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server"
import type { PaymentPayload, PaymentRequirements } from "@okxweb3/x402-core/types"

// X Layer Mainnet = eip155:196 | Testnet = eip155:1952
const NETWORK = (process.env.OKX_TESTNET === "true" ? "eip155:1952" : "eip155:196") as Parameters<InstanceType<typeof x402ResourceServer>["register"]>[0]
const PAY_TO = process.env.PAYMENT_WALLET ?? ""

let _server: InstanceType<typeof x402ResourceServer> | null = null
let _initialized = false

async function getServer(): Promise<InstanceType<typeof x402ResourceServer> | null> {
  const key = process.env.OKX_API_KEY
  const secret = process.env.OKX_SECRET_KEY
  const passphrase = process.env.OKX_PASSPHRASE

  if (!key || !secret || !passphrase || !PAY_TO) return null

  if (_server && _initialized) return _server

  const facilitator = new OKXFacilitatorClient({ apiKey: key, secretKey: secret, passphrase })
  _server = new x402ResourceServer(facilitator)
  _server.register(NETWORK, new ExactEvmScheme())
  await _server.initialize()
  _initialized = true

  return _server
}

// x402 v2: buyer replays with `PAYMENT-SIGNATURE`. `X-PAYMENT` is the legacy v1 header.
function readPaymentHeader(request: NextRequest): string | null {
  return request.headers.get("payment-signature") ?? request.headers.get("x-payment")
}

function decodePaymentHeader(header: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8")) as PaymentPayload
  } catch {
    return null
  }
}

export interface PaymentConfig {
  price: string        // e.g. "$0.05" (USD-denominated; SDK converts to USDT0 atomic units)
  description: string
  resource: string     // full URL of this endpoint
}

export type PaymentResult =
  | { status: "free" }                                   // payment disabled / dev mode → proceed
  | { status: "required"; response: NextResponse }       // 402 — caller returns this
  | { status: "paid"; settlementHeader?: string; payer?: string }  // verified + settled → proceed

// Enforce x402 payment for a paid endpoint.
export async function requirePayment(
  request: NextRequest,
  config: PaymentConfig
): Promise<PaymentResult> {
  if (process.env.PAYMENT_REQUIRED !== "true") return { status: "free" }

  const server = await getServer()
  if (!server) return { status: "free" }  // SDK not configured — dev mode, skip payment

  const resourceInfo = { url: config.resource, description: config.description }

  const requirements = await server.buildPaymentRequirementsFromOptions(
    [
      {
        scheme: "exact",
        network: NETWORK,
        payTo: PAY_TO,
        price: config.price,
      },
    ],
    null
  )

  const paymentHeader = readPaymentHeader(request)

  // No payment → issue the v2 challenge in the PAYMENT-REQUIRED header (base64 JSON).
  if (!paymentHeader) {
    const body = await server.createPaymentRequiredResponse(requirements, resourceInfo, "Payment required")
    const encoded = Buffer.from(JSON.stringify(body)).toString("base64")
    return {
      status: "required",
      response: NextResponse.json(body, {
        status: 402,
        headers: { "PAYMENT-REQUIRED": encoded },
      }),
    }
  }

  const payload = decodePaymentHeader(paymentHeader)
  if (!payload) {
    return {
      status: "required",
      response: NextResponse.json({ error: "Invalid payment header encoding" }, { status: 402 }),
    }
  }

  const matched: PaymentRequirements | undefined = server.findMatchingRequirements(requirements, payload)
  if (!matched) {
    return {
      status: "required",
      response: NextResponse.json({ error: "Payment does not match requirements" }, { status: 402 }),
    }
  }

  try {
    const verification = await server.verifyPayment(payload, matched)
    if (!verification.isValid) {
      return {
        status: "required",
        response: NextResponse.json(
          { error: "Invalid payment", reason: verification.invalidReason },
          { status: 402 }
        ),
      }
    }

    // Settle, then hand back the result so the route can emit PAYMENT-RESPONSE on the 200.
    const settlement = await server.settlePayment(payload, matched)
    const settlementHeader = Buffer.from(JSON.stringify(settlement)).toString("base64")
    const payer = (settlement as { payer?: string }).payer ?? (verification as { payer?: string }).payer
    return { status: "paid", settlementHeader, payer }
  } catch (err) {
    console.error("[x402] Verification/settlement error:", err)
    return {
      status: "required",
      response: NextResponse.json({ error: "Payment verification failed" }, { status: 402 }),
    }
  }
}
