import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { validateApiKey, getOrCreateDemoUser } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await ((await validateApiKey(request)) ?? getOrCreateDemoUser())

  const { data: email } = await supabase
    .from("Email")
    .select("*, agent:Agent(*)")
    .eq("id", id)
    .maybeSingle()

  if (!email) return NextResponse.json({ error: "Email not found" }, { status: 404 })

  if (!email.isRead) {
    await supabase.from("Email").update({ isRead: true }).eq("id", id)
  }

  return NextResponse.json({ email })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const { data: email } = await supabase
    .from("Email")
    .update({ isRead: body.isRead })
    .eq("id", id)
    .select()
    .single()

  return NextResponse.json({ email })
}
