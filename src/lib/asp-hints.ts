import { NextRequest, NextResponse } from "next/server"
import { getOrCreateUserByWallet, getRequestUser } from "./auth"

// Resolve the calling agent's identity for a PAID endpoint.
// Priority: (1) wallet from verified x402 payment proof, (2) session token / dev headers.
export async function resolvePaidUser(req: NextRequest, payer: string | undefined) {
  if (payer) {
    const user = await getOrCreateUserByWallet(payer)
    if (user) return user
  }
  return getRequestUser(req)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson(req: NextRequest): Promise<any> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export function missingFieldError(field: string, guidance?: string) {
  return NextResponse.json({
    error: `${field} is required`,
    hint: {
      why: `This endpoint operates on a specific resource identified by '${field}'.`,
      next: guidance ?? "See GET /api/asp for the full input schema of every service.",
    },
  }, { status: 400 })
}

export function notFoundError(resource: string, guidance: string) {
  return NextResponse.json({
    error: `${resource} not found`,
    hint: {
      why: `No ${resource} with this id exists under your identity.`,
      next: guidance,
    },
  }, { status: 404 })
}
