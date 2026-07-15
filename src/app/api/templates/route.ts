import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateDemoUser } from "@/lib/auth"

export async function GET() {
  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ templates: [] })

  const { data: templates } = await supabase
    .from("EmailTemplate")
    .select("*")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })

  return NextResponse.json({ templates: templates ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  if (!body.name || !body.subject || !body.body) {
    return NextResponse.json({ error: "name, subject, and body are required" }, { status: 400 })
  }

  const { data: template } = await supabase
    .from("EmailTemplate")
    .insert({ name: body.name, subject: body.subject, body: body.body, userId: user.id })
    .select()
    .single()

  return NextResponse.json({ template }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await supabase.from("EmailTemplate").delete().eq("id", id)
  return NextResponse.json({ deleted: true })
}
