import { NextResponse } from "next/server"
import { EMAIL_GUIDE, humanIdentityDocs } from "@/lib/asp-manifest"

export function GET() {
  return NextResponse.json({
    ...EMAIL_GUIDE,
    identity: humanIdentityDocs(),
    paymentProtocol: "x402 v2 (USDT0 on X Layer / eip155:196)",
    seeAlso: {
      fullManifest: "/api/asp",
      phone: "/api/asp/phone",
      domain: "/api/asp/domain",
    },
  })
}
