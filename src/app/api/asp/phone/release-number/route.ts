import { NextRequest, NextResponse } from "next/server"
import { releaseNumber } from "@/lib/phone-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/phone/release-number",
  "$0.005",
  "Release a phone number back to the provider. Irreversible.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("phone")

    const { phoneNumberId } = await safeJson(req)
    if (!phoneNumberId) return missingFieldError("phoneNumberId")

    const result = await releaseNumber(user.id, phoneNumberId)
    if (!result) return notFoundError("phoneNumber", "POST /api/asp/phone/numbers to list ids you own.")
    return NextResponse.json({ ...result, hint: { next: "The number is released — it may take up to 24h to disappear from lists." } })
  }
)
