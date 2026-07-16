import { NextRequest, NextResponse } from "next/server"
import { verifyWebhook, getReceivedEmail } from "@/lib/resend"
import { receiveEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  const payload = await request.text()

  // Verify the webhook came from Resend using Svix signature headers.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    try {
      verifyWebhook(
        payload,
        {
          id: request.headers.get("svix-id"),
          timestamp: request.headers.get("svix-timestamp"),
          signature: request.headers.get("svix-signature"),
        },
        secret
      )
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }
  }

  let event: { type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  // Only handle inbound email events.
  if (event.type !== "email.received") {
    return NextResponse.json({ skipped: true })
  }

  const emailId = event.data.email_id as string | undefined
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id in payload" }, { status: 400 })
  }

  // Resend delivers only metadata in the webhook; fetch full body separately.
  const received = await getReceivedEmail(emailId)

  const toAddress = Array.isArray(received.to) ? received.to[0] : received.to
  if (!toAddress) {
    return NextResponse.json({ error: "No recipient address in received email" }, { status: 400 })
  }

  // Strip display name if present ("Name <addr>" → "addr").
  const cleanTo = toAddress.includes("<")
    ? (toAddress.match(/<(.+?)>/)?.[1] ?? toAddress)
    : toAddress

  const email = await receiveEmail(
    cleanTo,
    received.from,
    received.subject ?? "(no subject)",
    received.text ?? "",
    received.html ?? undefined
  )

  return NextResponse.json({ received: true, emailId: email.id })
}
