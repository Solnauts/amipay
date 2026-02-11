-- This file should undo anything in `up.sql`
DROP TABLE IF EXISTS "Ledger";
DROP TABLE IF EXISTS "User";

-- Recreate old user table
CREATE TABLE "user"(
	"name" VARCHAR NOT NULL,
	"id" INT4 NOT NULL PRIMARY KEY,
	"password" VARCHAR NOT NULL,
	"recipients" VARCHAR[] NOT NULL
);
