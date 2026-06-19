CREATE TYPE "public"."interest_mode" AS ENUM('monthly', 'daily');--> statement-breakpoint
ALTER TABLE "debts" ADD COLUMN "interest_mode" "interest_mode" DEFAULT 'monthly' NOT NULL;