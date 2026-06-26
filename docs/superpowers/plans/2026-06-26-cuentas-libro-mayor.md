# Cuentas como libro mayor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada cuenta de activo muestre un saldo calculado desde sus movimientos reales y un libro mayor (lista cronológica con saldo corriente).

**Architecture:** Saldo = ancla (snapshot más reciente ≤ hoy, o saldo de apertura) + Σ movimientos posteriores (transacciones income/expense + transferencias in/out). Lógica de saldo en dominio puro testeable; endpoint de libro mayor por cuenta; saldo calculado en la lista. UI: saldo + sección de movimientos en el detalle, campo de apertura en el alta.

**Tech Stack:** NestJS 10 + Drizzle ORM (Postgres/Neon) backend; Flutter 3.27.4 + Riverpod 2.6.1 (codegen) + Dio frontend.

## Global Constraints

- DB en inglés snake_case; código en inglés, dominio en español donde aporta. Copiado verbatim del proyecto.
- Dinero = `NUMERIC(15,2)`; Drizzle lo expone como `string`; el dominio parsea y usa `roundMoney` (centavos exactos). Nunca float.
- Migraciones aditivas (ADD COLUMN con default) → no rompen datos existentes.
- TypeScript estricto, sin `any`. Métodos cortos con JSDoc en español.
- Flutter: no SFC; `flutter analyze` sin warnings. Riverpod codegen (`@riverpod` + `build_runner`).
- Aislamiento por `user_id` en toda query.
- **Cambios de BD requieren autorización explícita del usuario antes de aplicar a Neon** (regla del proyecto, no se salta).
- Backend corre sin watch: tras cambios, `npm run build` + reiniciar `node dist/main.js`.

---

### Task 1: Migración 0013 — columna `opening_balance` en `accounts`

**Files:**
- Modify: `backend/src/db/schema.ts` (tabla `accounts`)
- Create (generado): `backend/drizzle/0013_*.sql` + `backend/drizzle/meta/0013_snapshot.json`

**Interfaces:**
- Produces: columna `accounts.opening_balance NUMERIC(15,2) NOT NULL DEFAULT '0'`; en Drizzle `accounts.openingBalance` (string).

- [ ] **Step 1: Agregar la columna al schema Drizzle**

En `backend/src/db/schema.ts`, dentro de `export const accounts = pgTable('accounts', { ... })`, justo después de `effectiveAnnualRate`, agregar:

```ts
    openingBalance: numeric('opening_balance', { precision: 15, scale: 2 })
      .notNull()
      .default('0'), // saldo de apertura; punto de partida del saldo calculado
```

- [ ] **Step 2: Generar la migración (offline, no toca la BD)**

Run: `cd backend && npm run db:generate`
Expected: crea `drizzle/0013_*.sql` con `ALTER TABLE "accounts" ADD COLUMN "opening_balance" numeric(15, 2) DEFAULT '0' NOT NULL;`. Verifícalo con `cat drizzle/0013_*.sql`.

- [ ] **Step 3: PEDIR AUTORIZACIÓN DE BD y aplicar a Neon**

Presentar al usuario el objeto afectado y el rollback, y **esperar aprobación**:
- Objeto: TABLE `accounts` → ADD COLUMN `opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0`.
- Rollback: `ALTER TABLE accounts DROP COLUMN opening_balance;`

Tras aprobación: `cd backend && npm run db:migrate`
Expected: `migrations applied successfully!`. Verificar: `psql "$DATABASE_URL" -c "\d accounts" | grep opening_balance`.

- [ ] **Step 4: Compilar**

Run: `cd backend && npm run build`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle/
git commit -m "feat(accounts): migracion 0013 - opening_balance en accounts"
```

---

### Task 2: Dominio puro — cálculo de saldo y libro mayor

**Files:**
- Create: `backend/src/domain/account/account-balance.ts`
- Test: `backend/src/domain/account/account-balance.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Anchor = { date: string; value: number; source: 'opening' | 'snapshot' };
  export type MovementKind = 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  export type Movement = {
    occurredOn: string; kind: MovementKind; amount: number;
    description: string | null; categoryName: string | null; counterparty: string | null;
  };
  export type LedgerEntry = Movement & { signedAmount: number; runningBalance: number };
  export function resolveAnchor(opening: Anchor, snapshots: { asOfDate: string; balance: number }[]): Anchor;
  export function computeLedger(anchor: Anchor, movements: Movement[]): { balance: number; entries: LedgerEntry[] };
  ```

- [ ] **Step 1: Escribir el test que falla**

Create `backend/src/domain/account/account-balance.spec.ts`:

```ts
import { computeLedger, resolveAnchor, Movement } from './account-balance';

