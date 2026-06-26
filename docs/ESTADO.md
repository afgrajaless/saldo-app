# Saldo — Estado del proyecto y guía para retomar

> Documento de referencia técnica. Resume qué está construido, cómo está
> organizado y qué falta, para retomar el desarrollo sin releer todo el código.

---

## 1. Qué es

App de **gestión de deuda + presupuesto personal** enfocada en Colombia.
Diferenciadores: amortización real, conversión de tasas, alerta de usura, abono
a capital (Ley 1555/2012), **seguro de vida deudor**, **interés por día**,
**cuentas con rendimiento (cuenta remunerada y CDT)**, **transferencias entre
cuentas**, **importación de movimientos desde XLSX/CSV**, **subcategorías** y
**grupos de gasto compartido (estilo Splitwise)**.

Monorepo: `backend/` (NestJS + Drizzle + Neon) y `app/` (Flutter, iOS/Android).

> **Rama de trabajo:** todo lo nuevo (subcategorías + grupos) vive en la rama
> **`develop`** (pusheada a origin). `main` es la base estable previa.

---

## 1.a Grupos de gasto compartido — estilo Splitwise (última sesión)

Feature completa **end-to-end** (backend + app), en la rama `develop`. Permite a un
usuario estar en **varios grupos** a la vez (pareja, roomies, viaje…), repartir gastos
y llevar el **saldo "quién le debe a quién"**. Es el **primer dato compartido entre
usuarios distintos**; lo personal de cada uno sigue privado.

**Decisiones de producto:** estilo Splitwise (uno paga, los demás le deben); cada
miembro real solo ve lo del grupo (gastos + saldo); vinculación por **código/QR**;
grupos de **3+ personas**; miembros **reales** (con app, sincronizan) + **fantasma**
(solo un nombre que un real administra); reparto **iguales por defecto, ajustable**
(o exacto); el gasto vive solo en el grupo; **saldar** registra el pago y opcionalmente
crea un movimiento en la cuenta personal del usuario.

- **BD — migración 0007 (aditiva):** 6 tablas — `groups`, `group_members`
  (`user_id` nullable = fantasma; índice único parcial de miembro real activo),
  `group_invites` (`code` único, `member_id` para reclamar fantasma), `shared_expenses`
  (enum `split_method` equal/exact, soft delete), `shared_expense_shares`
  (unique `(expense_id, member_id)`), `settlements` (`from/to_transaction_id` a
  `transactions`). Enum nuevo `split_method`.
- **Dominio puro** (`backend/src/domain/split/`): `split-expense.ts` (`splitEqual`
  con centavos enteros + `validateExact`), `group-balance.ts` (`computeBalances`
  → neto por miembro con suma 0; `deriveDebts` → deudas pairwise). Testeado.
- **Módulo `backend/src/modules/groups/`**: CRUD de grupos + `GroupMembershipGuard`
  (`assertActiveMember`: solo miembro real activo accede), miembros fantasma,
  invitaciones por código + unirse/reclamar fantasma (transaccional), gastos
  (equal/exact, gasto+shares en una tx), endpoint de saldo, liquidaciones
  (settlement + movimiento personal opcional, valida cuenta/categoría del usuario y
  el tipo de categoría). Guard de saldo en `removeMember` (409 si saldo ≠ 0).
- **Endpoints** (`/api`): `groups` (CRUD + `/leave`), `groups/:id/members` (+fantasma),
  `groups/:id/invites` + `groups/join`, `groups/:id/expenses` (CRUD),
  `groups/:id/balance`, `groups/:id/settlements`.
- **Flutter** (`app/lib/features/groups/`): **5º tab "Compartido"** (Deudas ·
  Presupuesto · Cuentas · Compartido · Resumen). Entidades/mappers, `GroupsRepository`
  sobre Dio, providers Riverpod. Pantallas: lista de grupos, crear grupo, detalle
  (tabs Saldos/Gastos + deudas + salir), nuevo gasto (iguales/exacto con participantes),
  agregar miembro/invitar por código, unirse por código, saldar (con movimiento
  personal opcional reutilizando cuentas/categorías).
- **Verificación:** backend **169 tests** + smoke e2e contra Neon (aislamiento **403**
  a no-miembro, saldos que suman 0, liquidación, **409** al quitar miembro con saldo).
  Flutter `analyze` limpio + **integration test verde** en simulador iOS. Revisión final
  de toda la rama backend (2 fallos de seguridad en editar-gasto atrapados y corregidos:
  body PATCH sin validar y pagador no revalidado contra el grupo).
