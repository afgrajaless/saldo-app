CREATE TYPE "public"."insurance_mode" AS ENUM('none', 'rate', 'fixed');--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "insurance_mode" "insurance_mode" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "insurance_value" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "installments" ADD COLUMN "insurance_portion" numeric(15, 2) DEFAULT '0' NOT NULL;