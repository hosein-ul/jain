import { NextRequest, NextResponse } from "next/server"
import { getUserFromOkxHeader } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createFreeRoute } from "@/lib/asp-route"
import { safeJson } from "@/lib/asp-hints"

export const POST = createFreeRoute(async (req: NextRequest) => {
  const user = await getUserFromOkxHeader(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await safeJson(req)
  const { name, subject, bodyText, html } = body

  if (!name || !subject || !bodyText) {
    return NextResponse.json({ error: "name, subject, and bodyText are required" }, { status: 400 })
  }

  const { data: template, error } = await supabase
    .from("EmailTemplate")
    .insert({ name, subject, body: bodyText, html: html ?? null, userId: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ template }, { status: 201 })
})
