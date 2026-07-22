import { NextResponse } from "next/server"
import { PHONE_GUIDE, humanIdentityDocs } from "@/lib/asp-manifest"

export function GET() {
  return NextResponse.json({
    ...PHONE_GUIDE,
    identity: humanIdentityDocs(),
    paymentProtocol: "x402 v2 (USDT0 on X Layer / eip155:196)",
    seeAlso: {
      fullManifest: "/api/asp",
      email: "/api/asp/email",
      domain: "/api/asp/domain",
    },
  })
}
