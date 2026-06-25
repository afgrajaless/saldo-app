import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
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
  uniqueIndex,
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
// Presupuesto: una categoria es de ingreso o de egreso.
export const categoryTypeEnum = pgEnum('category_type', ['income', 'expense']);
// Modalidad del seguro de vida deudor: sin seguro, tasa sobre saldo o monto fijo.
export const insuranceModeEnum = pgEnum('insurance_mode', ['none', 'rate', 'fixed']);
// Modo de causacion del interes: mensual (contable) o diario (dias reales).
export const interestModeEnum = pgEnum('interest_mode', ['monthly', 'daily']);
// Tipo de rendimiento de una cuenta: ninguno, cuenta remunerada (diario, tasa
// variable) o CDT (deposito a termino, tasa fija).
export const yieldTypeEnum = pgEnum('yield_type', ['none', 'savings', 'cdt']);
// Forma de pago del interes de un CDT: mensual (devengo) o al vencimiento.
export const cdtInterestPaymentEnum = pgEnum('cdt_interest_payment', ['monthly', 'at_maturity']);
// Metodo de division de un gasto compartido: partes iguales o montos exactos.
export const splitMethodEnum = pgEnum('split_method', ['equal', 'exact']);
// Estado de confirmacion de la parte de un gasto compartido.
export const shareStatusEnum = pgEnum('share_status', ['confirmed', 'pending', 'disputed']);
// Tipo de cuenta: activo (efectivo/banco/inversion) o tarjeta de credito (pasivo).
export const accountKindEnum = pgEnum('account_kind', ['asset', 'credit_card']);
// Periodicidad del cobro de la cuota de manejo de una tarjeta de credito.
export const cardFeePeriodEnum = pgEnum('card_fee_period', ['none', 'monthly', 'annual']);
// Estado de un plan de pago en cuotas diferidas de una tarjeta de credito.
export const cardPlanStatusEnum = pgEnum('card_plan_status', ['active', 'paid']);
// Estado del extracto mensual de una tarjeta de credito.
export const cardStatementStatusEnum = pgEnum('card_statement_status', ['open', 'closed', 'paid']);

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
    // Seguro de vida deudor (aditivo a la cuota).
    insuranceMode: insuranceModeEnum('insurance_mode').notNull().default('none'),
    insuranceValue: numeric('insurance_value', { precision: 18, scale: 8 }),
    // Modo de causacion del interes (mensual o diario por dias reales).
    interestMode: interestModeEnum('interest_mode').notNull().default('monthly'),
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
    // Porcion de seguro de la cuota (0 si la deuda no tiene seguro).
    insurancePortion: numeric('insurance_portion', { precision: 15, scale: 2 })
      .notNull()
      .default('0'),
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

// ---------- categories (presupuesto: categorias de ingreso/egreso) ----------
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: categoryTypeEnum('type').notNull(),
    // Categoria padre (jerarquia de un solo nivel); null = categoria de primer nivel.
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    color: text('color').notNull().default('#0B5D3B'), // hex para la UI
    // Meta mensual (solo aplica a egresos); null = sin meta.
    monthlyBudget: numeric('monthly_budget', { precision: 15, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete
  },
  (table) => ({
    userIdx: index('idx_categories_user')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
    parentIdx: index('idx_categories_parent')
      .on(table.parentId)
      .where(sql`${table.deletedAt} IS NULL`),
    budgetNonNegative: check(
      'categories_budget_check',
      sql`${table.monthlyBudget} IS NULL OR ${table.monthlyBudget} >= 0`,
    ),
  }),
);