- **Pendiente (futuro):** reparto por %/partes y debt-simplification en la UI, `CHECK
  amount>0` en `settlements`, TOCTOU en editar/borrar gasto, dedupe de invites por
  miembro, tiempo real (push) — el sync hoy es **pull** (refrescar al abrir el grupo).

---

## 1.b Subcategorías de categorías

Las categorías ahora soportan **un nivel de subcategorías** (padre → hijo). Decisiones
de producto: jerarquía de **un solo nivel**, los **movimientos van solo en las hojas**
(una categoría con hijos agrupa, no recibe gasto directo) y las **metas viven en padre
e hijos**. Implementado, probado (backend **118 tests**, `flutter analyze` limpio) y
verificado end-to-end contra Neon.

- **BD**: columna `categories.parent_id` (autoreferencia, `ON DELETE SET NULL`) + índice
  `idx_categories_parent`. Migración **0006** (aditiva). Rollback: `DROP INDEX
  idx_categories_parent; ALTER TABLE categories DROP COLUMN parent_id;`.
- **Regla hoja-only**: `TransactionsService` (y el lookup de `import`) rechazan registrar
  en una categoría con subcategorías vivas (`hasLiveChildren`).
- **Auto-mover a "General"**: al colgarle el primer hijo a una categoría que ya tenía
  movimientos directos, esos movimientos pasan a una subcategoría **"General"** (preserva
  la invariante padre = suma de hijos). Misma idea que el "Otros" del borrado.
- **Duplicados**: la unicidad de nombre pasó a ser por **(usuario, tipo, parent_id)** —
  hermanas únicas; el mismo nombre se permite bajo padres distintos (`findByNameInScope`).
- **Borrado en cascada**: borrar un padre hace soft-delete de sus hijos (cada uno reasigna
  sus movimientos a "Otros").
- **Resumen** (`/budget/summary`): `BudgetCategorySummaryDto` trae `parentId` y
  `subcategories[]`; el `spent` del padre es la suma de los hijos (sin doble conteo).
- **Reparent** (`PATCH /categories/:id` con `parentId`): mover bajo otro padre o volver a
  primer nivel (`null`). Una categoría con hijos no puede convertirse en subcategoría.
- **Flutter**: `Category` (+`parentId`,`hasChildren`), `BudgetCategorySummary`
  (+`parentId`,`subcategories`). `categories_screen` anida hijos con acción "+ subcategoría";
  `add_category_screen` con selector de padre (o banner de padre fijo); `add_transaction_screen`
  lista solo hojas (subcategoría rotulada "Padre › Hijo"); `budget_screen` indenta las
  subcategorías en "Metas de gasto". Las **donas del Resumen** siguen mostrando el primer
  nivel (rollup), sin cambios.

---

## 1.d Open Finance — vinculación bancaria (rama `feat/open-finance`)

Permite **conectar un banco** y traer cuentas, tarjetas y deudas automáticamente,
en vez de cargarlas a mano. Hoy funciona con un **proveedor mock** (datos de
ejemplo); el adaptador real (Belvo) está como **esqueleto** listo para enchufar.

**Concepto clave:** NO se busca por cédula. La identidad la valida el banco; el
backend solo guarda un **token de conexión** (`externalConnectionId` / `link_id`)
emitido tras el consentimiento del usuario. Por eso no hay campo "cédula".

- **BD:** tabla `open_finance_connections` (provider, institución, estado, token
  externo, consentimiento, `lastSyncedAt`, soft delete). `accounts` y `debts`
  llevan `source` ('manual' | 'open_finance') + `external_id`; las tarjetas viven
  en `accounts`/`credit_card_details`.
- **Dominio puro** (`backend/src/domain/openfinance/`): `normalize.ts` mapea la
  forma canónica OF → modelo Saldo y clasifica créditos en tarjeta / deuda /
  **omitido** (sin datos mínimos o tipo no soportado, p. ej. leasing).
- **Puerto + proveedores** (`modules/openfinance/provider/`):
  `OpenFinanceProvider` (interfaz), `MockOpenFinanceProvider` (default, fixtures
  deterministas) y `BelvoOpenFinanceProvider` (**esqueleto** real: auth Basic,
  `listInstitutions`/`fetchAccounts`/`fetchCreditProducts` sobre la API Belvo,
  `createWidgetToken` vía `POST /api/token/`; mapeos marcados con `TODO(belvo)`).
  Selección por env `OPEN_FINANCE_PROVIDER` (default 'mock').
