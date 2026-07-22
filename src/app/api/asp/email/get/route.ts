import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"
import { missingFieldError, safeJson, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/email/get", "Fetch a single email by ID including its attachments", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return unauthorizedError("email")

  const body = await safeJson(req)
  const { emailId } = body

  if (!emailId) return missingFieldError("emailId")

  const { data: email } = await supabase
    .from("Email")
    .select("*, attachments:Attachment(*), agent:Agent!inner(userId)")
    .eq("id", emailId)
    .eq("agent.userId", user.id)
    .maybeSingle()

  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  return NextResponse.json({
    email,
    hint: {
      next: `This email belongs to thread '${email.threadId ?? "(none)"}'. Use it to see the full conversation.`,
      recommended: [
        "POST /api/asp/email/reply with {emailId, body} — reply in the same thread",
        "POST /api/asp/email/forward with {emailId, to} — forward to another recipient",
        "POST /api/asp/thread/get with {threadId} — see full conversation",
        "POST /api/asp/email/attachments with {emailId, includeContent:true} — download attachments",
      ],
    },
  })
})
