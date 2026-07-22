-- PhoneNumber
CREATE TABLE IF NOT EXISTS "PhoneNumber" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "e164" TEXT NOT NULL UNIQUE,
    "provider" TEXT NOT NULL,
    "providerNumberId" TEXT NOT NULL,
    "capabilities" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "PhoneNumber_userId_idx" ON "PhoneNumber"("userId");

-- Call
CREATE TABLE IF NOT EXISTS "Call" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL REFERENCES "PhoneNumber"("id") ON DELETE CASCADE,
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerCallId" TEXT,
    "startedAt" TIMESTAMPTZ,
    "answeredAt" TIMESTAMPTZ,
    "endedAt" TIMESTAMPTZ,
    "durationSec" INTEGER,
    "recordingUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Call_userId_idx" ON "Call"("userId");
CREATE INDEX IF NOT EXISTS "Call_phoneNumberId_idx" ON "Call"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "Call_providerCallId_idx" ON "Call"("providerCallId");

-- CallTranscript
CREATE TABLE IF NOT EXISTS "CallTranscript" (
    "id" TEXT PRIMARY KEY,
    "callId" TEXT NOT NULL UNIQUE REFERENCES "Call"("id") ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "language" TEXT,
    "text" TEXT NOT NULL,
    "segments" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "CallTranscript_userId_idx" ON "CallTranscript"("userId");

-- Domain
CREATE TABLE IF NOT EXISTS "Domain" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL UNIQUE,
    "provider" TEXT NOT NULL,
    "providerDomainId" TEXT,
    "status" TEXT NOT NULL,
    "registeredAt" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "nameservers" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Domain_userId_idx" ON "Domain"("userId");

-- DnsRecord
CREATE TABLE IF NOT EXISTS "DnsRecord" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL REFERENCES "Domain"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 3600,
    "priority" INTEGER,
    "providerRecordId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "DnsRecord_userId_idx" ON "DnsRecord"("userId");
CREATE INDEX IF NOT EXISTS "DnsRecord_domainId_idx" ON "DnsRecord"("domainId");

-- WebhookEvent (idempotency store)
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "externalId" TEXT NOT NULL UNIQUE,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "processedAt" TIMESTAMPTZ
);

-- AccessToken (for session-token auth after first paid call)
CREATE TABLE IF NOT EXISTS "AccessToken" (
    "token" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "lastUsedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "AccessToken_userId_idx" ON "AccessToken"("userId");
