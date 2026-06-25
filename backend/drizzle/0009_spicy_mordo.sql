CREATE TYPE "public"."account_kind" AS ENUM('asset', 'credit_card');--> statement-breakpoint
CREATE TYPE "public"."card_fee_period" AS ENUM('none', 'monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."card_plan_status" AS ENUM('active', 'paid');--> statement-breakpoint
CREATE TYPE "public"."card_statement_status" AS ENUM('open', 'closed', 'paid');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_installment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"statement_date" date NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"principal_portion" numeric(15, 2) NOT NULL,
	"interest_portion" numeric(15, 2) NOT NULL,
	"included" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_installment_items_plan_number_unique" UNIQUE("plan_id","installment_number"),
	CONSTRAINT "card_installment_items_amount_check" CHECK ("card_installment_items"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_installment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"transaction_id" uuid,
	"description" text NOT NULL,
	"principal" numeric(15, 2) NOT NULL,
	"number_of_installments" integer NOT NULL,
	"interest_rate_mv" numeric(9, 6) DEFAULT '0' NOT NULL,
	"purchased_on" date NOT NULL,
	"status" "card_plan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_installment_plans_principal_check" CHECK ("card_installment_plans"."principal" > 0),
	CONSTRAINT "card_installment_plans_installments_check" CHECK ("card_installment_plans"."number_of_installments" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "card_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"cutoff_date" date NOT NULL,
	"due_date" date NOT NULL,
	"total_balance" numeric(15, 2) NOT NULL,
	"minimum_payment" numeric(15, 2) NOT NULL,
	"status" "card_statement_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_statements_account_cutoff_unique" UNIQUE("account_id","cutoff_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_card_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"credit_limit" numeric(15, 2) NOT NULL,
	"statement_day" integer NOT NULL,
	"payment_day" integer NOT NULL,
	"min_payment_pct" numeric(5, 4) DEFAULT '0.05' NOT NULL,
	"interest_rate_ea" numeric(9, 6) NOT NULL,
	"management_fee" numeric(15, 2) DEFAULT '0' NOT NULL,
	"fee_period" "card_fee_period" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_card_details_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "credit_card_details_credit_limit_check" CHECK ("credit_card_details"."credit_limit" > 0),
	CONSTRAINT "credit_card_details_statement_day_check" CHECK ("credit_card_details"."statement_day" BETWEEN 1 AND 31),
	CONSTRAINT "credit_card_details_payment_day_check" CHECK ("credit_card_details"."payment_day" BETWEEN 1 AND 31),
	CONSTRAINT "credit_card_details_min_payment_pct_check" CHECK ("credit_card_details"."min_payment_pct" BETWEEN 0 AND 1)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "kind" "account_kind" DEFAULT 'asset' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_installment_items" ADD CONSTRAINT "card_installment_items_plan_id_card_installment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."card_installment_plans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_installment_plans" ADD CONSTRAINT "card_installment_plans_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_installment_plans" ADD CONSTRAINT "card_installment_plans_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_card_installment_items_plan" ON "card_installment_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_card_installment_plans_account" ON "card_installment_plans" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_card_statements_account" ON "card_statements" USING btree ("account_id","cutoff_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_credit_card_details_account" ON "credit_card_details" USING btree ("account_id");