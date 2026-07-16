import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { cancelScheduled } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"

export const POST = createPaidRoute(
  "/api/asp/email/cancel-scheduled",
  "$0.005",
  "Cancel a previously scheduled email before it is sent",
  async (req: NextRequest) => {
    const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { emailId } = body

    if (!emailId) return NextResponse.json({ error: "emailId is required" }, { status: 400 })

    const email = await cancelScheduled(emailId)
    return NextResponse.json({ email })
  }
)
