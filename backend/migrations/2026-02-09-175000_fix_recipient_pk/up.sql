-- AlterTable: Add id column as primary key to Recipient
ALTER TABLE "Recipient" ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id");
