import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateApiKey, getOrCreateDemoUser } from "@/lib/auth"

export async function GET() {
  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ keys: [] })

  const { data: keys } = await supabase
    .from("ApiKey")
    .select("id, key, name, isActive, lastUsed, createdAt")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await getOrCreateDemoUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const key = generateApiKey()

  const { data: apiKey } = await supabase
    .from("ApiKey")
    .insert({ key, name: body.name || "Default Key", userId: user.id })
    .select()
    .single()

  return NextResponse.json({ apiKey }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await supabase.from("ApiKey").update({ isActive: false }).eq("id", id)
  return NextResponse.json({ revoked: true })
}
