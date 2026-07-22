import { NextResponse } from "next/server"
import { EMAIL_GUIDE, PHONE_GUIDE, DOMAIN_GUIDE, humanIdentityDocs } from "@/lib/asp-manifest"

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

  // ═════════════════════════════════════════════════════════════════════════
  // ═ PHONE  ════════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════════════

  {
    name: "list_phone_numbers",
    endpoint: `${BASE}/api/asp/phone/numbers`,
    price: "free",
    description: "List all phone numbers owned by the authenticated tenant",
    input: { type: "object", properties: {} },
    output: { type: "object", properties: { numbers: { type: "array" } } },
  },
  {
    name: "get_call",
    endpoint: `${BASE}/api/asp/phone/calls/get`,
    price: "free",
    description: "Get a call by id (status, direction, duration, recording URL if available)",
    input: { type: "object", required: ["callId"], properties: { callId: { type: "string" } } },
    output: { type: "object", properties: { call: { type: "object" } } },
  },
  {
    name: "get_transcript",
    endpoint: `${BASE}/api/asp/phone/calls/transcript`,
    price: "free",
    description: "Get the STT transcript of a completed call",
    input: { type: "object", required: ["callId"], properties: { callId: { type: "string" } } },
    output: { type: "object", properties: { transcript: { type: "object" } } },
  },
  {
    name: "buy_phone_number",
    endpoint: `${BASE}/api/asp/phone/buy-number`,
    price: "$1.00",
    description: "Buy a real phone number. Provide either an exact e164, or {country, areaCode?} to auto-select.",
    input: {
      type: "object",
      properties: {
        e164: { type: "string" },
        country: { type: "string", description: "ISO country code, e.g. 'US'" },
        areaCode: { type: "string" },
        webhookUrl: { type: "string", format: "uri" },
      },
    },
    output: { type: "object", properties: { phoneNumber: { type: "object" }, accessToken: { type: "string" } } },
  },
  {
    name: "release_phone_number",
    endpoint: `${BASE}/api/asp/phone/release-number`,
    price: "$0.005",
    description: "Release a phone number back to the provider",
    input: { type: "object", required: ["phoneNumberId"], properties: { phoneNumberId: { type: "string" } } },
    output: { type: "object", properties: { released: { type: "boolean" } } },
  },
  {
    name: "start_call",
    endpoint: `${BASE}/api/asp/phone/start-call`,
    price: "$0.05",
    description: "Place an outbound call from one of your numbers",
    input: {
      type: "object",
      required: ["phoneNumberId", "to"],
      properties: {
        phoneNumberId: { type: "string" },
        to: { type: "string", description: "E.164 destination" },
        webhookUrl: { type: "string", format: "uri" },
        twiml: { type: "string", description: "Inline TwiML script (Twilio adapter)" },
      },
    },
    output: { type: "object", properties: { call: { type: "object" } } },
  },
  {
    name: "answer_call",
    endpoint: `${BASE}/api/asp/phone/answer-call`,
    price: "$0.005",
    description: "Answer an inbound ringing call (mapped via webhook to your tenant)",
    input: { type: "object", required: ["callId"], properties: { callId: { type: "string" } } },
    output: { type: "object", properties: { call: { type: "object" } } },
  },
  {
    name: "end_call",
    endpoint: `${BASE}/api/asp/phone/end-call`,
    price: "$0.005",
    description: "Hang up an active call",
    input: { type: "object", required: ["callId"], properties: { callId: { type: "string" } } },
    output: { type: "object", properties: { call: { type: "object" } } },
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ═ DOMAIN  ═══════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════════════

  {
    name: "search_domain",
    endpoint: `${BASE}/api/asp/domain/search`,
    price: "free",
    description: "Check availability of a domain across common TLDs",
    input: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Bare label, e.g. 'acmecorp'" },
        tlds: { type: "array", items: { type: "string" } },
      },
    },
    output: { type: "object", properties: { results: { type: "array" } } },
  },
  {
    name: "list_domains",
    endpoint: `${BASE}/api/asp/domain/list`,
    price: "free",
    description: "List all domains owned by the authenticated tenant",
    input: { type: "object", properties: {} },
    output: { type: "object", properties: { domains: { type: "array" } } },
  },
  {
    name: "list_dns_records",
    endpoint: `${BASE}/api/asp/domain/dns/list`,
    price: "free",
    description: "List DNS records for a domain you own (live registrar state)",
    input: {
      type: "object",
      properties: { domainId: { type: "string" }, name: { type: "string" } },
    },
    output: { type: "object", properties: { records: { type: "array" } } },
  },
  {
    name: "register_domain",
    endpoint: `${BASE}/api/asp/domain/register`,
    price: "$10.00",
    description: "Register a domain with the configured registrar (ICANN contact required)",
    input: {
      type: "object",
      required: ["domain", "contact"],
      properties: {
        domain: { type: "string" },
        years: { type: "number", default: 1 },
        contact: {
          type: "object",
          required: ["firstName", "lastName", "email", "phone", "address1", "city", "postalCode", "country"],
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            address1: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            postalCode: { type: "string" },
            country: { type: "string", description: "ISO 3166-1 alpha-2" },
            organization: { type: "string" },
          },
        },
        nameservers: { type: "array", items: { type: "string" } },
        autoRenew: { type: "boolean" },
      },
    },
    output: { type: "object", properties: { domain: { type: "object" }, accessToken: { type: "string" } } },
  },
  {
    name: "renew_domain",
    endpoint: `${BASE}/api/asp/domain/renew`,
    price: "$10.00",
    description: "Extend a domain registration by N years",
    input: {
      type: "object",
      properties: {
        domainId: { type: "string" },
        name: { type: "string" },
        years: { type: "number", default: 1 },
      },
    },
    output: { type: "object", properties: { domain: { type: "object" } } },
  },
  {
    name: "update_dns_record",
    endpoint: `${BASE}/api/asp/domain/dns/update`,
    price: "$0.01",
    description: "Create or update a single DNS record on a domain you own",
    input: {
      type: "object",
      required: ["record"],
      properties: {
        domainId: { type: "string" },
        name: { type: "string" },
        record: {
          type: "object",
          required: ["type", "name", "value"],
          properties: {
            recordId: { type: "string", description: "Provide to update an existing record; omit to create" },
            type: { type: "string", enum: ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"] },
            name: { type: "string" },
            value: { type: "string" },
            ttl: { type: "number" },
            priority: { type: "number" },
          },
        },
      },
    },
    output: { type: "object", properties: { record: { type: "object" } } },
  },
  {
    name: "delete_dns_record",
    endpoint: `${BASE}/api/asp/domain/dns/delete`,
    price: "$0.005",
    description: "Delete a single DNS record from a domain you own",
    input: { type: "object", required: ["recordId"], properties: { recordId: { type: "string" } } },
    output: { type: "object", properties: { deleted: { type: "boolean" } } },
  },
]