// ---------- accounts (cuentas: Nequi, efectivo, banco, etc.) ----------
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull().default('#2D6FB0'), // hex para la UI
    // Discriminador: asset = cuenta de activo (banco/efectivo); credit_card = pasivo.
    kind: accountKindEnum('kind').notNull().default('asset'),
    // Tipo de rendimiento: none, savings (remunerada) o cdt.
    yieldType: yieldTypeEnum('yield_type').notNull().default('none'),
    // Tasa E.A. vigente (fraccion decimal); null si no genera rendimiento.
    effectiveAnnualRate: numeric('effective_annual_rate', { precision: 8, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // soft delete
  },
  (table) => ({
    userIdx: index('idx_accounts_user')
      .on(table.userId)
      .where(sql`${table.deletedAt} IS NULL`),
  }),
);

// ---------- account_rates (historial de tasa E.A. de una cuenta) ----------
export const accountRates = pgTable(
  'account_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    effectiveAnnualRate: numeric('effective_annual_rate', { precision: 8, scale: 6 }).notNull(),
    validFrom: date('valid_from').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdx: index('idx_account_rates_account').on(table.accountId, table.validFrom),
    rateNonNegative: check('account_rates_rate_check', sql`${table.effectiveAnnualRate} >= 0`),
  }),
);

// ---------- account_snapshots (saldo real de una cuenta en una fecha) ----------
export const accountSnapshots = pgTable(
  'account_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    balance: numeric('balance', { precision: 15, scale: 2 }).notNull(),
    asOfDate: date('as_of_date').notNull(),
    // Origen del dato: 'manual' (lo ingreso el usuario) o 'computed'.
    source: text('source').notNull().default('manual'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountDateIdx: index('idx_account_snapshots_account_date').on(table.accountId, table.asOfDate),
    // Un solo saldo por cuenta y fecha.
    accountDateUnique: unique('account_snapshots_account_date_unique').on(
      table.accountId,
      table.asOfDate,
    ),
  }),
);

// ---------- cdt_terms (condiciones de un CDT, 1:1 con la cuenta) ----------
export const cdtTerms = pgTable(
  'cdt_terms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    principal: numeric('principal', { precision: 15, scale: 2 }).notNull(),
    openedOn: date('opened_on').notNull(),
    termDays: integer('term_days').notNull(),
    maturesOn: date('matures_on').notNull(),
    effectiveAnnualRate: numeric('effective_annual_rate', { precision: 8, scale: 6 }).notNull(),
    // Retencion en la fuente sobre los intereses (4% por defecto en Colombia).
    withholdingRate: numeric('withholding_rate', { precision: 6, scale: 4 })
      .notNull()
      .default('0.04'),
    interestPayment: cdtInterestPaymentEnum('interest_payment').notNull().default('at_maturity'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_cdt_terms_user').on(table.userId),
    principalPositive: check('cdt_terms_principal_check', sql`${table.principal} > 0`),
    termPositive: check('cdt_terms_term_check', sql`${table.termDays} > 0`),
  }),
);

// ---------- transactions (movimientos: ingresos y egresos) ----------
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    // Cuenta de la que sale/entra el dinero; null = sin cuenta asignada.
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    occurredOn: date('occurred_on').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index('idx_transactions_user_date').on(table.userId, table.occurredOn),
    categoryIdx: index('idx_transactions_category').on(table.categoryId),
    accountIdx: index('idx_transactions_account').on(table.accountId),
    amountPositive: check('transactions_amount_check', sql`${table.amount} > 0`),
  }),
);

// ---------- transfers (transferencias entre cuentas; ni ingreso ni gasto) ----------
export const transfers = pgTable(
  'transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromAccountId: uuid('from_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    toAccountId: uuid('to_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    occurredOn: date('occurred_on').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index('idx_transfers_user_date').on(table.userId, table.occurredOn),
    amountPositive: check('transfers_amount_check', sql`${table.amount} > 0`),
    differentAccounts: check(
      'transfers_accounts_check',
      sql`${table.fromAccountId} <> ${table.toAccountId}`,
    ),
  }),
);

