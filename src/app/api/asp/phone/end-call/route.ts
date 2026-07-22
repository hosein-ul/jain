import { NextRequest, NextResponse } from "next/server"
import { endCall } from "@/lib/phone-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/phone/end-call",
  "$0.005",
  "Hang up an active call.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("phone")

    const { callId } = await safeJson(req)
    if (!callId) return missingFieldError("callId")

    const call = await endCall(user.id, callId)
    if (!call) return notFoundError("call", "The callId is unknown or does not belong to your tenant.")
    return NextResponse.json({ call: { ...call, callId: call.id } })
  }
)
