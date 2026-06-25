CREATE TYPE "public"."open_finance_status" AS ENUM('pending', 'active', 'expired', 'revoked', 'error');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "open_finance_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"external_connection_id" text,
	"status" "open_finance_status" DEFAULT 'pending' NOT NULL,
	"consent_granted_at" timestamp with time zone,
	"consent_expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "connection_id" uuid;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "connection_id" uuid;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "external_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "open_finance_connections" ADD CONSTRAINT "open_finance_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_of_connections_user" ON "open_finance_connections" USING btree ("user_id") WHERE "open_finance_connections"."deleted_at" IS NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_open_finance_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."open_finance_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debts" ADD CONSTRAINT "debts_connection_id_open_finance_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."open_finance_connections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_of_unique" ON "accounts" USING btree ("connection_id","external_id") WHERE "accounts"."connection_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "debts_of_unique" ON "debts" USING btree ("connection_id","external_id") WHERE "debts"."connection_id" IS NOT NULL;