- **Servicio:** `sync` trae cuentas y créditos y hace **upsert idempotente** por
  `(connectionId, externalId)` (re-sincronizar actualiza, no duplica) + snapshot
  de saldo; si el proveedor falla, marca la conexión en `error`.
- **Read-only:** cuentas/tarjetas/deudas con `source='open_finance'` son
  **read-only** → editarlas devuelve **409** (se actualizan re-sincronizando).
- **Flujo de widget** (para proveedores tipo Belvo): `POST /widget-token` (token
  del Connect Widget) + `POST /connections/finalize` (persiste el link_id que el
  cliente obtiene tras el login del usuario en su banco). El mock no usa widget.
- **Endpoints** (`/api/open-finance`): `GET institutions`, `GET/POST connections`,
  `POST widget-token`, `POST connections/finalize`, `POST connections/:id/sync`,
  `DELETE connections/:id` (revoca; conserva lo importado).
- **Flutter** (`app/lib/features/open_finance/`): dominio (entidades + contrato),
  data (mappers + `OpenFinanceRepositoryImpl` sobre Dio, incluye `createWidgetToken`
  y `finalizeConnection`), providers Riverpod, pantallas `connect_bank_screen`
  (lista bancos → conecta+sincroniza) y `connections_screen` (estado, re-sync,
  revocar). Badge **"Vinculado"** read-only en deudas/cuentas/tarjetas.
- **Verificación:** backend **263 tests** (incluye OF: normalize, mock, servicio,
  widget-token/finalize); `flutter analyze` limpio; integration test
  `open_finance_test.dart` verde en simulador iOS; flujo probado e2e por API real
  (conectar → sync → 409 al editar → idempotencia → widget-token/finalize → 404).
- **Pendiente:** UI del **widget Belvo** (WebView + capturar link_id) y
  **credenciales sandbox** reales; el **sync no maneja bajas** (un producto cerrado
  en el banco queda en Saldo); snapshots crecen sin poda. Mientras tanto, el camino
  real para datos propios es el **import XLSX/CSV** ya existente.

> **Cambio relacionado:** en "Nueva deuda" el tipo **Tarjeta de crédito** se quitó
> de las opciones seleccionables (`debtTypeOptions` en `enum_labels.dart`) para
> empujar el uso de la sección de Tarjetas; `debtTypeLabels` se conserva completo
> para mostrar deudas previas de ese tipo.

---

## 1.c Novedades de sesiones previas (resumen para retomar)

Todo lo de abajo ya está implementado, probado (`flutter analyze` limpio, backend
**110 tests** en su momento) y commiteado (4 commits `fc45885`, `43a3128`,
`bc3df73`, `bc41302`).

1. **Orden de pago de deudas** (sección "Mis deudas"): selector **Avalancha**
   (mayor tasa E.A.) / **Costo mensual** (mayor interés en pesos del mes). Mora
   primero, pagadas al final. Insignia "Paga primero" en la #1.
   Backend: `DebtResponseDto` ahora trae `currentBalance`, `monthlyPayment`,
   `monthlyInterestCost`, `paidInstallments`, `remainingInstallments`.
   Frontend: caso de uso puro `prioritize_debts.dart` (+ test).
2. **Pagar cuota como gasto**: en el diálogo de pago, check (activado) que crea
   un movimiento de egreso en una categoría con el nombre del acreedor.
3. **Eliminar deuda**: botón destructivo en el detalle (distinto de pagar; borra
   el registro). Etiquetas de amortización renombradas a "Cuota fija / Abono fijo
   / Capital al final". Tasa **0%** permitida (deuda sin interés).
4. **Categorías**: editar (PATCH), validación de **duplicados** (409,
   case-insensitive, mismo nombre permitido en distinto tipo), **categorías
   sugeridas** en el estado vacío, **borrar meta** (enviar `monthlyBudget: null`),
   y al **eliminar una categoría con movimientos** se reasignan a una categoría
   **"Otros"** (creada por tipo) conservando el nombre original en la descripción.
   `CategoryResponseDto.transactionCount`.
5. **Cuentas** (entidad nueva): CRUD, color, soft delete. `transactions.account_id`
   (opcional). Selector de cuenta en el alta de movimiento. **Cuentas es un tab**
   del shell (Deudas · Presupuesto · Cuentas · Resumen).
6. **Transferencias entre cuentas**: tabla `transfers`, módulo backend (no cuentan
   como ingreso/egreso del presupuesto), pantalla de alta.
