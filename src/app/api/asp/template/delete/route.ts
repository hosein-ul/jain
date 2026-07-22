import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/template/delete", "Delete a saved email template by ID", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return unauthorizedError("email")

  const body = await safeJson(req)
  const { templateId } = body

  if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 })

  const { error } = await supabase
    .from("EmailTemplate")
    .delete()
    .eq("id", templateId)
    .eq("userId", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
})
