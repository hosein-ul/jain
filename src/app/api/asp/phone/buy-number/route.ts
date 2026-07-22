import { NextRequest, NextResponse } from "next/server"
import { issueAccessToken } from "@/lib/auth"
import { buyNumber, searchAvailableNumbers } from "@/lib/phone-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, provisioningResponse } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/phone/buy-number",
  "$1.00",
  "Buy a real phone number for an agent. Provide either an exact e164 number or a country (+optional areaCode) to auto-select the first available match.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("phone")

    const body = await safeJson(req)
    const { e164, country, areaCode, webhookUrl } = body as {
      e164?: string; country?: string; areaCode?: string; webhookUrl?: string
    }

    let numberToBuy = e164
    if (!numberToBuy) {
      if (!country) {
        return NextResponse.json({
          error: "Provide either e164 or {country, areaCode?}",
          hint: {
            why: "Without an exact number OR a country hint, we can't pick anything to buy.",
            next: "Retry with {country: \"US\"} (ISO alpha-2) to auto-pick the first available number, or with {e164: \"+14155551234\"} if you already know which one you want.",
            example: `curl -X POST <endpoint> -H "PAYMENT-SIGNATURE: <b64>" -d '{"country":"US","areaCode":"415"}'`,
          },
        }, { status: 400 })
      }
      const avail = await searchAvailableNumbers({ country, areaCode, limit: 1 })
      if (!avail[0]) return NextResponse.json({
        error: "No available numbers matched",
        hint: { next: "Try a different areaCode, or omit it to broaden the search." },
      }, { status: 404 })
      numberToBuy = avail[0].e164
    }

    const phoneNumber = await buyNumber(user.id, { e164: numberToBuy, webhookUrl })
    const accessToken = await issueAccessToken(user.id)

    return provisioningResponse({
      service: "phone",
      resource: { ...phoneNumber, phoneNumberId: phoneNumber.id },
      resourceIdField: "phoneNumberId",
      resourceIdValue: phoneNumber.id,
      humanIdentifier: phoneNumber.e164,
      accessToken,
      recommendedNext: [
        "POST /api/asp/phone/numbers with {} — list your numbers (free)",
        "POST /api/asp/phone/start-call with {phoneNumberId, to} — outbound call ($0.05)",
        "POST /api/asp/phone/calls/get with {callId} — poll call state (free)",
      ],
    })
  }
)
