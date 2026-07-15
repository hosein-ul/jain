import { NextRequest, NextResponse } from "next/server"
import { receiveEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""

  let from: string, to: string, subject: string, text: string, html: string | undefined

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData()
    from = formData.get("from") as string
    to = formData.get("to") as string
    subject = formData.get("subject") as string
    text = formData.get("text") as string
    html = (formData.get("html") as string) || undefined
  } else {
    const body = await request.json()
    from = body.from
    to = body.to
    subject = body.subject
    text = body.text || body.body
    html = body.html
  }

  if (!from || !to || !subject) {
    return NextResponse.json({ error: "from, to, subject required" }, { status: 400 })
  }

  const toAddress = to.includes("<") ? to.match(/<(.+?)>/)?.[1] || to : to

  const email = await receiveEmail(toAddress, from, subject, text || "", html)
  return NextResponse.json({ received: true, emailId: email.id })
}