// ---------- groups (espacios de gasto compartido) ----------
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull().defaultNow().$onUpdate(() => new Date()),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }), // null = fantasma
    displayName: text('display_name').notNull(),
    addedByUserId: uuid('added_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp('removed_at', { withTimezone: true }),
  },
  (t) => ({
    groupIdx: index('idx_group_members_group').on(t.groupId).where(sql`${t.removedAt} IS NULL`),
    userIdx: index('idx_group_members_user').on(t.userId).where(sql`${t.removedAt} IS NULL`),
    uniqueRealMember: uniqueIndex('uq_group_members_real')
      .on(t.groupId, t.userId).where(sql`${t.userId} IS NOT NULL AND ${t.removedAt} IS NULL`),
  }),
);

export const groupInvites = pgTable('group_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  memberId: uuid('member_id').references(() => groupMembers.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  consumedBy: uuid('consumed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sharedExpenses = pgTable(
  'shared_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
    paidByMemberId: uuid('paid_by_member_id').notNull().references(() => groupMembers.id, { onDelete: 'restrict' }),
    description: text('description'),
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    occurredOn: date('occurred_on').notNull(),
    splitMethod: splitMethodEnum('split_method').notNull(),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    groupIdx: index('idx_shared_expenses_group').on(t.groupId).where(sql`${t.deletedAt} IS NULL`),
    amountPositive: check('shared_expenses_amount_check', sql`${t.amount} > 0`),
  }),
);

export const sharedExpenseShares = pgTable(
  'shared_expense_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id').notNull().references(() => sharedExpenses.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id').notNull().references(() => groupMembers.id, { onDelete: 'restrict' }),
    shareAmount: numeric('share_amount', { precision: 15, scale: 2 }).notNull(),
    status: shareStatusEnum('status').notNull().default('confirmed'),
    disputedNote: text('disputed_note'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
  },
  (t) => ({
    expenseIdx: index('idx_shares_expense').on(t.expenseId),
    uniqueShare: unique('uq_share_expense_member').on(t.expenseId, t.memberId),
  }),
);

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  fromMemberId: uuid('from_member_id').notNull().references(() => groupMembers.id, { onDelete: 'restrict' }),
  toMemberId: uuid('to_member_id').notNull().references(() => groupMembers.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  settledOn: date('settled_on').notNull(),
  fromTransactionId: uuid('from_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  toTransactionId: uuid('to_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- credit_card_details (parametros fijos de una TC; 1:1 con accounts) ----------
export const creditCardDetails = pgTable(
  'credit_card_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .unique()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    // Cupo total autorizado por el emisor.
    creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }).notNull(),
    // Dia del mes en que cierra el periodo de facturacion (1-31).
    statementDay: integer('statement_day').notNull(),
    // Dia del mes en que vence el pago (1-31).
    paymentDay: integer('payment_day').notNull(),
    // Pago minimo requerido como fraccion decimal del saldo (ej. 0.05 = 5 %).
    minPaymentPct: numeric('min_payment_pct', { precision: 5, scale: 4 }).notNull().default('0.05'),
    // Tasa de interes corriente E.A. (fraccion decimal).
    interestRateEa: numeric('interest_rate_ea', { precision: 9, scale: 6 }).notNull(),
    // Cuota de manejo (0 si la tarjeta es sin cuota).
    managementFee: numeric('management_fee', { precision: 15, scale: 2 }).notNull().default('0'),
    // Periodicidad del cobro de la cuota de manejo.
    feePeriod: cardFeePeriodEnum('fee_period').notNull().default('none'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index('idx_credit_card_details_account').on(table.accountId),
    creditLimitPositive: check(
      'credit_card_details_credit_limit_check',
      sql`${table.creditLimit} > 0`,
    ),
    statementDayRange: check(
      'credit_card_details_statement_day_check',
      sql`${table.statementDay} BETWEEN 1 AND 31`,
    ),
    paymentDayRange: check(
      'credit_card_details_payment_day_check',
      sql`${table.paymentDay} BETWEEN 1 AND 31`,
    ),
    minPaymentPctRange: check(
      'credit_card_details_min_payment_pct_check',
      sql`${table.minPaymentPct} BETWEEN 0 AND 1`,
    ),
  }),
);

