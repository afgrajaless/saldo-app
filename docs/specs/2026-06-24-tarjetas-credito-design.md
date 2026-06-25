# Tarjetas de crédito — Diseño

> Fecha: 2026-06-24
> Estado: aprobado (pendiente de revisión final del usuario)
> Proyecto: Saldo (app_financiera) · rama `develop`
> Reutiliza: dominio de amortización (francés), conversión de tasas (E.A.↔mensual),
> evaluación de usura, y los flujos existentes de `transactions` y `transfers`.

## 1. Resumen

Sección de **tarjetas de crédito** estilo extracto real, enfocada en Colombia.
Permite registrar tarjetas con su **cupo, fecha de corte y fecha de pago**, **cargar
compras** (que cuentan como gasto en el presupuesto), **diferir compras a cuotas** (con
cronograma), **pagar la tarjeta** (como transferencia), ver el **extracto estimado del
ciclo** y **reconciliarlo** con el extracto oficial del banco, con **cuota de manejo**
opcional y **alerta de usura** sobre la tasa rotativa.

### Decisiones de producto (tomadas en brainstorming)

1. **Alcance:** completo (estilo extracto real) — cargar compras, diferidos con
   cronograma, corte/pago, mínimo/total, interés rotativo, cuota de manejo opcional,
   alerta de usura.
2. **Ubicación:** **sub-vista dentro de Cuentas** (toggle "Cuentas | Tarjetas"); evita
   un 6º tab. El **próximo pago** se muestra además como recordatorio en Deudas/Resumen.
3. **Números:** **estimación + reconciliación** — la app calcula un estimado y el
   usuario ingresa los valores oficiales del extracto cuando llega.
4. **Presupuesto (accrual):** la compra cuenta como gasto en su categoría al **comprar**;
   **pagar la tarjeta es una transferencia** (no gasto). Evita doble conteo.
5. **Modelo de datos (enfoque A):** la tarjeta es una **cuenta de tipo `credit_card`**
   (pasivo), reutilizando `transactions.account_id` (cargar) y `transfers` (pagar).
6. **Pago mínimo:** **fórmula simple configurable** por tarjeta (`% del saldo + cuota de
   manejo + interés del ciclo`), entendiendo que igual se reconcilia con el real.

## 2. Alcance

### MVP
- Crear/editar tarjeta (cuenta `credit_card` + detalles).
- Cargar compras a la tarjeta (gasto en categoría); opción de **diferir a N cuotas**.
- Pagar la tarjeta vía transferencia (cuenta → tarjeta).
- Dominio: fechas de corte/pago, cronograma de diferido (francés), estimación de extracto
  y pago mínimo, evaluación de usura.
- Extracto del ciclo (estimado) + **reconciliación** con valores oficiales.
- Patrimonio: las tarjetas restan como pasivo (no generan rendimiento).
- Sub-vista "Tarjetas" en Cuentas; recordatorio de próximo pago en Deudas.

### Fuera del MVP (futuro)
- Avances en efectivo (tasa distinta + comisión).
- Seguros / cargos varios del extracto.
- Pago anticipado de un diferido (cancelar capital pendiente).
- Importar el extracto (PDF/CSV) para reconciliar automáticamente.
- Notificaciones push del próximo pago (hoy: recordatorio visible al abrir).

## 3. Modelo de datos (migración 0009, aditiva)

### `accounts` (cambio)
- Nuevo `kind` enum `account_kind` (`asset`, `credit_card`), `NOT NULL DEFAULT 'asset'`.
  Las cuentas existentes quedan `asset`. Una tarjeta es una `account` con
  `kind='credit_card'` (reusa `name`, `color`, soft delete, `user_id`).
- El **saldo** de una tarjeta = lo que se debe (cargos − pagos + intereses/cuotas); para
  patrimonio se trata como **pasivo** (resta). `yield_type` no aplica (se ignora / queda
  `none`).

### `credit_card_details` (1:1 con la cuenta-tarjeta)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK accounts **UNIQUE** | la cuenta `credit_card` |
| `credit_limit` | numeric(15,2) | cupo |
| `statement_day` | integer | día de corte (1–31) |
| `payment_day` | integer | día de pago (1–31) |
| `rotativo_rate_ea` | numeric(8,6) | tasa rotativa E.A. (fracción) |
| `min_payment_pct` | numeric(5,4) | % del saldo para el pago mínimo estimado (ej. 0.05) |
| `management_fee` | numeric(15,2) NULL | cuota de manejo (monto); null = sin cuota |
| `management_fee_period` | enum `card_fee_period` (`none`,`monthly`,`annual`) | |
| `created_at`/`updated_at` | timestamptz | |

