CREATE TYPE "public"."share_status" AS ENUM('confirmed', 'pending', 'disputed');--> statement-breakpoint
ALTER TABLE "shared_expense_shares" ADD COLUMN "status" "share_status" DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_expense_shares" ADD COLUMN "disputed_note" text;--> statement-breakpoint
ALTER TABLE "shared_expense_shares" ADD COLUMN "status_changed_at" timestamp with time zone;