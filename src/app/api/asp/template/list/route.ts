import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"
import { unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createFreeRoute("/api/asp/template/list", "List all saved email templates owned by the authenticated user", async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return unauthorizedError("email")

  const { data: templates } = await supabase
    .from("EmailTemplate")
    .select("id, name, subject, createdAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })

  return NextResponse.json({ templates: templates ?? [] })
})
