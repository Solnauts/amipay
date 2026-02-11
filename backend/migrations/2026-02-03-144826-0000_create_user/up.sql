-- Your SQL goes here
CREATE TABLE "user"(
	"name" VARCHAR NOT NULL,
	"id" INT4 NOT NULL PRIMARY KEY,
	"password" VARCHAR NOT NULL,
	"recipients" VARCHAR[] NOT NULL
);

