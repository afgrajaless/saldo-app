CREATE TYPE "public"."amortization_system" AS ENUM('frances', 'aleman', 'americano');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('activa', 'pagada', 'en_mora');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('libre_inversion', 'tarjeta_credito', 'libranza', 'hipotecario', 'vehiculo', 'educativo', 'gota_gota');--> statement-breakpoint
CREATE TYPE "public"."installment_status" AS ENUM('pendiente', 'pagada', 'vencida', 'parcial');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('regular', 'abono_capital');--> statement-breakpoint
CREATE TYPE "public"."rate_type" AS ENUM('ea', 'mv', 'nominal_anual');--> statement-breakpoint
CREATE TYPE "public"."usury_modality" AS ENUM('consumo_ordinario', 'microcredito', 'consumo_bajo_monto');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"creditor" text NOT NULL,
	"debt_type" "debt_type" NOT NULL,
	"principal_amount" numeric(15, 2) NOT NULL,
	"nominal_rate" numeric(9, 6) NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"effective_annual_rate" numeric(9, 6) NOT NULL,
	"amortization_system" "amortization_system" DEFAULT 'frances' NOT NULL,
	"term_months" integer NOT NULL,
	"start_date" date NOT NULL,
	"status" "debt_status" DEFAULT 'activa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "debts_principal_check" CHECK ("debts"."principal_amount" > 0),
	CONSTRAINT "debts_nominal_rate_check" CHECK ("debts"."nominal_rate" >= 0),
	CONSTRAINT "debts_effective_rate_check" CHECK ("debts"."effective_annual_rate" >= 0),
	CONSTRAINT "debts_term_check" CHECK ("debts"."term_months" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "income_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"monthly_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "income_monthly_amount_check" CHECK ("income_sources"."monthly_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_portion" numeric(15, 2) NOT NULL,
	"interest_portion" numeric(15, 2) NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"remaining_balance" numeric(15, 2) NOT NULL,
	"status" "installment_status" DEFAULT 'pendiente' NOT NULL,
	CONSTRAINT "installments_debt_number_unique" UNIQUE("debt_id","number"),
	CONSTRAINT "installments_number_check" CHECK ("installments"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"installment_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"type" "payment_type" DEFAULT 'regular' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usury_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modality" "usury_modality" NOT NULL,
	"effective_annual_rate" numeric(9, 6) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL,
	CONSTRAINT "usury_rate_check" CHECK ("usury_rates"."effective_annual_rate" > 0),
	CONSTRAINT "usury_valid_range_check" CHECK ("usury_rates"."valid_to" >= "usury_rates"."valid_from")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "installments" ADD CONSTRAINT "installments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_installment_id_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_debts_user" ON "debts" USING btree ("user_id") WHERE "debts"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_income_user" ON "income_sources" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_installments_debt" ON "installments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_debt" ON "payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usury_modality_period" ON "usury_rates" USING btree ("modality","valid_from","valid_to");