7. **Importación XLSX/CSV** (`POST /transactions/import`, multipart, SheetJS):
   mapea export tipo app de finanzas → movimientos + transferencias, autocrea
   cuentas/categorías (con colores de paleta), omite filas resumen y la contraparte
   de transferencias; devuelve resumen. Pantalla con `file_picker`.
8. **Rendimientos** (cuenta remunerada y CDT): dominio `yield-projection.ts`,
   tablas `account_rates`, `account_snapshots`, `cdt_terms`, columnas
   `accounts.yield_type`/`effective_annual_rate`. Endpoints de configuración,
   snapshots, **proyección** y **patrimonio**. UI: detalle de cuenta con gráfico
   (`fl_chart`), estado del CDT (retención 4%, valor al vencimiento) y snapshots.
9. **Resumen mejorado**: donas de **ingresos por categoría** y **gastos por
   categoría** (colores de paleta distintos por porción) + **selector de mes**
   propio sincronizado con Presupuesto.
10. **Fix**: el cliente Dio fijaba `Content-Type: application/json` global, lo que
    rompía la subida multipart (timeout → "No se pudo conectar"). Se quitó el header
    global y se fija `multipart/form-data` por petición en el import.

**Pendiente más relevante (siguiente paso natural):** el **devengo mensual del
ingreso "Rendimientos"** en el presupuesto (la pieza que conecta rendimientos con
`transactions`). Hoy las proyecciones/gráficos funcionan sin ese devengo. Decisión
ya tomada: savings = ingreso mensual; CDT = al vencimiento, neto del 4%.

---

## 2. Stack y versiones (CRÍTICO — no cambiar a ciegas)

Equipo: **iMac Intel, macOS Ventura 13.7.8, Xcode 15.2** (tope para este hardware).

| Componente | Versión fijada | Por qué |
|---|---|---|
| Flutter | **3.27.4** (FVM, `app/.fvmrc`) | Compila iOS con Xcode 15.2. **NO `flutter upgrade`** (3.29+ empuja a Xcode 16 → Sonoma). |
| Dart | 3.6.2 | Viene con Flutter 3.27.4. |
| Riverpod | **2.6.1** (no 3.x) | Riverpod 3 exige Dart > 3.6.2. La 2.6 mantiene `@riverpod`. |
| fl_chart | **0.69.x** (no 1.x) | 1.x usa `Matrix4.translateByDouble`, ausente en el `vector_math` de Flutter 3.27. |
| NestJS | 10.x | |
| Drizzle ORM | 0.36.x + drizzle-kit 0.28.x | driver `postgres` (postgres.js) sobre Neon. |
| Node | 20+ | |

- **App Store**: requiere Xcode 16+ → se sube desde el otro Mac o Codemagic, NO desde el iMac.
- **Impeller**: desactivado en `app/ios/Runner/Info.plist` (`FLTEnableImpeller=false`) para evitar pantalla roja en simulador Intel.
- Verificar siempre con `fvm flutter doctor`.

---

## 3. Cómo correr

### Backend
```bash
cd backend
npm install
# .env con DATABASE_URL (Neon) + JWT_ACCESS_SECRET + JWT_REFRESH_SECRET (>=16)
npm run build && node dist/main.js   # o: npm run start:dev
# Migraciones / seed:
npm run db:generate   # genera SQL desde el schema (offline)
npm run db:migrate    # aplica a Neon
npm run db:seed       # carga el catálogo de usura
npm test              # 110 tests del dominio + servicios
```
Swagger en `http://localhost:3000/api/docs`.

### Flutter
```bash
cd app
fvm flutter pub get
fvm dart run build_runner build --delete-conflicting-outputs   # genera *.g.dart (riverpod/injectable)
fvm flutter analyze
fvm flutter run -d <udid-simulador-ios>
# e2e en simulador (requiere backend arriba):
fvm flutter test integration_test/auth_debts_flow_test.dart -d <udid>
```
En el simulador iOS, `localhost` resuelve al Mac (ATS permite HTTP local vía
`NSAllowsLocalNetworking` en Info.plist).

---

## 4. Backend — estructura

### 4.1 Dominio (`backend/src/domain/`, TS puro, ~100% testeado)
- `shared/money.ts` — `roundMoney` (centavos exactos, sin float drift).
- `rates/` — `rate-conversion.ts` (E.A. ↔ M.V. ↔ N.M.V., normalizadores), `rate-type.ts`.
- `amortization/`
  - `amortization.types.ts` — `AmortizationInput` (principal, monthlyRate,
    numberOfInstallments, **insurance?**, **interestMode?**, **anchorDate?**),
    `InstallmentRow` (payment=cap+int, interest, principal, **insurance**, balance),
    `AmortizationSchedule` (rows, totalInterest, **totalInsurance**, totalPaid, fixedPayment?).
  - `french-amortization.ts` — `generateFrenchSchedule`, `calculateFixedPayment`,
    `amortizeWithPayment` (cuota fija dada → usado al reducir plazo).
  - `german-amortization.ts`, `american-amortization.ts`.
  - `prepayment.ts` / `prepayment.types.ts` — `applyPrepayment` (abono: REDUCE_TERM /
    REDUCE_INSTALLMENT; conserva seguro e interestMode; reporta interestSaved).