// ---------- card_installment_plans (compras diferidas en cuotas; "meses sin intereses" o con) ----------
export const cardInstallmentPlans = pgTable(
  'card_installment_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    // Transaccion de gasto que origino el diferido; null si se registro por separado.
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    // Capital total diferido (monto original de la compra).
    principal: numeric('principal', { precision: 15, scale: 2 }).notNull(),
    // Numero total de cuotas pactadas.
    numberOfInstallments: integer('number_of_installments').notNull(),
    // Tasa de interes M.V. del diferido (0 = sin interes).
    interestRateMv: numeric('interest_rate_mv', { precision: 9, scale: 6 }).notNull().default('0'),
    // Fecha en que se realizo la compra (puede diferir de la fecha de la transaccion).
    purchasedOn: date('purchased_on').notNull(),
    status: cardPlanStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index('idx_card_installment_plans_account').on(table.accountId),
    principalPositive: check(
      'card_installment_plans_principal_check',
      sql`${table.principal} > 0`,
    ),
    numberOfInstallmentsPositive: check(
      'card_installment_plans_installments_check',
      sql`${table.numberOfInstallments} > 0`,
    ),
  }),
);

// ---------- card_installment_items (cuotas individuales de un plan diferido) ----------
export const cardInstallmentItems = pgTable(
  'card_installment_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => cardInstallmentPlans.id, { onDelete: 'cascade' }),
    // Numero secuencial de la cuota dentro del plan (1 = primera, N = ultima).
    installmentNumber: integer('installment_number').notNull(),
    // Fecha del extracto en que aparece esta cuota.
    statementDate: date('statement_date').notNull(),
    // Valor de la cuota (capital + interes del periodo).
    amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
    // Porcion de capital incluida en esta cuota.
    principalPortion: numeric('principal_portion', { precision: 15, scale: 2 }).notNull(),
    // Porcion de interes incluida en esta cuota.
    interestPortion: numeric('interest_portion', { precision: 15, scale: 2 }).notNull(),
    // Si el valor ya quedo incluido en el extracto cerrado del mes.
    included: text('included').notNull().default('false'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    planIdx: index('idx_card_installment_items_plan').on(table.planId),
    // No puede haber dos cuotas con el mismo numero en un mismo plan.
    planInstallmentUnique: unique('card_installment_items_plan_number_unique').on(
      table.planId,
      table.installmentNumber,
    ),
    amountPositive: check('card_installment_items_amount_check', sql`${table.amount} > 0`),
  }),
);

// ---------- card_statements (extracto mensual de la tarjeta de credito) ----------
export const cardStatements = pgTable(
  'card_statements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    // Fecha de corte del extracto (cierre del periodo de facturacion).
    cutoffDate: date('cutoff_date').notNull(),
    // Fecha limite de pago.
    dueDate: date('due_date').notNull(),
    // Saldo total facturado en el extracto (capital + intereses + cargos).
    totalBalance: numeric('total_balance', { precision: 15, scale: 2 }).notNull(),
    // Pago minimo requerido segun las condiciones del contrato.
    minimumPayment: numeric('minimum_payment', { precision: 15, scale: 2 }).notNull(),
    status: cardStatementStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    accountIdx: index('idx_card_statements_account').on(table.accountId, table.cutoffDate),
    // Un solo extracto por cuenta y fecha de corte.
    accountCutoffUnique: unique('card_statements_account_cutoff_unique').on(
      table.accountId,
      table.cutoffDate,
    ),
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
  categories,
  accounts,
  accountRates,
  accountSnapshots,
  cdtTerms,
  transactions,
  transfers,
  groups,
  groupMembers,
  groupInvites,
  sharedExpenses,
  sharedExpenseShares,
  settlements,
  creditCardDetails,
  cardInstallmentPlans,
  cardInstallmentItems,
  cardStatements,
};
