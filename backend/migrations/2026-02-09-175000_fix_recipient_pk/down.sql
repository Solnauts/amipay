-- This file should undo anything in `up.sql`
ALTER TABLE "Recipient" DROP CONSTRAINT "Recipient_pkey";
ALTER TABLE "Recipient" DROP COLUMN "id";