- `usury/` — `usury-evaluation.ts` (`calculateUsuryCap`=IBC×1.5, `evaluateUsury`).
- `insurance/insurance.ts` — `InsuranceMode` (none/rate/fixed), `computeInsurance`
  (rate = saldo×tasa; fixed = monto). **Aditivo a la cuota, no altera amortización.**
- `interest/interest-accrual.ts` — `InterestMode` (monthly/daily), `accruePeriodInterest`.
  Daily = saldo×((1+tasaMensual)^(12·días/365)−1), `días` reales entre cuotas
  (anclado a `anchorDate`). **OJO: la cuota fija se calcula de la tasa mensual,
  así que daily redistribuye interés/capital pero NO cambia el valor de la cuota.**
- `yield/yield-projection.ts` — rendimientos de cuentas: `dailyRate(EA)`,
  `projectSavingsBalance`/`savingsYield` (compuesto diario base 365),
  `projectCdt` (bruto, retención 4%, neto, valor al vencimiento), `accrualSchedule`
  (curva mensual para gráficos). 10 tests.

### 4.2 Módulos (`backend/src/modules/`)
Cada módulo: `*.controller.ts`, `*.service.ts`, `*.repository.ts` (Drizzle), `*.module.ts`, `dto/`.
- `auth/` — register/login/refresh/me. JWT acceso (15m) + refresh (7d), secretos
  separados. `guards/jwt-auth.guard.ts`, `decorators/current-user.decorator.ts`,
  `types/jwt-payload.ts`. Contraseñas con Argon2id (`shared/security/password.service.ts`).
- `users/` — repositorio de usuarios.
- `debts/` — CRUD. `installment-schedule.factory.ts` (glue dominio↔persistencia:
  `buildSchedule`, `scheduleToSeeds`), `insurance.mapper.ts` (BD→InsuranceConfig).
  Crear deuda: normaliza tasa→E.A., genera cronograma (seguro + interestMode),
  persiste deuda + cuotas en transacción.
- `payments/` — pago regular (marca cuota) y abono a capital (recalcula con el
  dominio; pasa seguro, interestMode y `anchorDate=addMonths(startDate, lastPaidNumber)`).
- `usury/` — catálogo + `GET /usury/debts/:id/evaluate`. `debt-modality.map.ts`.
- `categories/` — CRUD (income/expense, color, monthlyBudget, soft delete).
  Valida duplicados por nombre+tipo (409). `findByNameAndType`. Al eliminar con
  movimientos: reasigna a "Otros" del mismo tipo (`reassignTransactions`,
  prefija el nombre en la descripción). `findAll` incluye `transactionCount`.
  `update` acepta `monthlyBudget: null` (borrar meta).
- `transactions/` — movimientos (join a categoría **y cuenta**). `account_id`
  opcional, validado contra cuentas del usuario.
- `accounts/` — CRUD de cuentas (color, soft delete, duplicados 409).
  **Rendimiento**: `PUT /accounts/:id/yield` (savings/cdt → guarda tasa en
  `account_rates`, CDT en `cdt_terms`), snapshots (`POST/GET /:id/snapshots`,
  `DELETE /accounts/snapshots/:id`), `GET /:id/projection` (curva + estado CDT),
  `GET /accounts/net-worth` (serie de patrimonio). Usa el dominio `yield/`.
- `transfers/` — transferencias entre cuentas (crear/listar por mes/eliminar).
  Valida cuentas distintas y del usuario. NO afectan el resumen de presupuesto.
- `import/` — `POST /transactions/import` (multipart, `FileInterceptor`, SheetJS
  `xlsx`). `import.mapper.ts` (puro, 5 tests): mapea filas → movimientos/
  transferencias, omite resumen y contraparte. `import.repository.ts` persiste
  todo en una transacción (autocrea cuentas/categorías con colores de paleta).
- `budget/` — `GET /budget/summary?month=YYYY-MM` (ingresos, egresos, balance, avance de metas).

