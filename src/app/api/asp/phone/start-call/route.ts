import { NextRequest, NextResponse } from "next/server"
import { startCall } from "@/lib/phone-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/phone/start-call",
  "$0.05",
  "Place an outbound call from one of your numbers. Provide a webhookUrl or twiml to control the call script.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("phone")

    const body = await safeJson(req)
    const { phoneNumberId, to, webhookUrl, twiml } = body as {
      phoneNumberId?: string; to?: string; webhookUrl?: string; twiml?: string
    }
    if (!phoneNumberId) return missingFieldError("phoneNumberId")
    if (!to) return missingFieldError("to")

    const call = await startCall(user.id, { phoneNumberId, to, webhookUrl, twiml })
    if (!call) return notFoundError("phoneNumber", "The phoneNumberId isn't yours or doesn't exist.")

    return NextResponse.json({
      call: { ...call, callId: call.id },
      hint: {
        next: [
          "POST /api/asp/phone/calls/get with {callId} — poll for status changes",
          "POST /api/asp/phone/end-call with {callId} — hang up",
        ],
      },
    }, { status: 201 })
  }
)
