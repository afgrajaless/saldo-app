import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Schema Drizzle del gestor de deuda (Saldo).
 *
 * Convenciones (alineadas con 001_init_schema.sql):
 *  - Montos: NUMERIC(15,2) -> aritmetica decimal exacta. Drizzle los expone
 *    como `string` para no perder precision; el dominio los parsea.
 *  - Tasas:  NUMERIC(9,6) -> se almacenan como fraccion decimal (0.285 = 28.5 %).
 *  - IDs:    UUID v4 (gen_random_uuid, nativo en Postgres 16).
 *  - Tiempo: TIMESTAMPTZ. `updated_at` se mantiene con $onUpdate (via ORM).
 *  - Aislamiento: toda fila de negocio cuelga de user_id (cascade on delete).
 */

// ---------- Tipos enumerados ----------
export const debtTypeEnum = pgEnum('debt_type', [
  'libre_inversion',
  'tarjeta_credito',
  'libranza',
  'hipotecario',
  'vehiculo',
  'educativo',
  'gota_gota',
]);
export const rateTypeEnum = pgEnum('rate_type', ['ea', 'mv', 'nominal_anual']);
export const amortizationSystemEnum = pgEnum('amortization_system', [
  'frances',
  'aleman',
  'americano',
]);
export const debtStatusEnum = pgEnum('debt_status', [
  'activa',
  'pagada',
  'en_mora',
]);
export const installmentStatusEnum = pgEnum('installment_status', [
  'pendiente',
  'pagada',
  'vencida',
  'parcial',
]);
export const paymentTypeEnum = pgEnum('payment_type', [
  'regular',
  'abono_capital',
]);
export const usuryModalityEnum = pgEnum('usury_modality', [
  'consumo_ordinario',
  'microcredito',
  'consumo_bajo_monto',
]);

// ---------- users ----------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(), // normalizado a minusculas en el servicio
  passwordHash: text('password_hash').notNull(), // hash Argon2, NUNCA texto plano
  fullName: text('full_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------- income_sources ----------
export const incomeSources = pgTable(
  'income_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    monthlyAmount: numeric('monthly_amount', { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_income_user').on(table.userId),
    monthlyAmountNonNegative: check(
      'income_monthly_amount_check',
      sql`${table.monthlyAmount} >= 0`,
    ),
  }),
);

// ---------- debts ----------
export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creditor: text('creditor').notNull(),
    debtType: debtTypeEnum('debt_type').notNull(),
    principalAmount: numeric('principal_amount', { precision: 15, scale: 2 }).notNull(),
    nominalRate: numeric('nominal_rate', { precision: 9, scale: 6 }).notNull(),
    rateType: rateTypeEnum('rate_type').notNull(),
    effectiveAnnualRate: numeric('effective_annual_rate', {
      precision: 9,
      scale: 6,
    }).notNull(),
    amortizationSystem: amortizationSystemEnum('amortization_system')
      .notNull()
      .default('frances'),
    termMonths: integer('term_months').notNull(),
    startDate: date('start_date').notNull(),
    status: debtStatusEnum('status').notNull().default('activa'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete
  },
  (table) => ({
    // Indice parcial: solo deudas vivas; acelera el caso de uso mas comun.
    userIdx: index('idx_debts_user')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    principalPositive: check('debts_principal_check', sql`${table.principalAmount} > 0`),
    nominalRateNonNegative: check('debts_nominal_rate_check', sql`${table.nominalRate} >= 0`),
    effectiveRateNonNegative: check(
      'debts_effective_rate_check',
      sql`${table.effectiveAnnualRate} >= 0`,
    ),
    termPositive: check('debts_term_check', sql`${table.termMonths} > 0`),
  }),
);

// ---------- installments (cronograma proyectado) ----------
export const installments = pgTable(
  'installments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    dueDate: date('due_date').notNull(),
    principalPortion: numeric('principal_portion', { precision: 15, scale: 2 }).notNull(),
    interestPortion: numeric('interest_portion', { precision: 15, scale: 2 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
    remainingBalance: numeric('remaining_balance', { precision: 15, scale: 2 }).notNull(),
    status: installmentStatusEnum('status').notNull().default('pendiente'),
  },
  (table) => ({
    debtIdx: index('idx_installments_debt').on(table.debtId),
    // No puede haber dos cuotas #5 en una misma deuda.
    debtNumberUnique: unique('installments_debt_number_unique').on(table.debtId, table.number),
    numberPositive: check('installments_number_check', sql`${table.number} > 0`),
  }),
);

// ---------- payments (pagos reales registrados) ----------
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    // NULL si es abono extraordinario a capital.
    installmentId: uuid('installment_id').references(() => installments.id, {
      onDelete: 'set null',
    }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    paymentDate: date('payment_date').notNull(),
    type: paymentTypeEnum('type').notNull().default('regular'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    debtIdx: index('idx_payments_debt').on(table.debtId),
    amountPositive: check('payments_amount_check', sql`${table.amount} > 0`),
  }),
);

// ---------- usury_rates (catalogo de referencia con vigencia) ----------
export const usuryRates = pgTable(
  'usury_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modality: usuryModalityEnum('modality').notNull(),
    effectiveAnnualRate: numeric('effective_annual_rate', {
      precision: 9,
      scale: 6,
    }).notNull(),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to').notNull(),
  },
  (table) => ({
    modalityPeriodIdx: index('idx_usury_modality_period').on(
      table.modality,
      table.validFrom,
      table.validTo,
    ),
    ratePositive: check('usury_rate_check', sql`${table.effectiveAnnualRate} > 0`),
    validRange: check('usury_valid_range_check', sql`${table.validTo} >= ${table.validFrom}`),
  }),
);

/** Esquema completo agrupado para inyectar en el cliente Drizzle. */
export const schema = {
  users,
  incomeSources,
  debts,
  installments,
  payments,
  usuryRates,
};
