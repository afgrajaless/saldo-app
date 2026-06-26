# Cuentas como libro mayor — saldo calculado + movimientos (sub-proyecto #1)

> Diseño aprobado. Primer sub-proyecto de la mejora de la sección **Cuentas**.
> Fecha: 2026-06-26. Rama: `feat/open-finance` (o una rama nueva `feat/account-ledger`).

## 1. Contexto y problema

Hoy la sección **Cuentas** está desconectada del dinero que realmente se mueve. El
detalle de una cuenta muestra configuración de rendimiento, un gráfico de proyección
y **snapshots** (saldos registrados a mano), pero **no muestra los movimientos**
(ingresos, egresos, transferencias) que pasan por esa cuenta, y el **saldo es manual**
(el último snapshot), no calculado. La pantalla se siente más "configuración + gráfico"
que "libro mayor de mi plata".

Las transacciones ya llevan `account_id` y las transferencias `from/to_account_id`,
así que el dato existe; solo falta **conectarlo y calcular el saldo**.

Este es el **cimiento** de tres sub-proyectos posteriores que dependen de él:
- #2 Insights por cuenta (agregaciones sobre estos movimientos).
- #3 Patrimonio activos−pasivos (suma de estos saldos − tarjetas − deudas).
- #4 Conciliación (saldo calculado vs snapshot/banco).

## 2. Objetivo y alcance

**Objetivo:** que cada cuenta de activo muestre un **saldo calculado** desde sus
movimientos reales y un **libro mayor** (lista cronológica con saldo corriente).

**Incluye:**
- Campo **saldo de apertura** por cuenta.
- Cálculo del saldo (ancla + movimientos) en dominio puro testeable.
- Endpoint de libro mayor por cuenta.
- Saldo calculado en la lista de cuentas (y por tanto en el Patrimonio actual).
- UI: saldo actual + sección de movimientos en el detalle; campo de apertura en el alta.

