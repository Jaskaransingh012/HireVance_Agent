-- Migration: Multi-user WhatsApp support
-- Drop old UserPreference table and create new User + update Notification

-- Drop old table
DROP TABLE IF EXISTS "UserPreference";

-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "desiredRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredOpportunityTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCompanies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remoteOnly" BOOLEAN NOT NULL DEFAULT false,
    "minimumRelevanceScore" INTEGER NOT NULL DEFAULT 75,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawPrompt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Add userId to Notification (temporarily nullable)
ALTER TABLE "Notification" ADD COLUMN "userId" TEXT;

-- Create indices
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_opportunityId_idx" ON "Notification"("opportunityId");

-- Drop old unique constraint on Notification
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_opportunityId_channel_type_key";

-- Add new unique constraint (opportunityId + userId + channel + type)
CREATE UNIQUE INDEX "Notification_opportunityId_userId_channel_type_key" ON "Notification"("opportunityId", "userId", "channel", "type");

-- Add foreign key
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Make userId NOT NULL after foreign key is added
ALTER TABLE "Notification" ALTER COLUMN "userId" SET NOT NULL;