const opening = { date: '2026-01-01', value: 100000, source: 'opening' as const };

describe('resolveAnchor', () => {
  it('usa la apertura cuando no hay snapshots', () => {
    expect(resolveAnchor(opening, [])).toEqual(opening);
  });
  it('usa el snapshot más reciente <= hoy', () => {
    const anchor = resolveAnchor(opening, [
      { asOfDate: '2026-03-01', balance: 500000 },
      { asOfDate: '2026-05-01', balance: 800000 },
    ]);
    expect(anchor).toEqual({ date: '2026-05-01', value: 800000, source: 'snapshot' });
  });
});

describe('computeLedger', () => {
  const mv = (occurredOn: string, kind: Movement['kind'], amount: number): Movement => ({
    occurredOn, kind, amount, description: null, categoryName: null, counterparty: null,
  });

  it('suma income y transfer_in, resta expense y transfer_out con saldo corriente', () => {
    const anchor = { date: '2026-06-01', value: 1000000, source: 'snapshot' as const };
    const r = computeLedger(anchor, [
      mv('2026-06-02', 'income', 200000),
      mv('2026-06-03', 'expense', 80000),
      mv('2026-06-04', 'transfer_in', 50000),
      mv('2026-06-05', 'transfer_out', 30000),
    ]);
    expect(r.balance).toBe(1140000);
    expect(r.entries.map((e) => e.runningBalance)).toEqual([1200000, 1120000, 1170000, 1140000]);
    expect(r.entries[1].signedAmount).toBe(-80000);
  });

  it('sin movimientos, el saldo es el del ancla', () => {
    const anchor = { date: '2026-06-01', value: 777777, source: 'opening' as const };
    expect(computeLedger(anchor, []).balance).toBe(777777);
  });

  it('ordena por fecha ascendente antes de acumular', () => {
    const anchor = { date: '2026-06-01', value: 0, source: 'opening' as const };
    const r = computeLedger(anchor, [mv('2026-06-10', 'income', 100), mv('2026-06-05', 'income', 50)]);
    expect(r.entries.map((e) => e.occurredOn)).toEqual(['2026-06-05', '2026-06-10']);
    expect(r.balance).toBe(150);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `cd backend && npx jest account-balance`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar el dominio**

Create `backend/src/domain/account/account-balance.ts`:

```ts
import { roundMoney } from '../shared/money';

/** Punto de partida del saldo: apertura de la cuenta o un snapshot que recalibra. */
export type Anchor = { date: string; value: number; source: 'opening' | 'snapshot' };

/** Tipo de movimiento que afecta el saldo de una cuenta. */
export type MovementKind = 'income' | 'expense' | 'transfer_in' | 'transfer_out';

/** Movimiento normalizado (monto siempre positivo; el signo lo da el kind). */
export type Movement = {
  occurredOn: string;
  kind: MovementKind;
  amount: number;
  description: string | null;
  categoryName: string | null;
  counterparty: string | null;
};

/** Movimiento con su monto firmado y el saldo corriente tras aplicarlo. */
export type LedgerEntry = Movement & { signedAmount: number; runningBalance: number };

/**
 * Elige el ancla: el snapshot más reciente con fecha <= hoy, o la apertura si no hay.
 * @param opening - Ancla de apertura (fecha de creación + opening_balance).
 * @param snapshots - Snapshots de la cuenta (cualquier orden).
 * @returns El ancla efectiva.
 */
export function resolveAnchor(
  opening: Anchor,
  snapshots: { asOfDate: string; balance: number }[],
): Anchor {
  const latest = snapshots
    .filter((s) => s.asOfDate <= today())
    .sort((a, b) => a.asOfDate.localeCompare(b.asOfDate))
    .at(-1);
  if (!latest) return opening;
  return { date: latest.asOfDate, value: latest.balance, source: 'snapshot' };
}

/**
 * Aplica los movimientos (posteriores al ancla) en orden cronológico y calcula el
 * saldo final y el saldo corriente de cada entrada.
 * @param anchor - Punto de partida.
 * @param movements - Movimientos con occurred_on > anchor.date.
 * @returns El saldo final y las entradas con saldo corriente.
 */
export function computeLedger(
  anchor: Anchor,
  movements: Movement[],
): { balance: number; entries: LedgerEntry[] } {
  const ordered = [...movements].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
  let running = anchor.value;
  const entries: LedgerEntry[] = ordered.map((m) => {
    const sign = m.kind === 'income' || m.kind === 'transfer_in' ? 1 : -1;
    const signedAmount = roundMoney(sign * m.amount);
    running = roundMoney(running + signedAmount);
    return { ...m, signedAmount, runningBalance: running };
  });
  return { balance: running, entries };
}

/** Fecha de hoy en formato YYYY-MM-DD. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `cd backend && npx jest account-balance`
Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/account/
git commit -m "feat(domain): calculo de saldo y libro mayor de cuentas (account-balance)"
```

---

### Task 3: Repositorio — movimientos del libro mayor y saldos para la lista

**Files:**
- Modify: `backend/src/modules/accounts/accounts.repository.ts`

**Interfaces:**
- Consumes: `Movement` de Task 2.
- Produces en `AccountsRepository`:
  - `findLedgerMovements(userId: string, accountId: string, sinceDate: string): Promise<Movement[]>`
  - `findAccountSnapshots(accountId: string): Promise<{ asOfDate: string; balance: number }[]>` (reusa `listSnapshots` si ya devuelve eso; si no, este wrapper).
  - `create(...)` ahora acepta `openingBalance` en `NewAccountValues` (ya viene del schema inferido).

- [ ] **Step 1: Agregar el método de movimientos del libro mayor**

En `backend/src/modules/accounts/accounts.repository.ts`, importar lo necesario al inicio (junto a los imports existentes de drizzle-orm y schema):

```ts
import { transactions, transfers, categories } from '../../db/schema';
import { Movement } from '../../domain/account/account-balance';
```

Y agregar el método a la clase `AccountsRepository`:

```ts
  /**
   * Trae los movimientos (transacciones y transferencias) de una cuenta posteriores
   * a una fecha, normalizados para el cálculo de saldo. Aislado por user_id.
   * @param userId - Dueño de la cuenta.
   * @param accountId - UUID de la cuenta.
   * @param sinceDate - Fecha del ancla (exclusiva): solo occurred_on > sinceDate.
   * @returns Movimientos normalizados (sin ordenar; el dominio ordena).
   */
  async findLedgerMovements(
    userId: string,
    accountId: string,
    sinceDate: string,
  ): Promise<Movement[]> {
    // Transacciones de la cuenta (income/expense según el tipo de su categoría).
    const txRows = await this.db
      .select({
        occurredOn: transactions.occurredOn,
        amount: transactions.amount,
        description: transactions.description,
        categoryName: categories.name,
        categoryType: categories.type,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, accountId),
          gt(transactions.occurredOn, sinceDate),
        ),
      );

    // Transferencias entrantes (to) y salientes (from) de la cuenta.
    const fromAcc = alias(accounts, 'from_acc');
    const toAcc = alias(accounts, 'to_acc');
    const trRows = await this.db
      .select({
        occurredOn: transfers.occurredOn,
        amount: transfers.amount,
        description: transfers.description,
        fromId: transfers.fromAccountId,
        toId: transfers.toAccountId,
        fromName: fromAcc.name,
        toName: toAcc.name,
      })
      .from(transfers)
      .innerJoin(fromAcc, eq(transfers.fromAccountId, fromAcc.id))
      .innerJoin(toAcc, eq(transfers.toAccountId, toAcc.id))
      .where(
        and(
          eq(transfers.userId, userId),
          gt(transfers.occurredOn, sinceDate),
          or(eq(transfers.fromAccountId, accountId), eq(transfers.toAccountId, accountId)),
        ),
      );

    const txMovements: Movement[] = txRows.map((r) => ({
      occurredOn: r.occurredOn,
      kind: r.categoryType === 'income' ? 'income' : 'expense',
      amount: Number(r.amount),
      description: r.description,
      categoryName: r.categoryName,
      counterparty: null,
    }));

    const trMovements: Movement[] = trRows.map((r) => {
      const incoming = r.toId === accountId;
      return {
        occurredOn: r.occurredOn,
        kind: incoming ? 'transfer_in' : 'transfer_out',
        amount: Number(r.amount),
        description: r.description,
        categoryName: null,
        counterparty: incoming ? r.fromName : r.toName,
      };
    });

    return [...txMovements, ...trMovements];
  }

  /**
   * Devuelve los snapshots de una cuenta en forma { asOfDate, balance } numérica.
   * @param accountId - UUID de la cuenta.
   * @returns Snapshots para resolver el ancla.
   */
  async findAccountSnapshots(accountId: string): Promise<{ asOfDate: string; balance: number }[]> {
    const rows = await this.listSnapshots(accountId);
    return rows.map((s) => ({ asOfDate: s.asOfDate, balance: Number(s.balance) }));
  }
```

Asegurar que los imports de `and, eq, gt, or` y `alias` existan al inicio del archivo:
```ts
import { and, eq, gt, or, desc, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
```
(añade solo los que falten; `accounts`, `accountSnapshots` ya están importados de `../../db/schema`).

- [ ] **Step 2: Compilar**

Run: `cd backend && npm run build`
Expected: sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/accounts/accounts.repository.ts
git commit -m "feat(accounts): consulta de movimientos del libro mayor por cuenta"
```

---

### Task 4: Servicio + endpoint — `GET /accounts/:id/ledger` y `balance` en la lista

**Files:**
- Create: `backend/src/modules/accounts/dto/ledger.dto.ts`
- Modify: `backend/src/modules/accounts/dto/account-response.dto.ts` (campo `balance`)
- Modify: `backend/src/modules/accounts/dto/create-account.dto.ts` (campo `openingBalance`)
- Modify: `backend/src/modules/accounts/accounts.service.ts`
- Modify: `backend/src/modules/accounts/accounts.controller.ts`
- Test: `backend/src/modules/accounts/accounts.service.spec.ts`

**Interfaces:**
- Consumes: `resolveAnchor`, `computeLedger` (Task 2); `findLedgerMovements`, `findAccountSnapshots` (Task 3).
- Produces: `AccountsService.getLedger(userId, accountId): Promise<LedgerDto>`; `AccountResponseDto.balance: number`.

- [ ] **Step 1: Crear el DTO del libro mayor**

Create `backend/src/modules/accounts/dto/ledger.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

/** Ancla del saldo: punto de partida del cálculo. */
export class AnchorDto {
  @ApiProperty({ example: '2026-06-15' })
  date!: string;
  @ApiProperty({ example: 1000000 })
  value!: number;
  @ApiProperty({ enum: ['opening', 'snapshot'], example: 'snapshot' })
  source!: string;
}

/** Una entrada del libro mayor (movimiento con saldo corriente). */
export class LedgerEntryDto {
  @ApiProperty({ example: '2026-06-20' })
  occurredOn!: string;
  @ApiProperty({ enum: ['income', 'expense', 'transfer_in', 'transfer_out'] })
  kind!: string;
  @ApiProperty({ example: 80000 })
  amount!: number;
  @ApiProperty({ example: -80000 })
  signedAmount!: number;
  @ApiProperty({ example: 920000 })
  runningBalance!: number;
  @ApiProperty({ nullable: true, example: 'Mercado' })
  description!: string | null;
  @ApiProperty({ nullable: true, example: 'Alimentación' })
  categoryName!: string | null;
  @ApiProperty({ nullable: true, example: 'Ahorros' })
  counterparty!: string | null;
}

/** Libro mayor de una cuenta: saldo actual, ancla y movimientos. */
export class LedgerDto {
  @ApiProperty({ example: 1140000 })
  balance!: number;
  @ApiProperty({ type: AnchorDto })
  anchor!: AnchorDto;
  @ApiProperty({ type: [LedgerEntryDto] })
  movements!: LedgerEntryDto[];
}
```

- [ ] **Step 2: Agregar `balance` al `AccountResponseDto` y `openingBalance` al `CreateAccountDto`**

En `account-response.dto.ts`, antes de `createdAt`:
```ts
  @ApiProperty({ description: 'Saldo calculado de la cuenta (apertura + movimientos).', example: 1140000 })
  balance!: number;
```

En `create-account.dto.ts`, agregar (con imports `IsNumber`, `Min` de class-validator):
```ts
  @ApiPropertyOptional({ description: 'Saldo de apertura de la cuenta.', example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;
```

- [ ] **Step 3: Escribir el test del servicio (libro mayor)**

En `backend/src/modules/accounts/accounts.service.spec.ts`, añadir al fake repo los métodos `findByIdForUser`, `findAccountSnapshots`, `findLedgerMovements` (jest.fn()) y un test:

```ts
describe('getLedger', () => {
  it('calcula el saldo desde el ancla y los movimientos', async () => {
    repo.findByIdForUser.mockResolvedValue({
      id: 'a1', userId: 'u1', name: 'Nequi', openingBalance: '100000',
      createdAt: new Date('2026-01-01'), source: 'manual',
    } as never);
    repo.findAccountSnapshots.mockResolvedValue([]);
    repo.findLedgerMovements.mockResolvedValue([
      { occurredOn: '2026-06-02', kind: 'income', amount: 50000, description: null, categoryName: 'Salario', counterparty: null },
    ]);

    const ledger = await service.getLedger('u1', 'a1');

    expect(ledger.balance).toBe(150000);
    expect(ledger.anchor.source).toBe('opening');
    expect(ledger.movements[0].runningBalance).toBe(150000);
  });

  it('lanza 404 si la cuenta no es del usuario', async () => {
    repo.findByIdForUser.mockResolvedValue(undefined as never);
    await expect(service.getLedger('u1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```
(Ajustar la construcción del `service`/`repo` al patrón ya usado en ese spec.)

- [ ] **Step 4: Correr el test (debe fallar)**

Run: `cd backend && npx jest accounts.service`
Expected: FAIL (`getLedger` no existe).

- [ ] **Step 5: Implementar `getLedger` y el saldo en `findAll` y `create`**

En `accounts.service.ts` importar:
```ts
import { resolveAnchor, computeLedger } from '../../domain/account/account-balance';
import { LedgerDto } from './dto/ledger.dto';
```

Agregar el método:
```ts
  /**
   * Construye el libro mayor de una cuenta: saldo calculado, ancla y movimientos.
   * @param userId - Dueño de la cuenta.
   * @param accountId - UUID de la cuenta.
   * @returns El libro mayor.
   * @throws NotFoundException si la cuenta no es del usuario.
   */
  async getLedger(userId: string, accountId: string): Promise<LedgerDto> {
    const account = await this.accountsRepository.findByIdForUser(accountId, userId);
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    const opening = {
      date: account.createdAt.toISOString().slice(0, 10),
      value: Number(account.openingBalance),
      source: 'opening' as const,
    };
    const snapshots = await this.accountsRepository.findAccountSnapshots(accountId);
    const anchor = resolveAnchor(opening, snapshots);
    const movements = await this.accountsRepository.findLedgerMovements(userId, accountId, anchor.date);
    const { balance, entries } = computeLedger(anchor, movements);
    return { balance, anchor, movements: entries };
  }
```

Para el saldo en la lista, agregar un helper `private async balanceOf(userId, account)` que reutilice la misma lógica, y úsalo en `findAll` y en `toResponse`. Cambiar `toResponse` para aceptar el saldo:

```ts
  /**
   * Calcula el saldo de una cuenta (apertura/snapshot + movimientos).
   * @param userId - Dueño.
   * @param account - Fila de la cuenta.
   * @returns El saldo calculado.
   */
  private async balanceOf(userId: string, account: AccountRow): Promise<number> {
    const opening = {
      date: account.createdAt.toISOString().slice(0, 10),
      value: Number(account.openingBalance),
      source: 'opening' as const,
    };
    const snapshots = await this.accountsRepository.findAccountSnapshots(account.id);
    const anchor = resolveAnchor(opening, snapshots);
    const movements = await this.accountsRepository.findLedgerMovements(userId, account.id, anchor.date);
    return computeLedger(anchor, movements).balance;
  }
```

En `findAll`, calcular el saldo de cada cuenta y pasarlo a `toResponse`:
```ts
  async findAll(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountsRepository.findAllByUser(userId);
    return Promise.all(
      accounts.map(async (a) => this.toResponse(a, await this.balanceOf(userId, a))),
    );
  }
```

En `create`, pasar `openingBalance` al repo y devolver el saldo (= apertura, sin movimientos aún):
```ts
    const account = await this.accountsRepository.create(userId, {
      name,
      color: dto.color ?? '#2D6FB0',
      openingBalance: (dto.openingBalance ?? 0).toFixed(2),
    });
    return this.toResponse(account, dto.openingBalance ?? 0);
```

Actualizar `toResponse` para incluir `balance` (segundo parámetro con default 0 en los llamados que no lo calculan, p. ej. `update`/`setYield` pueden pasar `await this.balanceOf(...)` o 0 si no se requiere exactitud ahí):
```ts
  private toResponse(account: AccountRow, balance = 0): AccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      color: account.color,
      kind: account.kind,
      source: account.source,
      yieldType: account.yieldType,
      effectiveAnnualRate: account.effectiveAnnualRate ? Number(account.effectiveAnnualRate) : null,
      balance,
      createdAt: account.createdAt,
    };
  }
```
(En `update` y `setYield`, pasar `await this.balanceOf(userId, updated)` para que el saldo sea correcto.)

- [ ] **Step 6: Agregar el endpoint en el controller**

En `accounts.controller.ts` importar `LedgerDto` y agregar (antes de `@Patch(':id')`):
```ts
  /**
   * Devuelve el libro mayor de una cuenta: saldo calculado, ancla y movimientos.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la cuenta.
   * @returns El libro mayor.
   */
  @Get(':id/ledger')
  @ApiOperation({ summary: 'Libro mayor de una cuenta (saldo calculado y movimientos)' })
  @ApiParam({ name: 'id', description: 'UUID de la cuenta', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Libro mayor.', type: LedgerDto })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada.' })
  ledger(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LedgerDto> {
    return this.accountsService.getLedger(userId, id);
  }
```

- [ ] **Step 7: Correr tests y build**

Run: `cd backend && npx jest accounts && npm run build`
Expected: PASS + build sin errores.

- [ ] **Step 8: Reiniciar backend y smoke test**

Run: rebuild + reiniciar `node dist/main.js`. Con un token, crear cuenta con `openingBalance`, registrar una transacción/transferencia en esa cuenta, y `GET /accounts/:id/ledger` → verificar `balance`, `anchor` y `movements`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/accounts/
git commit -m "feat(accounts): endpoint de libro mayor y saldo calculado en la lista"
```

---

### Task 5: Flutter — capa de datos (entidades, mapper, repo, provider, opening_balance)

**Files:**
- Create: `app/lib/features/budget/domain/entities/account_ledger.dart`
- Modify: `app/lib/features/budget/domain/entities/account.dart` (+`balance`, +`openingBalance`)
- Modify: `app/lib/features/budget/data/budget_mappers.dart` (mapper de ledger + balance/openingBalance en account)
- Modify: `app/lib/features/budget/domain/repositories/budget_repository.dart` (+`accountLedger`)
- Modify: `app/lib/features/budget/data/budget_repository_impl.dart` (impl)
- Modify: `app/lib/features/budget/presentation/providers/budget_providers.dart` (+`accountLedgerProvider`)
- Modify: `app/lib/features/budget/domain/entities/...params` y `add_account_screen` (opening en alta — en Task 6 la UI; aquí el param)

**Interfaces:**
- Consumes: `LedgerDto` JSON del backend (Task 4).
- Produces: `AccountLedger`, `LedgerMovement`, `Account.balance`, `accountLedgerProvider(accountId)`.

- [ ] **Step 1: Crear las entidades del libro mayor**

Create `app/lib/features/budget/domain/entities/account_ledger.dart`:

```dart
/// Una entrada del libro mayor de una cuenta (movimiento con saldo corriente).
class LedgerMovement {
  const LedgerMovement({
    required this.occurredOn,
    required this.kind,
    required this.amount,
    required this.signedAmount,
    required this.runningBalance,
    this.description,
    this.categoryName,
    this.counterparty,
  });

  /// Fecha del movimiento (YYYY-MM-DD).
  final String occurredOn;

  /// 'income' | 'expense' | 'transfer_in' | 'transfer_out'.
  final String kind;

  final double amount;
  final double signedAmount;
  final double runningBalance;
  final String? description;
  final String? categoryName;
  final String? counterparty;

  bool get isPositive => signedAmount >= 0;
}

/// Libro mayor de una cuenta: saldo calculado, origen del ancla y movimientos.
class AccountLedger {
  const AccountLedger({
    required this.balance,
    required this.anchorDate,
    required this.anchorSource,
    required this.movements,
  });

  final double balance;
  final String anchorDate;

  /// 'opening' o 'snapshot'.
  final String anchorSource;
  final List<LedgerMovement> movements;
}
```

- [ ] **Step 2: Agregar `balance` y `openingBalance` a `Account`**

En `account.dart`, agregar al constructor y a los campos:
```dart
    this.balance = 0,
    this.openingBalance = 0,
```
```dart
  /// Saldo calculado (apertura + movimientos).
  final double balance;

  /// Saldo de apertura de la cuenta.
  final double openingBalance;
```

- [ ] **Step 3: Mapper del ledger y de los nuevos campos de cuenta**

En `budget_mappers.dart`, en el mapper `accountFromJson`, leer `balance` y `openingBalance` (con defaults seguros):
```dart
  balance: (json['balance'] as num?)?.toDouble() ?? 0,
  openingBalance: (json['openingBalance'] as num?)?.toDouble() ?? 0,
```
Y agregar:
```dart
/// Mapea el JSON del libro mayor a la entidad.
AccountLedger accountLedgerFromJson(Map<String, dynamic> json) {
  final anchor = json['anchor'] as Map<String, dynamic>;
  return AccountLedger(
    balance: (json['balance'] as num).toDouble(),
    anchorDate: anchor['date'] as String,
    anchorSource: anchor['source'] as String,
    movements: (json['movements'] as List<dynamic>)
        .map((e) => _ledgerMovementFromJson(e as Map<String, dynamic>))
        .toList(),
  );
}

LedgerMovement _ledgerMovementFromJson(Map<String, dynamic> json) => LedgerMovement(
      occurredOn: json['occurredOn'] as String,
      kind: json['kind'] as String,
      amount: (json['amount'] as num).toDouble(),
      signedAmount: (json['signedAmount'] as num).toDouble(),
      runningBalance: (json['runningBalance'] as num).toDouble(),
      description: json['description'] as String?,
      categoryName: json['categoryName'] as String?,
      counterparty: json['counterparty'] as String?,
    );
```
(Importar `account_ledger.dart` en el mapper.)

- [ ] **Step 4: Contrato + impl del repositorio**

En `domain/repositories/budget_repository.dart`, agregar:
```dart
  /// Trae el libro mayor (saldo calculado + movimientos) de una cuenta.
  Future<AccountLedger> accountLedger(String accountId);
```
En `data/budget_repository_impl.dart`, agregar (patrón Dio como `accountSnapshots`):
```dart
  @override
  Future<AccountLedger> accountLedger(String accountId) {
    return _send(() async {
      final res = await _dio.get<Map<String, dynamic>>('/accounts/$accountId/ledger');
      return accountLedgerFromJson(res.data!);
    });
  }
```
Y en el envío de creación de cuenta, incluir `openingBalance` en el body (donde se arma `CreateAccountParams.toJson()` / el post a `/accounts`).

- [ ] **Step 5: Provider Riverpod**

En `presentation/providers/budget_providers.dart`, agregar:
```dart
/// Provee el libro mayor de una cuenta.
@riverpod
Future<AccountLedger> accountLedger(Ref ref, String accountId) {
  return getIt<BudgetRepository>().accountLedger(accountId);
}
```
(Importar `account_ledger.dart`.)

- [ ] **Step 6: Regenerar código y analizar**

Run: `cd app && fvm dart run build_runner build --delete-conflicting-outputs && fvm flutter analyze`
Expected: genera `budget_providers.g.dart`; analyze "No issues found!".

- [ ] **Step 7: Commit**

```bash
git add app/lib/features/budget/
git commit -m "feat(app): capa de datos del libro mayor de cuentas"
```

---

### Task 6: Flutter — UI (saldo en lista, movimientos en detalle, apertura en alta)

**Files:**
- Modify: `app/lib/features/budget/presentation/screens/accounts_screen.dart` (saldo por cuenta)
- Modify: `app/lib/features/budget/presentation/screens/account_detail_screen.dart` (sección Movimientos + saldo; re-rotular snapshots)
- Modify: `app/lib/features/budget/presentation/screens/add_account_screen.dart` (campo Saldo de apertura)
- Modify: `app/lib/shared/money_format.dart` solo si hace falta un helper de signo (probablemente no).

**Interfaces:**
- Consumes: `Account.balance`, `accountLedgerProvider` (Task 5).

- [ ] **Step 1: Mostrar el saldo calculado en la lista**

En `accounts_screen.dart`, en el `ListTile` de cada cuenta, poner el saldo en el `trailing` (o subtítulo) con `formatCop(account.balance)`. Mantener el badge "Vinculado". Ejemplo de trailing:
```dart
trailing: Text(formatCop(account.balance),
    style: Theme.of(context).textTheme.titleMedium),
```

- [ ] **Step 2: Sección de movimientos + saldo en el detalle**

En `account_detail_screen.dart`, agregar un widget que observe `accountLedgerProvider(account.id)`:
```dart
final ledgerAsync = ref.watch(accountLedgerProvider(account.id));
```
Renderizar: encabezado con `formatCop(ledger.balance)` y el origen del ancla
(`ledger.anchorSource == 'opening' ? 'Desde apertura' : 'Desde el saldo del ${ledger.anchorDate}'`),
y una lista (más reciente arriba: `ledger.movements.reversed`) con ícono/color por `kind`
(income/transfer_in en `colorScheme.primary` con `+`, expense/transfer_out en `colorScheme.error` con `−`),
descripción/categoría/contraparte, monto firmado (`formatCop(m.signedAmount)`) y saldo corriente.
Estado vacío: "Aún no hay movimientos en esta cuenta.".

Re-rotular la sección de snapshots existente a **"Recalibrar saldo"** y su texto a algo como
"Registra el saldo real en una fecha; desde ahí se recalcula con tus movimientos.".

- [ ] **Step 3: Campo Saldo de apertura en el alta**

En `add_account_screen.dart`, agregar un `TextFormField` numérico **Saldo de apertura** (default vacío = 0), incluirlo en los params de creación y enviarlo como `openingBalance` (fracción/valor según el backend espera número). Validación: número ≥ 0 (opcional).

- [ ] **Step 4: Analizar**

Run: `cd app && fvm flutter analyze`
Expected: "No issues found!".

- [ ] **Step 5: Commit**

```bash
git add app/lib/features/budget/presentation/
git commit -m "feat(app): saldo calculado en la lista y libro mayor en el detalle de cuenta"
```

---

### Task 7: Verificación end-to-end en simulador iOS

**Files:**
- Create: `app/integration_test/account_ledger_test.dart`

- [ ] **Step 1: Escribir el integration test**

Create `app/integration_test/account_ledger_test.dart` siguiendo el patrón de los otros
integration tests (registrar usuario único, navegar). Flujo: registrarse → crear una cuenta
con saldo de apertura → registrar un movimiento en esa cuenta (transacción) → abrir el detalle
de la cuenta → verificar que aparece el saldo calculado y al menos un movimiento en la lista.
Usar `find.text`/`find.byIcon` y los helpers `pumpUntil` de los tests existentes.

- [ ] **Step 2: Backend arriba + correr el test en el simulador**

Run (backend corriendo, con `ENCRYPTION_KEY` en `.env`):
```bash
cd app && fvm flutter test integration_test/account_ledger_test.dart -d <udid-simulador-ios>
```
Expected: `All tests passed!`.

- [ ] **Step 3: Suite completa + analyze finales**

Run: `cd backend && npm test` (espera 280+ tests verdes, incluidos los nuevos) y `cd app && fvm flutter analyze` ("No issues found!").

- [ ] **Step 4: Commit**

```bash
git add app/integration_test/account_ledger_test.dart
git commit -m "test(app): e2e del libro mayor de cuentas en simulador iOS"
```

---

## Self-Review

**Spec coverage:**
- Regla de saldo (ancla + movimientos) → Task 2 (dominio) + Task 3 (datos) + Task 4 (servicio). ✓
- Migración `opening_balance` → Task 1. ✓
- Endpoint `GET /accounts/:id/ledger` → Task 4. ✓
- `balance` en la lista / Patrimonio → Task 4 (`findAll`). ✓ (El Patrimonio que ya suma snapshots seguirá funcionando; migrar la tarjeta de patrimonio a `balance` es trivial y queda cubierto por exponer `balance`; si se quiere el cambio de fuente del net-worth, es parte de #3.)
- UI saldo + movimientos + apertura → Tasks 5–6. ✓
- Tests dominio/servicio/e2e → Tasks 2, 4, 7. ✓

**Placeholder scan:** sin TBD/TODO; todos los pasos con código o comandos concretos. ✓

**Type consistency:** `Movement`/`Anchor`/`LedgerEntry` (Task 2) se consumen igual en Tasks 3–4; `LedgerDto`/`AccountLedger` coinciden en forma entre backend (Task 4) y Flutter (Task 5). ✓

**Nota de alcance:** el net-worth sigue calculándose desde snapshots (no se cambia su fuente aquí); cambiarlo a `balance` calculado es parte del sub-proyecto #3 (Patrimonio activos−pasivos).