**Fuera de alcance (specs siguientes):**
- Insights/análisis por categoría (#2).
- Patrimonio neto activos−pasivos completo (#3).
- Conciliación con detección de diferencias (#4).
- Tarjetas de crédito (tienen su propia lógica de extracto; este sub-proyecto es solo
  cuentas de activo, `kind = 'asset'`).

## 3. Regla de saldo (decidida)

Modelo **"saldo de apertura + snapshots que recalibran"**:

```
ancla = el snapshot más reciente de la cuenta con as_of_date <= hoy
        si no hay snapshot → { date: fecha de creación de la cuenta, value: opening_balance }

saldo = ancla.value
        + Σ transacciones de categoría income   con occurred_on > ancla.date   (signo +)
        − Σ transacciones de categoría expense  con occurred_on > ancla.date   (signo −)
        + Σ transferencias entrantes (to_account_id = cuenta) con occurred_on > ancla.date
        − Σ transferencias salientes (from_account_id = cuenta) con occurred_on > ancla.date
```

Notas:
- El **signo de una transacción** sale del `category_type` de su categoría
  (income = +, expense = −).
- Las **transferencias no** cuentan como ingreso/egreso del presupuesto (ya es así),
  pero **sí** mueven el saldo de la cuenta.
- **Cuentas vinculadas (Open Finance):** el `sync` ya inserta un snapshot por cuenta,
  así que recalibran solas con el saldo del banco + movimientos manuales posteriores.
- Movimientos **anteriores** a la fecha del ancla se ignoran (los cubre el ancla).
- El "saldo corriente" (running balance) del libro mayor parte del valor del ancla y
  se acumula movimiento a movimiento en orden cronológico ascendente.

## 4. Modelo de datos

**Migración 0013 (aditiva):**
```sql
ALTER TABLE accounts ADD COLUMN opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0;
```
- Rollback: `ALTER TABLE accounts DROP COLUMN opening_balance;`
- Las cuentas existentes quedan con apertura `0` (su saldo será apertura 0 +
  movimientos, o el snapshot que ya tengan recalibra). Sin pérdida de datos.
- La fecha de apertura es la **fecha de creación** de la cuenta (`created_at::date`);
  no se agrega columna de fecha de apertura (YAGNI).

Drizzle: agregar `openingBalance: numeric('opening_balance', { precision: 15, scale: 2 }).notNull().default('0')`
al `accounts` de `src/db/schema.ts` y generar la migración con `db:generate`.

## 5. Backend

### 5.1 Dominio puro — `src/domain/account/account-balance.ts`
Lógica sin BD, 100% testeable.

```ts
type Anchor = { date: string; value: number; source: 'opening' | 'snapshot' };
type Movement = {
  occurredOn: string;
  kind: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: number;        // siempre positivo
  description: string | null;
  // metadatos opcionales para la UI (categoría, contraparte) los arma el repo
};
type LedgerEntry = Movement & { signedAmount: number; runningBalance: number };

// Elige el ancla: snapshot más reciente <= hoy, o la apertura.
function resolveAnchor(opening: Anchor, snapshots: {asOfDate: string; balance: number}[]): Anchor

// Aplica los movimientos (ya filtrados a occurred_on > ancla.date) en orden y
// devuelve el saldo final + las entradas con saldo corriente.
function computeLedger(anchor: Anchor, movements: Movement[]): { balance: number; entries: LedgerEntry[] }
```
Usa `roundMoney` (centavos exactos) del dominio compartido. El signo: income/transfer_in
= `+amount`, expense/transfer_out = `−amount`.

### 5.2 Repositorio — `AccountsRepository`
- `findLedgerMovements(userId, accountId, sinceDate)`: una query que une transacciones
  (con su `category_type` y nombre de categoría) y transferencias (con la cuenta
  contraparte), filtradas por la cuenta y `occurred_on > sinceDate`, ordenadas por
  `occurred_on, created_at`. Devuelve `Movement[]` ya normalizados.
- `findLatestSnapshot(accountId, onOrBefore)`: el snapshot ancla.
- Para la **lista**: un método que calcule el saldo de **todas** las cuentas del usuario
  sin N+1 (traer aperturas + últimos snapshots + sumas agregadas por cuenta en pocas
  queries, y combinar en memoria con el dominio).

### 5.3 Servicio + endpoints — `AccountsService` / `AccountsController`
- **`GET /accounts/:id/ledger`** → `LedgerDto`:
  ```json
  {
    "balance": 1250000.00,
    "anchor": { "date": "2026-06-15", "value": 1000000.00, "source": "snapshot" },
    "movements": [
      { "occurredOn": "2026-06-20", "kind": "expense", "description": "Mercado",
        "amount": 80000.00, "signedAmount": -80000.00, "runningBalance": 920000.00,
        "categoryName": "Alimentación", "counterparty": null }
    ]
  }
  ```
  Aislado por `user_id` (404 si la cuenta no es del usuario). Orden de `movements`:
  cronológico ascendente para que el saldo corriente tenga sentido; la UI puede invertir.
- **`GET /accounts`** (existente): cada `AccountResponseDto` gana un campo `balance`
  (saldo calculado). El Patrimonio (`net-worth` / la tarjeta de patrimonio) pasa a
  sumar estos `balance` en vez de los últimos snapshots.

### 5.4 Tests
- Dominio (`account-balance.spec.ts`): ancla por apertura vs snapshot; suma de
  income/expense/transfer_in/transfer_out; saldo corriente; orden; centavos exactos;
  cuenta sin movimientos (= ancla).
- Servicio (`accounts.service.spec.ts`): arma el DTO, 404 ajeno, lista con saldos.

## 6. Flutter

### 6.1 Capa de datos
- Entidades: `AccountLedger { balance, anchor, movements }`, `LedgerMovement
  { occurredOn, kind, description, amount, signedAmount, runningBalance, categoryName,
  counterparty }`. `Account` (+`balance`, +`openingBalance`).
- `BudgetRepository`: `accountLedger(accountId)`, y `balance` en el mapeo de cuentas.
- Provider Riverpod `accountLedgerProvider(accountId)`.

### 6.2 Pantallas
- **`accounts_screen`**: cada `ListTile` muestra el **saldo calculado** (formateado COP)
  en el `trailing`; la tarjeta de **Patrimonio** usa la suma de saldos.
- **`account_detail_screen`**:
  - Encabezado con el **saldo actual** y su origen ("Desde apertura" / "Desde el saldo
    registrado el 15/06").
  - Nueva sección **Movimientos**: lista cronológica (más reciente arriba) con ícono y
    color por tipo (ingreso verde +, egreso rojo −, transferencia neutra), descripción,
    categoría/contraparte, monto firmado y saldo corriente. Estado vacío amable.
  - La sección de snapshots se re-rotula a **"Recalibrar saldo"** con un texto que
    explique que fija el saldo real en una fecha.
- **`add_account_screen`** (y edición): campo **Saldo de apertura** (numérico, default 0).

### 6.3 Verificación
- `flutter analyze` limpio.
- Integration test en simulador iOS: crear cuenta con apertura, registrar un
  ingreso/egreso/transferencia, abrir el detalle y verificar saldo calculado + lista.

## 7. Riesgos / decisiones
- **Rendimiento de la lista**: calcular saldo de N cuentas debe evitar N+1 (agregados en
  SQL + combinación en memoria). Para una app personal el N es chico, pero se diseña sin
  N+1 igual.
- **Transacciones sin categoría**: `category_id` es obligatorio en el esquema, así que
  todo movimiento tiene tipo; no hay caso "sin signo".
- **Desfase con rendimientos**: el saldo calculado **no** incluye el devengo de
  rendimientos (eso es otra pieza pendiente del roadmap); el gráfico de proyección sigue
  siendo aparte. Un snapshot manual puede recalibrar para reflejar intereses si se desea.

## 8. Rollback
- BD: `ALTER TABLE accounts DROP COLUMN opening_balance;` (migración 0013).
- Código: el cambio es aditivo; revertir los commits del sub-proyecto restaura la
  sección a su estado actual (snapshots + proyección sin libro mayor).
