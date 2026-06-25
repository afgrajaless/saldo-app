-- Migracion correctiva: alinea las 4 tablas de tarjeta de credito al spec de diseno.
-- Las tablas son nuevas (0009) y estan vacias -> los DROP/RENAME/ADD son seguros.

-- ============================================================
-- 1. credit_card_details
--    - Renombrar interest_rate_ea -> rotativo_rate_ea (precision 8,6)
--    - Renombrar fee_period -> management_fee_period
--    - management_fee: quitar notNull y default '0' (pasa a nullable)
-- ============================================================
ALTER TABLE "credit_card_details"
  RENAME COLUMN "interest_rate_ea" TO "rotativo_rate_ea";--> statement-breakpoint
ALTER TABLE "credit_card_details"
  ALTER COLUMN "rotativo_rate_ea" TYPE numeric(8,6);--> statement-breakpoint
ALTER TABLE "credit_card_details"
  RENAME COLUMN "fee_period" TO "management_fee_period";--> statement-breakpoint
ALTER TABLE "credit_card_details"
  ALTER COLUMN "management_fee" DROP NOT NULL,
  ALTER COLUMN "management_fee" DROP DEFAULT;--> statement-breakpoint

-- ============================================================
-- 2. card_installment_plans
--    - Renombrar interest_rate_mv -> monthly_rate (precision 8,6)
--    - Renombrar purchased_on -> start_date
--    - description: quitar notNull
--    - Eliminar updated_at (no estaba en spec)
-- ============================================================
ALTER TABLE "card_installment_plans"
  RENAME COLUMN "interest_rate_mv" TO "monthly_rate";--> statement-breakpoint
ALTER TABLE "card_installment_plans"
  ALTER COLUMN "monthly_rate" TYPE numeric(8,6);--> statement-breakpoint
ALTER TABLE "card_installment_plans"
  RENAME COLUMN "purchased_on" TO "start_date";--> statement-breakpoint
ALTER TABLE "card_installment_plans"
  ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "card_installment_plans"
  DROP COLUMN "updated_at";--> statement-breakpoint

-- ============================================================
-- 3. card_installment_items
--    Las tablas estan vacias -> dropeamos y recreamos columnas
--    para limpiar: installment_number->number, statement_date->due_on,
--    principal_portion->principal, interest_portion->interest,
--    eliminar amount e included, agregar balance.
-- ============================================================
-- Eliminar constraint unica y check sobre columnas antiguas
ALTER TABLE "card_installment_items"
  DROP CONSTRAINT "card_installment_items_plan_number_unique";--> statement-breakpoint
ALTER TABLE "card_installment_items"
  DROP CONSTRAINT "card_installment_items_amount_check";--> statement-breakpoint
-- Renombrar columnas que coinciden con el nuevo spec
ALTER TABLE "card_installment_items"
  RENAME COLUMN "installment_number" TO "number";--> statement-breakpoint
ALTER TABLE "card_installment_items"
  RENAME COLUMN "statement_date" TO "due_on";--> statement-breakpoint
ALTER TABLE "card_installment_items"
  RENAME COLUMN "principal_portion" TO "principal";--> statement-breakpoint
ALTER TABLE "card_installment_items"
  RENAME COLUMN "interest_portion" TO "interest";--> statement-breakpoint
-- Eliminar columnas que no van en el spec
ALTER TABLE "card_installment_items"
  DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "card_installment_items"
  DROP COLUMN "included";--> statement-breakpoint
-- Agregar columna balance (faltaba en el spec)
ALTER TABLE "card_installment_items"
  ADD COLUMN "balance" numeric(15,2) NOT NULL DEFAULT '0';--> statement-breakpoint
-- Recrear constraint unica con el nuevo nombre de columna
ALTER TABLE "card_installment_items"
  ADD CONSTRAINT "card_installment_items_plan_number_unique" UNIQUE("plan_id","number");--> statement-breakpoint

-- ============================================================
-- 4. card_statements
--    - Renombrar due_date -> payment_due_date
--    - Renombrar total_balance -> estimated_balance
--    - Renombrar minimum_payment -> estimated_min_payment
--    - Agregar reconciled_balance, reconciled_min_payment, reconciled_total_payment (nullable)
-- ============================================================
ALTER TABLE "card_statements"
  RENAME COLUMN "due_date" TO "payment_due_date";--> statement-breakpoint
ALTER TABLE "card_statements"
  RENAME COLUMN "total_balance" TO "estimated_balance";--> statement-breakpoint
ALTER TABLE "card_statements"
  RENAME COLUMN "minimum_payment" TO "estimated_min_payment";--> statement-breakpoint
ALTER TABLE "card_statements"
  ADD COLUMN "reconciled_balance" numeric(15,2);--> statement-breakpoint
ALTER TABLE "card_statements"
  ADD COLUMN "reconciled_min_payment" numeric(15,2);--> statement-breakpoint
ALTER TABLE "card_statements"
  ADD COLUMN "reconciled_total_payment" numeric(15,2);--> statement-breakpoint