### 4.3 Infra (`backend/src/`)
- `db/schema.ts` (Drizzle), `db/database.module.ts` (provider `DRIZZLE`), `db/seeds/usury.seed.ts`, `db/drizzle/` (migraciones 0000–0003).
- `config/env.validation.ts` (valida `.env` al arranque).
- `shared/date/add-months.ts` (`addMonths`, `daysBetween`), `shared/date/month-range.ts`.
- `main.ts` (Helmet, CORS, ValidationPipe global, Swagger), `app.module.ts`.

### 4.4 Endpoints
```
POST /api/auth/register | /login | /refresh        GET /api/auth/me
GET/POST /api/debts   GET/PATCH/DELETE /api/debts/:id
POST/GET /api/debts/:debtId/payments
GET /api/usury   GET /api/usury/current   GET /api/usury/debts/:debtId/evaluate
GET/POST /api/categories   PATCH/DELETE /api/categories/:id
GET/POST /api/transactions   DELETE /api/transactions/:id   POST /api/transactions/import
GET/POST /api/accounts   PATCH/DELETE /api/accounts/:id
PUT /api/accounts/:id/yield   GET /api/accounts/:id/projection   GET /api/accounts/net-worth
POST/GET /api/accounts/:id/snapshots   DELETE /api/accounts/snapshots/:id
GET/POST /api/transfers   DELETE /api/transfers/:id
GET /api/budget/summary?month=YYYY-MM
GET /api/health
```

---

## 5. Base de datos (Neon, PostgreSQL)

Tablas: `users`, `income_sources`, `debts`, `installments`, `payments`,
`usury_rates`, `categories`, `transactions`, **`accounts`**, **`transfers`**,
**`account_rates`**, **`account_snapshots`**, **`cdt_terms`**, **`credit_card_details`**,
**`groups`**, **`group_members`**, **`group_invites`**, **`shared_expenses`**,
**`shared_expense_shares`**, **`settlements`**, **`open_finance_connections`**.

`accounts` y `debts` incluyen `source` ('manual' | 'open_finance') + `external_id`
para los productos vinculados por Open Finance (ver §1.d).

Enums: `debt_type`, `rate_type`, `amortization_system`, `debt_status`,
`installment_status`, `payment_type`, `usury_modality`, `category_type`,
`insurance_mode`, `interest_mode`, **`yield_type`** (none/savings/cdt),
**`cdt_interest_payment`** (monthly/at_maturity), **`split_method`** (equal/exact).

Convenciones: dinero `NUMERIC(15,2)`; tasas como fracción; PK UUID;
soft delete (`deleted_at`) en debts/categories/accounts; aislamiento por `user_id`.

`debts` incluye: `insurance_mode`/`insurance_value` (seguro), `interest_mode`.
`installments` incluye `insurance_portion`. `total_amount` = capital+interés+seguro.
`transactions` incluye `account_id` (FK accounts, nullable, ON DELETE SET NULL).
`accounts` incluye `yield_type` + `effective_annual_rate`. `cdt_terms`:
principal, opened_on, term_days, matures_on, EA, `withholding_rate` (def 0.04),
interest_payment. `account_snapshots`: balance + as_of_date (único por cuenta+fecha).

Migraciones: 0000 (6 tablas), 0001 (categories+transactions), 0002 (seguro),
0003 (interest_mode), **0004 (accounts, transfers, transactions.account_id)**,
**0005 (yield_type/EA en accounts, account_rates, account_snapshots, cdt_terms)**,
**0006 (categories.parent_id + idx_categories_parent — subcategorías)**,
**0007 (6 tablas de grupos de gasto compartido + enum split_method)**.
Rollback de 0004/0005/0006/0007 documentado en su momento (DROP de las tablas/columnas/enum nuevos).

`categories` incluye `parent_id` (autoreferencia, null = primer nivel). Unicidad de
nombre por (user_id, type, parent_id). Movimientos solo en hojas; metas en padre e hijos.

---

## 6. Flutter — estructura (`app/lib/`)

Clean Architecture por feature (`domain/` → `data/` → `presentation/`).
Estado: Riverpod (codegen `@riverpod`). DI: get_it + injectable. HTTP: Dio.

- `core/` — `config/app_config.dart` (API base URL), `network/dio_client.dart` +
  `auth_interceptor.dart` (adjunta JWT, refresca ante 401), `storage/token_storage.dart`
  (Keychain), `di/injection.dart` (+`register_module.dart`), `theme/app_theme.dart`
  (+`app_tokens.dart`, identidad esmeralda), `error/api_exception.dart`.
