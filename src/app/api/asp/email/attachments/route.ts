import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"
import { missingFieldError, safeJson, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/email/attachments", "List attachments for an email; set includeContent:true to get base64 file data", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return unauthorizedError("email")

  const body = await safeJson(req)
  const { emailId, includeContent = false } = body

  if (!emailId) return missingFieldError("emailId")

  const select = includeContent
    ? "id, emailId, filename, contentType, size, content"
    : "id, emailId, filename, contentType, size"

  const { data: attachments } = await supabase
    .from("Attachment")
    .select(select)
    .eq("emailId", emailId)

  return NextResponse.json({ attachments: attachments ?? [], count: attachments?.length ?? 0 })
})
