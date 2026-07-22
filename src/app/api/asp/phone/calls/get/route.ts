import { NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "@/lib/auth"
import { getCall } from "@/lib/phone-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute(
  "/api/asp/phone/calls/get",
  "Get a call by id, including status, direction, duration, and recording URL if available.",
  async (req: NextRequest) => {
    const user = await getRequestUser(req)
    if (!user) return unauthorizedError("phone")

    const { callId } = await safeJson(req)
    if (!callId) return missingFieldError("callId")

    const call = await getCall(user.id, callId)
    if (!call) return notFoundError("call", "No call by that id exists under your tenant.")

    return NextResponse.json({
      call: { ...call, callId: call.id },
      hint: call.status === "completed"
        ? { next: "POST /api/asp/phone/calls/transcript with {callId} — fetch STT output (if provider delivered it)." }
        : { next: "Call is still active — poll again shortly, or POST /api/asp/phone/end-call." },
    })
  }
)