Checks: `credit_limit > 0`; `statement_day` y `payment_day` entre 1 y 31;
`rotativo_rate_ea >= 0`; `min_payment_pct` entre 0 y 1.

### `card_installment_plans` (diferidos)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK accounts | la tarjeta |
| `transaction_id` | uuid FK transactions NULL | la compra origen (ON DELETE SET NULL) |
| `description` | text | |
| `principal` | numeric(15,2) | monto diferido (`> 0`) |
| `number_of_installments` | integer | N cuotas (`> 0`) |
| `monthly_rate` | numeric(8,6) | tasa mensual derivada del rotativo |
| `start_date` | date | |
| `status` | enum `card_plan_status` (`active`,`paid`) | |
| `created_at` | timestamptz | |

### `card_installment_items` (cronograma del diferido)
`id`, `plan_id` (FK ON DELETE cascade), `number` (int), `due_on` (date),
`principal` numeric(15,2), `interest` numeric(15,2), `balance` numeric(15,2).
Generado con el motor francés; mismo patrón que `installments` de deudas.

### `card_statements` (extractos por ciclo)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `account_id` | uuid FK accounts | la tarjeta |
| `cutoff_date` | date | fecha de corte del ciclo |
| `payment_due_date` | date | fecha límite de pago |
| `estimated_balance` | numeric(15,2) | saldo estimado del extracto |
| `estimated_min_payment` | numeric(15,2) | pago mínimo estimado |
| `reconciled_balance` | numeric(15,2) NULL | saldo oficial (reconciliación) |
| `reconciled_min_payment` | numeric(15,2) NULL | mínimo oficial |
| `reconciled_total_payment` | numeric(15,2) NULL | pago total oficial |
| `status` | enum `card_statement_status` (`open`,`closed`,`paid`) | |
| `created_at`/`updated_at` | timestamptz | |
| | | `UNIQUE(account_id, cutoff_date)` |

### Pagos y cargos (reúso, sin tablas nuevas)
- **Cargo** = `transaction` con `account_id` = tarjeta + su `category_id` (cuenta en el
  presupuesto). Si se difiere, además se crea un `card_installment_plan` + items.
- **Pago** = `transfer` de una cuenta `asset` → la cuenta `credit_card` (reduce el saldo;
  no es gasto). Reusa `transfers` tal cual.

Enums nuevos: `account_kind`, `card_fee_period`, `card_plan_status`,
`card_statement_status`. Rollback: DROP de las 4 tablas/columna nuevas + DROP de enums.

## 4. Dominio (`backend/src/domain/card/`, TS puro)

### 4.1 `card-dates.ts`
`computeCycleDates(statementDay, paymentDay, referenceMonth) → { cutoffDate, paymentDueDate }`.
Maneja meses con menos días (día 31 → último día del mes). Si `payment_day <= statement_day`,
la fecha de pago cae en el mes siguiente al corte.

### 4.2 `card-installment.ts`
`buildInstallmentSchedule({ principal, monthlyRate, numberOfInstallments, startDate })` →
reutiliza `generateFrenchSchedule`; devuelve los items (number, dueOn, principal, interest,
balance). `monthlyRate` se obtiene del `rotativo_rate_ea` con `rate-conversion`
(`E.A. → mensual`).

### 4.3 `card-statement.ts`
`estimateStatement(input) → { estimatedBalance, estimatedMinPayment }` donde el saldo
estimado = cargos no diferidos del ciclo pendientes + cuotas de diferidos con `due_on` en
el ciclo + interés rotativo estimado + cuota de manejo del ciclo. El **interés rotativo
estimado** del ciclo = tasa mensual (del rotativo E.A. vía `rate-conversion`) × **saldo que
rota** (el saldo no pagado arrastrado del extracto anterior; si el ciclo previo se pagó
total, la base es 0 y no hay interés sobre compras corrientes). El pago mínimo:
`estimatedMinPayment = roundMoney(minPaymentPct × estimatedBalance + cuotaManejoCiclo +
interesCiclo)`. Es una **estimación**; el valor oficial se reconcilia.

### 4.4 Usura
Reusa `usury-evaluation`: compara `rotativo_rate_ea` (E.A.) contra la usura de **consumo**
vigente → bandera `exceedsUsury`.

Todo el dominio es puro y testeado (fechas fin de mes, cronograma, estimación, usura).

## 5. Backend (`backend/src/modules/`)

