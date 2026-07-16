import { NextResponse } from "next/server"

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "zerolayer.online"
const BASE = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://zerolayer.online"

// Shared schema fragments
const EMAIL_OBJECT = {
  type: "object",
  properties: {
    id: { type: "string" },
    agentId: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    subject: { type: "string" },
    body: { type: "string" },
    html: { type: "string" },
    direction: { type: "string", enum: ["inbound", "outbound"] },
    threadId: { type: "string" },
    isRead: { type: "boolean" },
    isArchived: { type: "boolean" },
    status: { type: "string", enum: ["sent", "scheduled", "cancelled"] },
    createdAt: { type: "string", format: "date-time" },
    scheduledFor: { type: "string", format: "date-time" },
  },
}

const MAILBOX_OBJECT = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    emailAddress: { type: "string" },
    displayName: { type: "string" },
    webhookUrl: { type: "string" },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
}

const SEND_RESULT = {
  type: "object",
  properties: {
    email: EMAIL_OBJECT,
    deliveryResult: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        messageId: { type: "string" },
      },
    },
  },
}

const SERVICES = [
  // ── FREE ──────────────────────────────────────────────────────────
  {
    name: "list_mailboxes",
    endpoint: `${BASE}/api/asp/mailbox/list`,
    price: "free",
    description: "List all agent mailboxes owned by the authenticated user",
    input: { type: "object", properties: {} },
    output: {
      type: "object",
      properties: { mailboxes: { type: "array", items: MAILBOX_OBJECT } },
    },
  },
  {
    name: "get_inbox",
    endpoint: `${BASE}/api/asp/inbox/get`,
    price: "free",
    description: "Fetch an agent's inbox with optional filtering (unread, sender, date, direction)",
    input: {
      type: "object",
      required: ["agentId"],
      properties: {
        agentId: { type: "string" },
        limit: { type: "number", default: 50 },
        offset: { type: "number", default: 0 },
        filter: {
          type: "object",
          properties: {
            unread: { type: "boolean" },
            from: { type: "string" },
            subject: { type: "string" },
            dateFrom: { type: "string", format: "date-time" },
            dateTo: { type: "string", format: "date-time" },
            hasAttachment: { type: "boolean" },
            direction: { type: "string", enum: ["inbound", "outbound", "all"] },
          },
        },
      },
    },
    output: {
      type: "object",
      properties: {
        emails: { type: "array", items: EMAIL_OBJECT },
        count: { type: "number" },
      },
    },
  },
  {
    name: "get_email",
    endpoint: `${BASE}/api/asp/email/get`,
    price: "free",
    description: "Fetch a single email by ID including its attachments",
    input: { type: "object", required: ["emailId"], properties: { emailId: { type: "string" } } },
    output: {
      type: "object",
      properties: {
        email: {
          ...EMAIL_OBJECT,
          properties: {
            ...EMAIL_OBJECT.properties,
            attachments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  filename: { type: "string" },
                  contentType: { type: "string" },
                  size: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
  },
  {
    name: "get_thread",
    endpoint: `${BASE}/api/asp/thread/get`,
    price: "free",
    description: "Fetch all emails in a conversation thread in chronological order",
    input: { type: "object", required: ["threadId"], properties: { threadId: { type: "string" } } },
    output: {
      type: "object",
      properties: { emails: { type: "array", items: EMAIL_OBJECT } },
    },
  },
  {
    name: "mark_read",
    endpoint: `${BASE}/api/asp/email/mark-read`,
    price: "free",
    description: "Mark an email as read",
    input: { type: "object", required: ["emailId"], properties: { emailId: { type: "string" } } },
    output: { type: "object", properties: { email: EMAIL_OBJECT } },
  },
  {
    name: "mark_unread",
    endpoint: `${BASE}/api/asp/email/mark-unread`,
    price: "free",
    description: "Mark an email as unread",
    input: { type: "object", required: ["emailId"], properties: { emailId: { type: "string" } } },
    output: { type: "object", properties: { email: EMAIL_OBJECT } },
  },
  {
    name: "archive_email",
    endpoint: `${BASE}/api/asp/email/archive`,
    price: "free",
    description: "Archive an email so it no longer appears in the primary inbox",
    input: { type: "object", required: ["emailId"], properties: { emailId: { type: "string" } } },
    output: { type: "object", properties: { email: EMAIL_OBJECT } },
  },
  {
    name: "delete_email",
    endpoint: `${BASE}/api/asp/email/delete`,
    price: "free",
    description: "Permanently delete an email and all its attachments",
    input: { type: "object", required: ["emailId"], properties: { emailId: { type: "string" } } },
    output: { type: "object", properties: { deleted: { type: "boolean" } } },
  },
  {
    name: "list_attachments",
    endpoint: `${BASE}/api/asp/email/attachments`,
    price: "free",
    description: "List attachments for an email; set includeContent:true to get base64 file data",
    input: {
      type: "object",
      required: ["emailId"],
      properties: {
        emailId: { type: "string" },
        includeContent: { type: "boolean", default: false },
      },
    },
    output: {
      type: "object",
      properties: {
        attachments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              filename: { type: "string" },
              contentType: { type: "string" },
              size: { type: "number" },
              content: { type: "string", description: "Base64-encoded file data (only if includeContent:true)" },
            },
          },
        },
      },
    },
  },

  // ── PAID ─────────────────────────────────────────────────────────
  {
    name: "create_mailbox",
    endpoint: `${BASE}/api/asp/mailbox/create`,
    price: "$0.25",
    description: `Create a new agent mailbox with a dedicated @${EMAIL_DOMAIN} email address. Set webhookUrl to receive instant push notifications when email arrives.`,
    input: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Becomes the local part of the email address (e.g. 'trading-bot' → trading-bot@domain)" },
        displayName: { type: "string" },
        webhookUrl: { type: "string", format: "uri", description: "URL to POST email.received events to. Requests are signed with X-AgentMail-Signature (sha256=...)" },
        signature: { type: "string", description: "Auto-appended to every outbound email body" },
      },
    },
    output: { type: "object", properties: { mailbox: MAILBOX_OBJECT } },
  },
  {
    name: "update_mailbox",
    endpoint: `${BASE}/api/asp/mailbox/update`,
    price: "$0.005",
    description: "Update mailbox settings: display name, signature, auto-reply, webhook, or active status",
    input: {
      type: "object",
      required: ["agentId"],
      properties: {
        agentId: { type: "string" },
        displayName: { type: "string" },
        signature: { type: "string" },
        autoReply: { type: "string", description: "Auto-reply message body (sent automatically to every inbound email)" },
        autoReplyActive: { type: "boolean" },
        webhookUrl: { type: "string", format: "uri" },
        isActive: { type: "boolean" },
      },
    },
    output: { type: "object", properties: { mailbox: MAILBOX_OBJECT } },
  },
  {
    name: "delete_mailbox",
    endpoint: `${BASE}/api/asp/mailbox/delete`,
    price: "$0.005",
    description: "Permanently delete an agent mailbox and all its emails",
    input: {
      type: "object",
      required: ["agentId"],
      properties: { agentId: { type: "string" } },
    },
    output: { type: "object", properties: { deleted: { type: "boolean" } } },
  },
  {
    name: "send_email",
    endpoint: `${BASE}/api/asp/email/send`,
    price: "$0.02",
    description: "Send an email from an agent mailbox to any recipient. Supports CC, BCC, HTML, attachments, and scheduled delivery.",
    input: {
      type: "object",
      required: ["agentId", "to", "subject", "body"],
      properties: {
        agentId: { type: "string" },
        to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        subject: { type: "string" },
        body: { type: "string", description: "Plain-text body" },
        html: { type: "string", description: "HTML body (overrides plain-text in email clients that support it)" },
        cc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        bcc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        replyTo: { type: "string" },
        trackOpens: { type: "boolean" },
        trackClicks: { type: "boolean" },
        scheduledAt: { type: "string", format: "date-time", description: "ISO 8601 datetime; must be within 72 hours" },
        threadId: { type: "string", description: "Link this email to an existing conversation thread" },
      },
    },
    output: SEND_RESULT,
  },
  {
    name: "reply",
    endpoint: `${BASE}/api/asp/email/reply`,
    price: "$0.01",
    description: "Reply to an email, automatically preserving the thread and In-Reply-To headers",
    input: {
      type: "object",
      required: ["emailId", "body"],
      properties: {
        emailId: { type: "string" },
        body: { type: "string" },
        html: { type: "string" },
        cc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
      },
    },
    output: SEND_RESULT,
  },
  {
    name: "reply_all",
    endpoint: `${BASE}/api/asp/email/reply-all`,
    price: "$0.01",
    description: "Reply to all original recipients of an email thread",
    input: {
      type: "object",
      required: ["emailId", "body"],
      properties: {
        emailId: { type: "string" },
        body: { type: "string" },
        html: { type: "string" },
      },
    },
    output: SEND_RESULT,
  },
  {
    name: "forward",
    endpoint: `${BASE}/api/asp/email/forward`,
    price: "$0.01",
    description: "Forward an email to new recipients, including all original attachments",
    input: {
      type: "object",
      required: ["emailId", "to"],
      properties: {
        emailId: { type: "string" },
        to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        note: { type: "string", description: "Optional message prepended before the forwarded content" },
      },
    },
    output: SEND_RESULT,
  },
  {
    name: "cancel_scheduled",
    endpoint: `${BASE}/api/asp/email/cancel-scheduled`,
    price: "$0.005",
    description: "Cancel a scheduled email before it is sent",
    input: {
      type: "object",
      required: ["emailId"],
      properties: { emailId: { type: "string" } },
    },
    output: { type: "object", properties: { email: EMAIL_OBJECT } },
  },
  {
    name: "search_emails",
    endpoint: `${BASE}/api/asp/email/search`,
    price: "$0.005",
    description: "Full-text search across an agent's emails by subject, body, or sender address",
    input: {
      type: "object",
      required: ["agentId", "query"],
      properties: {
        agentId: { type: "string" },
        query: { type: "string" },
        limit: { type: "number", default: 20 },
      },
    },
    output: {
      type: "object",
      properties: {
        emails: { type: "array", items: EMAIL_OBJECT },
        count: { type: "number" },
      },
    },
  },
  {
    name: "send_template",
    endpoint: `${BASE}/api/asp/template/send`,
    price: "$0.02",
    description: "Send an email using a saved template with {{variable}} substitution",
    input: {
      type: "object",
      required: ["agentId", "templateId", "to"],
      properties: {
        agentId: { type: "string" },
        templateId: { type: "string" },
        to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        variables: { type: "object", additionalProperties: { type: "string" }, description: "Values for {{variable}} placeholders in the template" },
        cc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        bcc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
      },
    },
    output: SEND_RESULT,
  },
  {
    name: "send_bulk",
    endpoint: `${BASE}/api/asp/template/send-bulk`,
    price: "$0.05",
    description: "Send a template to multiple recipients, each with their own variable set",
    input: {
      type: "object",
      required: ["agentId", "templateId", "recipients"],
      properties: {
        agentId: { type: "string" },
        templateId: { type: "string" },
        recipients: {
          type: "array",
          items: {
            type: "object",
            required: ["to"],
            properties: {
              to: { type: "string" },
              variables: { type: "object", additionalProperties: { type: "string" } },
            },
          },
        },
      },
    },
    output: {
      type: "object",
      properties: {
        total: { type: "number" },
        sent: { type: "number" },
        failed: { type: "number" },
      },
    },
  },
  {
    name: "create_template",
    endpoint: `${BASE}/api/asp/template/create`,
    price: "free",
    description: "Create a reusable email template with {{variable}} placeholders",
    input: {
      type: "object",
      required: ["name", "subject", "bodyText"],
      properties: {
        name: { type: "string", description: "Internal label for this template" },
        subject: { type: "string", description: "Email subject; supports {{variable}} placeholders" },
        bodyText: { type: "string", description: "Plain-text body; supports {{variable}} placeholders" },
        html: { type: "string", description: "Optional HTML body; supports {{variable}} placeholders" },
      },
    },
    output: {
      type: "object",
      properties: {
        template: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            subject: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  {
    name: "list_templates",
    endpoint: `${BASE}/api/asp/template/list`,
    price: "free",
    description: "List all saved email templates owned by the authenticated user",
    input: { type: "object", properties: {} },
    output: {
      type: "object",
      properties: {
        templates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              subject: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  },
  {
    name: "delete_template",
    endpoint: `${BASE}/api/asp/template/delete`,
    price: "free",
    description: "Delete a saved email template by ID",
    input: {
      type: "object",
      required: ["templateId"],
      properties: { templateId: { type: "string" } },
    },
    output: { type: "object", properties: { deleted: { type: "boolean" } } },
  },
]

export function GET() {
  return NextResponse.json({
    name: "AgentMail",
    version: "1.0.0",
    description: `AI-native communication platform for agents — currently providing Email (send, receive, thread, search via @${EMAIL_DOMAIN} mailboxes) with Voice capabilities planned for a future release.`,
    documentation: `${BASE}/docs`,
    identity: {
      paid: "Paid endpoints identify the caller by wallet address extracted from the verified x402 PAYMENT-SIGNATURE. No API key needed.",
      free: "Free endpoints identify the caller by the same wallet-derived identity, established the first time a paid endpoint is called (typically mailbox/create). Pass X-OKX-Agent-ID: <your-okx-agent-id> as a temporary identifier during development.",
    },
    paymentProtocol: "x402 v2 (USDT0 on X Layer / eip155:196)",
    webhookSecurity: "Inbound email events are signed with X-AgentMail-Signature: sha256=<hmac>. Verify using WEBHOOK_SECRET from your mailbox setup.",
    getStarted: {
      step1: `POST ${BASE}/api/asp/mailbox/create with {name} — costs $0.25 in USDT0 via x402. Response contains mailbox.agentId and mailbox.emailAddress.`,
      step2: "Save mailbox.agentId — you'll pass it as 'agentId' in every subsequent call (send_email, get_inbox, search_emails, update_mailbox, delete_mailbox).",
      step3: `Configure a webhook to receive inbound email in real time: POST ${BASE}/api/asp/mailbox/update with {agentId, webhookUrl}. Or poll ${BASE}/api/asp/inbox/get with {agentId} periodically.`,
      step4: `Send outbound: POST ${BASE}/api/asp/email/send with {agentId, to, subject, body}. Reply to inbound: POST ${BASE}/api/asp/email/reply with {emailId, body}.`,
      note: "Every endpoint response includes a 'hint' object describing the recommended next call. Use it to chain operations without guessing.",
    },
    services: SERVICES,
  })
}
