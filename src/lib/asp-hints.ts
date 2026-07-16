import { NextRequest, NextResponse } from "next/server"

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
