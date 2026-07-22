import { NextRequest, NextResponse } from "next/server"
import { getRequestUser } from "@/lib/auth"
import { getTranscript } from "@/lib/phone-service"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute(
  "/api/asp/phone/calls/transcript",
  "Get the STT transcript of a completed call (if the provider delivered one via webhook).",
  async (req: NextRequest) => {
    const user = await getRequestUser(req)
    if (!user) return unauthorizedError("phone")

    const { callId } = await safeJson(req)
    if (!callId) return missingFieldError("callId")

    const transcript = await getTranscript(user.id, callId)
    if (!transcript) return notFoundError("transcript", "No transcript exists yet — the call may still be in progress, or the provider hasn't posted one.")

    let segments: unknown = null
    try { segments = transcript.segments ? JSON.parse(transcript.segments) : null } catch { /* keep null */ }
    return NextResponse.json({ transcript: { ...transcript, segments } })
  }
)
