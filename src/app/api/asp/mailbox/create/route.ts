import { NextRequest } from "next/server"
import { issueAccessToken } from "@/lib/auth"
import { createAgent } from "@/lib/email-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, unauthorizedError, missingFieldError, provisioningResponse } from "@/lib/asp-hints"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "zerolayer.online"

export const { POST, GET } = createPaidRoute(
  "/api/asp/mailbox/create",
  "$0.25",
  `Create a new agent mailbox with a unique @${EMAIL_DOMAIN} email address`,
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("email")

    const body = await safeJson(req)
    const { name, displayName, webhookUrl, signature } = body
    if (!name) return missingFieldError("name", "Pass a short label. It becomes the local-part of the email, e.g. \"trading-bot\" → trading-bot@" + EMAIL_DOMAIN + ".")

    const agent = await createAgent(user.id, name, { displayName, webhookUrl, signature })
    const accessToken = await issueAccessToken(user.id)

    return provisioningResponse({
      service: "email",
      resource: { ...agent, agentId: agent.id },
      resourceIdField: "agentId",
      resourceIdValue: agent.id,
      humanIdentifier: agent.emailAddress,
      accessToken,
      recommendedNext: [
        "POST /api/asp/inbox/get with {agentId} — read incoming emails (free)",
        "POST /api/asp/email/send with {agentId, to, subject, body} — send an email ($0.02)",
        "POST /api/asp/mailbox/update with {agentId, webhookUrl} — enable real-time push for inbound mail ($0.005)",
      ],
    })
  }
)