export function GET() {
  return NextResponse.json({
    name: "AgentOS",
    version: "1.1.0",
    description: `Real communication and identity infrastructure for AI agents — Email (send/receive/thread/search via @${EMAIL_DOMAIN} mailboxes), Phone (buy numbers, place calls, transcripts), and Domain (search, register, DNS management). Each capability is exposed as a fixed-price REST endpoint suitable for OKX.AI ASP registration.`,
    documentation: `${BASE}/docs`,
    perServiceGuides: {
      email: `${BASE}/api/asp/email`,
      phone: `${BASE}/api/asp/phone`,
      domain: `${BASE}/api/asp/domain`,
    },
    startHere: {
      why: "Every non-provisioning endpoint requires an accessToken. To get one, call ONE of the three endpoints below — pick the capability you need first. Each one pays via x402 (USDT0 on X Layer) and returns an accessToken that unlocks all three services.",
      provisioningEndpoints: [
        {
          service: "email",
          endpoint: `${BASE}/api/asp/mailbox/create`,
          price: "$0.25",
          provides: "a real @-address you can send from and receive at",
          example: `curl -X POST ${BASE}/api/asp/mailbox/create -H "Content-Type: application/json" -H "PAYMENT-SIGNATURE: <b64>" -d '{"name":"my-agent"}'`,
        },
        {
          service: "phone",
          endpoint: `${BASE}/api/asp/phone/buy-number`,
          price: "$1.00",
          provides: "a real phone number you can call from and receive calls on",
          example: `curl -X POST ${BASE}/api/asp/phone/buy-number -H "Content-Type: application/json" -H "PAYMENT-SIGNATURE: <b64>" -d '{"country":"US"}'`,
        },
        {
          service: "domain",
          endpoint: `${BASE}/api/asp/domain/register`,
          price: "$10.00",
          provides: "a registered domain with DNS you can manage",
          example: `curl -X POST ${BASE}/api/asp/domain/register -H "Content-Type: application/json" -H "PAYMENT-SIGNATURE: <b64>" -d '{"domain":"acmecorp.com","years":1,"contact":{...}}'`,
        },
      ],
      note: "One accessToken authenticates ALL three services. You don't need to pay for another one just to try email after starting with phone.",
    },
    identity: humanIdentityDocs(),
    stack: {
      framework: "Next.js (App Router)",
      database: "Supabase (Postgres) — every resource row is tenant-scoped by userId",
      isolation: "Tenant isolation is enforced at the database query layer (every read/write filters by userId), not just at the API. Provider secrets stay server-side; agents only see their accessToken and their own data.",
    },
    paymentProtocol: "x402 v2 (USDT0 on X Layer / eip155:196)",
    webhookSecurity: {
      email: "Inbound email events are signed with X-AgentMail-Signature: sha256=<hmac>. Verify using WEBHOOK_SECRET from your mailbox setup.",
      phone: "Provider-signed inbound at /api/webhooks/phone. Signature header depends on the active provider (x-twilio-signature, etc.). Deduplicated via WebhookEvent.externalId.",
      domain: "Registrar-signed inbound at /api/webhooks/domain. Same idempotency guarantee as phone.",
    },
    getStarted: {
      choose: "Pick one of the three services. Each has its own paid provisioning endpoint that issues an accessToken. After that, both free and paid endpoints of that service (and every other AgentOS service) authenticate via Authorization: Bearer <accessToken>.",
      email: EMAIL_GUIDE.quickStart,
      phone: PHONE_GUIDE.quickStart,
      domain: DOMAIN_GUIDE.quickStart,
      commonPattern: "Every response includes a 'hint' object with next-step suggestions and copy-pasteable examples. Chain calls off `hint.next` — do not guess endpoint shapes.",
    },
    services: SERVICES,
  })
}
