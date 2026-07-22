import { NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "@/lib/auth"
import { unauthorizedError } from "@/lib/asp-hints"
import { listNumbers } from "@/lib/phone-service"
import { createFreeRoute } from "@/lib/asp-route"

export const { POST, GET } = createFreeRoute(
  "/api/asp/phone/numbers",
  "List all phone numbers owned by the authenticated tenant",
  async (req: NextRequest) => {
    const user = await getRequestUser(req)
    if (!user) return unauthorizedError("phone")

    const numbers = await listNumbers(user.id)
    return NextResponse.json({
      numbers: numbers.map(n => ({ ...n, phoneNumberId: n.id })),
      hint: numbers.length === 0
        ? { status: "You don't own any numbers yet.", next: "POST /api/asp/phone/buy-number with {country: 'US'} — costs $1.00 USDT0 via x402." }
        : { next: "Use phoneNumberId in start-call, release-number, and inbound webhook mapping." },
    })
  }
)