- `features/auth/` — entidades User/AuthSession, datasource/repo, `auth_controller.dart`
  (AsyncNotifier de la sesión), pantallas login/register, `auth_gate.dart` (decide
  login vs MainShell), casos de uso login/register.
- `features/debts/` — entidades (Debt [+ currentBalance, monthlyPayment,
  monthlyInterestCost, paid/remainingInstallments], Installment, DebtDetail,
  CreateDebtParams), datasource/repo/mappers, providers, **`domain/usecases/
  prioritize_debts.dart`** (avalancha/costo mensual, mora primero), pantallas
  (`debts_list_screen` [selector de estrategia + insignia "Paga primero"],
  `create_debt_screen` [tasa 0% permitida], `debt_detail_screen` [pago como gasto,
  **botón eliminar deuda**]), `widgets/debt_card.dart`.
- `features/payments/` — entidades/datasource/repo, `payments_controller.dart`,
  `abono_capital_screen.dart` (monto + modalidad + resultado del recálculo).
- `features/usury/` — `usury_evaluation_provider.dart`, `widgets/usury_badge.dart`
  (verde/rojo/neutro).
- `features/budget/` — entidades (Category [+ transactionCount], Transaction
  [+ accountId/accountName], BudgetSummary, **Account, Transfer, AccountSnapshot,
  AccountProjection/CdtStatus, ImportResult, NetWorthPoint**, params), datasource/
  repo (`budget_repository_impl` con cuentas/transferencias/import/yield/snapshots/
  net-worth), providers (`selected_month_provider`, `budget_providers`
  [+ accountsList, monthTransfers, accountProjection, accountSnapshots, netWorth]),
  pantallas: `budget_screen` (menú ⋯ = Categorías/Importar), `add_transaction_screen`
  (+ selector de cuenta), `categories_screen`/`add_category_screen` (editar, borrar
  meta), `accounts_screen` (lista + tarjeta de patrimonio), `add_account_screen`,
  `account_detail_screen` (config rendimiento + gráfico proyección + estado CDT +
  snapshots), `set_yield_screen`, `add_transfer_screen`, `import_screen`
  (`file_picker`), `widgets/delete_category_dialog.dart`.
- `features/dashboard/presentation/screens/` — `main_shell.dart` (NavigationBar de
  **4 tabs**: Deudas / Presupuesto / **Cuentas** / Resumen; cada FAB con `heroTag`
  único), `dashboard_screen.dart` (donas fl_chart: **ingresos por categoría**,
  **gastos por categoría** [paleta de colores], deuda por tipo; **selector de mes**).
- `shared/` — `money_format`, `month_format`, `enum_labels` (etiquetas de
  amortización: Cuota fija/Abono fijo/Capital al final), `hex_color`,
  `chart_palette` (`chartColor(i)` usado en las donas), `form_validators`.
- `core/network/dio_client.dart` — **sin** `Content-Type` global (Dio lo resuelve
  por petición: JSON para mapas, multipart para FormData). Crítico para el import.
- `integration_test/` — `auth_debts_flow_test`, `usury_badge_test`, `dashboard_test`,
  `budget_test`, `insurance_test` (todos pasan en simulador iOS contra el backend).

---

## 7. Estado actual — qué está LISTO

- **Dominio** (amortización francés/alemán/americano, conversión de tasas, usura,
  abono a capital, seguro, interés por día, **rendimientos savings/CDT**) — **110 tests**.
- **Backend** completo (auth, debts, payments, usury, categories, transactions,
  budget, **accounts, transfers, import, rendimientos**) — probado e2e contra Neon.
- **Flutter iOS** completo: auth, deudas (CRUD + cronograma + **orden de pago** +
  **eliminar**), pagos + abono + **pago como gasto**, usura, presupuesto (categorías
  con edición/sugeridas/eliminar-a-Otros, movimientos, metas), **cuentas + rendimiento
  con gráficos**, **transferencias**, **importación XLSX/CSV**, **resumen con donas
  por categoría + selector de mes**. `flutter analyze` limpio.
- **Verificado en simulador iOS** esta sesión: import real (116 mov + 8 transf),
  cuentas como tab, donas de Resumen con colores, selector de rendimiento.
- **Pulido visual** unificado (tema esmeralda, tarjetas planas).
- **Tarjetas de crédito** (módulo `cards`): producto propio con corte/pago,
  cuota rotativa y compras a cuotas; sección Cuentas › Tarjetas.
- **Open Finance** (rama `feat/open-finance`, ver §1.d): vinculación bancaria con
  proveedor mock + esqueleto Belvo; cuentas/deudas/tarjetas read-only vinculadas.