- **`accounts`**: agregar `kind`. Endpoints para crear/editar una tarjeta
  (`POST/PATCH /accounts` con `kind=credit_card` + cuerpo de `credit_card_details`), o un
  sub-recurso dedicado `cards`. El `net-worth` y el listado de cuentas distinguen `kind`:
  las tarjetas se reportan como pasivo (saldo adeudado), no como activo con rendimiento.
- **Cargar** (`transactions`): `POST /transactions` acepta opcional `installments?: number`
  cuando el `account_id` es una tarjeta → crea `card_installment_plan` + items en la misma
  transacción. Sin diferido, es un cargo normal.
- **Pagar** (`transfers`): `POST /transfers` con destino = la tarjeta (ya soportado).
- **`cards`** (nuevo módulo): 
  - `GET /cards` (mis tarjetas con cupo usado/disponible, próximo pago, alerta usura).
  - `GET /cards/:id` (detalle), `GET /cards/:id/statement` (extracto estimado del ciclo +
    fechas), `POST /cards/:id/statement/reconcile` (ingresar `reconciled_balance`,
    `reconciled_min_payment`, `reconciled_total_payment`).
  - `GET /cards/:id/installments` (diferidos con cronograma).
  - `GET /cards/upcoming-payments` (para el recordatorio en Deudas/Resumen).
- Reúso de dominio: amortización (diferidos), rate-conversion (rotativo→mensual), usura.
- Aislamiento por `user_id`; errores `HttpException` en español; SQL solo en repositorios.

## 6. Frontend (Flutter)

- **Navegación:** la pantalla de **Cuentas** gana un toggle/segmento **"Cuentas |
  Tarjetas"**. La vista "Tarjetas" lista las tarjetas; no se agrega un 6º tab.
- **Lista de tarjetas:** por tarjeta, cupo usado/disponible (barra), **próximo pago**
  (fecha + monto mínimo/total estimado), y **alerta de usura** si la rotativa la excede.
- **Detalle de tarjeta:** extracto estimado del ciclo, **diferidos** con su cronograma,
  botón **"Reconciliar con extracto"** (formulario con saldo/mínimo/total oficiales),
  historial de cargos (los `transactions` con `account_id`=tarjeta).
- **Cargar compra:** en `add_transaction`, al elegir una cuenta-tarjeta aparece la opción
  **"Diferir a N cuotas"** (selector de cuotas) que se envía como `installments`.
- **Pagar:** `add_transfer` (cuenta → tarjeta).
- **Recordatorio:** el próximo pago de tarjeta aparece como tarjeta de solo lectura en
  **Deudas** (y/o Resumen), con su fecha; al tocar abre el detalle de la tarjeta.
- Entidades nuevas: `CreditCard` (cupo, fechas, rotativo, cuota de manejo, saldo, alerta),
  `CardStatement`, `CardInstallmentPlan` (+items), `UpcomingCardPayment`, params.

## 7. Manejo de errores
- `HttpException` con mensaje en español: 400 (validaciones: días 1–31, rotativo, cuotas,
  reconciliación ≥ 0), 404 (tarjeta inexistente o de otro usuario), 409 (extracto ya
  reconciliado, día duplicado). El cupo excedido por una compra **avisa** (warning), no
  bloquea. El front muestra `message` en `SnackBar`.

## 8. Pruebas
- **Dominio:** `computeCycleDates` (incl. fin de mes y pago en el mes siguiente),
  `buildInstallmentSchedule` (suma de cuotas = principal+interés; cuadre), `estimateStatement`
  (saldo y mínimo con diferidos + cuota de manejo + interés), usura (excede/no excede).
- **Backend:** CRUD de tarjeta; cargar con/sin diferido (crea plan + items); pagar vía
  transferencia reduce el saldo; reconciliar; net-worth resta las tarjetas; aislamiento
  (un no-dueño recibe 404).
- **Flutter:** `analyze` limpio + integration test: crear tarjeta → cargar una compra
  diferida → ver extracto + próximo pago → reconciliar; la sub-vista "Tarjetas" en Cuentas
  muestra la tarjeta con su cupo y próximo pago.

## 9. Riesgos y notas
- **Estimación vs banco:** el extracto estimado puede diferir del real (fórmulas
  propietarias); por eso la reconciliación es de primera clase. Documentar "estimado" en la UI.
- **Mezcla activo/pasivo en `accounts`:** todo cálculo de patrimonio/rendimiento debe
  filtrar por `kind` para no contar tarjetas como activo. Cubrir con test.
- **Interés rotativo:** el MVP estima el interés del ciclo de forma simple; el solver exacto
  (causación diaria, fechas de cada compra) queda fuera del MVP.
- **Aislamiento por usuario:** las nuevas rutas validan dueño de la tarjeta; cubrir con test
  que un no-dueño reciba 404.
