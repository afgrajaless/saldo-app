CREATE TYPE "public"."cdt_interest_payment" AS ENUM('monthly', 'at_maturity');--> statement-breakpoint
CREATE TYPE "public"."yield_type" AS ENUM('none', 'savings', 'cdt');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"effective_annual_rate" numeric(8, 6) NOT NULL,
	"valid_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_rates_rate_check" CHECK ("account_rates"."effective_annual_rate" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"balance" numeric(15, 2) NOT NULL,
	"as_of_date" date NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_snapshots_account_date_unique" UNIQUE("account_id","as_of_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cdt_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"principal" numeric(15, 2) NOT NULL,
	"opened_on" date NOT NULL,
	"term_days" integer NOT NULL,
	"matures_on" date NOT NULL,
	"effective_annual_rate" numeric(8, 6) NOT NULL,
	"withholding_rate" numeric(6, 4) DEFAULT '0.04' NOT NULL,
	"interest_payment" "cdt_interest_payment" DEFAULT 'at_maturity' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cdt_terms_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "cdt_terms_principal_check" CHECK ("cdt_terms"."principal" > 0),
	CONSTRAINT "cdt_terms_term_check" CHECK ("cdt_terms"."term_days" > 0)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "yield_type" "yield_type" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "effective_annual_rate" numeric(8, 6);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_rates" ADD CONSTRAINT "account_rates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cdt_terms" ADD CONSTRAINT "cdt_terms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cdt_terms" ADD CONSTRAINT "cdt_terms_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_rates_account" ON "account_rates" USING btree ("account_id","valid_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_account_snapshots_account_date" ON "account_snapshots" USING btree ("account_id","as_of_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cdt_terms_user" ON "cdt_terms" USING btree ("user_id");