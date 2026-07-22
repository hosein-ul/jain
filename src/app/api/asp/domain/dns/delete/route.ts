import { NextRequest, NextResponse } from "next/server"
import { deleteDnsRecord } from "@/lib/domain-service"
import { createPaidRoute } from "@/lib/asp-route"
import { safeJson, resolvePaidUser, missingFieldError, notFoundError, unauthorizedError } from "@/lib/asp-hints"

export const { POST, GET } = createPaidRoute(
  "/api/asp/domain/dns/delete",
  "$0.005",
  "Delete a single DNS record from a domain you own.",
  async (req: NextRequest, { payer }) => {
    const user = await resolvePaidUser(req, payer)
    if (!user) return unauthorizedError("domain")

    const { recordId } = await safeJson(req)
    if (!recordId) return missingFieldError("recordId")

    const result = await deleteDnsRecord(user.id, { recordId })
    if (!result) return notFoundError("dnsRecord", "No record by that id exists under your tenant.")
    return NextResponse.json(result)
  }
)