---

## 8. Pendiente / roadmap

- **Devengo del ingreso "Rendimientos"** en el presupuesto (lo más relevante):
  registrar un movimiento de ingreso mensual por cuenta con rendimiento (savings),
  realizado-desde-snapshots si los hay, si no proyectado; CDT al vencimiento neto
  del 4%. Idempotente por (cuenta, mes). Hoy los gráficos de rendimiento funcionan
  sin esto, pero el rendimiento aún no entra al presupuesto.
- **Colores de categorías/cuentas existentes**: las creadas antes de la paleta
  quedaron con el color por defecto (verde) en las listas. Opcional: migración
  única que les asigne colores variados (los gráficos ya usan paleta propia).
- **Borrar meta de categoría en la UI**: el backend acepta `null`; el flujo de la
  app envía null cuando el campo queda vacío al editar un egreso (ya hecho).
- **Solver de cuota para interés diario**: hoy daily redistribuye interés/capital
  pero la cuota fija sale de la tasa mensual. Un solver numérico haría que la cuota
  refleje la causación diaria (cierra parte del gap en meses de 31 días).
- **Seguro de vida** como tasa sobre saldo decreciente ya soportado (`rate`); falta
  UI más rica si se quiere.
- **Fase 5 — endurecimiento**: revocación de refresh tokens (hoy stateless), rate
  limiting, tests e2e automatizados (Jest+Supertest) en CI, `npm audit` (48 vulns
  transitivas dev), modo oscuro.
- **Fase 6 — despliegue**: Render (backend) + Neon prod + GitHub Actions.
- **README** de portafolio con screenshots.
- Detalle UI: el FAB tapa el último ítem en listas cortas (ajustar padding).

---

## 9. Lecciones / trampas (para no repetirlas)

- `find.byType(FloatingActionButton)` NO casa con `FloatingActionButton.extended` —
  usar `find.byIcon(Icons.add)` o `find.byType(ListTile)` en tests.
- Varios FAB en un `IndexedStack` chocan por el `heroTag` por defecto → asignar
  `heroTag` único a cada uno.
- `GET /auth/me` responde desde el payload del JWT sin consultar la BD → una sesión
  puede "revivir" 15 min tras borrar el usuario ("ghost session"). Los e2e cierran
  sesión (ícono logout) si arrancan logueados.
- En el simulador iOS, sesión persiste en Keychain entre corridas de tests.
- `DropdownButtonFormField` en Flutter 3.27 usa `value:` (no `initialValue:`, que es 3.29+).
- **Interés por día NO cierra el gap de la cuota** cuando el banco aplica una tasa
  efectiva mayor a la citada (el gap está en la cuota/tasa, no en el día-conteo).
- Migraciones siempre aditivas (ADD COLUMN con default) → no rompen datos existentes.
- **Dio + multipart**: fijar `Content-Type: application/json` global en `BaseOptions`
  impide que Dio agregue el `boundary` al subir `FormData` → el server no parsea y
  la petición cuelga (timeout, se ve como "no se pudo conectar"). No fijar header
  global; o pasar `Options(contentType: multipart/form-data)` en la subida.
- **Importación de transferencias** (export tipo app de finanzas): cada
  transferencia trae dos filas ("Dinero gastado" + "Dinero ingresado"). Tomar solo
  la pata "gastado" como transferencia (cuenta→categoría-destino) y omitir la otra;
  omitir filas "Saldo de…" (resúmenes) y transferencias a la misma cuenta.
- **Categorías sin color al crear** toman el verde por defecto de la BD → en gráficos
  usar una paleta (`chartColor(i)`) en vez del color guardado para que se distingan.
- **Automatización del simulador**: clics sintéticos (cliclick/AppleScript) no
  aciertan los botones del **AppBar superior** (zona alta); los del cuerpo y la barra
  inferior sí. Para demos, navegar por tabs/FAB, no por iconos del AppBar.

---

## 10. Convenciones del proyecto

- Backend/Frontend en inglés; nombres de dominio en español donde aporta
  (`abono_capital`, `tasa_usura`). BD en inglés snake_case (la del proyecto).
- TS estricto, sin `any`. Métodos cortos con JSDoc en español.
- Angular/Flutter: nunca SFC; template/estilos/lógica separados (aplica a Flutter:
  no SFC para widgets grandes; aquí los widgets están separados por responsabilidad).
- SQL nunca inline en services: queries vía repositorios (Drizzle query builder).
- Commits estilo conventional, mensajes naturales.
