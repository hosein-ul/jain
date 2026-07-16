import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = (await validateApiKey(req)) ?? (await getOrCreateDemoUser())
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: templates } = await supabase
    .from("EmailTemplate")
    .select("id, name, subject, createdAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })

  return NextResponse.json({ templates: templates ?? [] })
})
