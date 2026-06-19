# Saldo — Estado del proyecto y guía para retomar

> Documento de referencia técnica. Resume qué está construido, cómo está
> organizado y qué falta, para retomar el desarrollo sin releer todo el código.

---

## 1. Qué es

App de **gestión de deuda + presupuesto personal** enfocada en Colombia.
Diferenciadores: amortización real, conversión de tasas, alerta de usura, abono
a capital (Ley 1555/2012), **seguro de vida deudor** e **interés por día**.

Monorepo: `backend/` (NestJS + Drizzle + Neon) y `app/` (Flutter, iOS/Android).

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
npm test              # 94 tests del dominio + servicios
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
- `categories/` — CRUD de categorías de presupuesto (income/expense, color, monthlyBudget, soft delete).
- `transactions/` — movimientos (ingreso/egreso por mes, join a categoría).
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
GET/POST /api/transactions   DELETE /api/transactions/:id
GET /api/budget/summary?month=YYYY-MM
GET /api/health
```

---

## 5. Base de datos (Neon, PostgreSQL)

Tablas: `users`, `income_sources`, `debts`, `installments`, `payments`,
`usury_rates`, `categories`, `transactions`.

Enums: `debt_type`, `rate_type`, `amortization_system`, `debt_status`,
`installment_status`, `payment_type`, `usury_modality`, `category_type`,
`insurance_mode`, `interest_mode`.

Convenciones: dinero `NUMERIC(15,2)`; tasas `NUMERIC(9,6)` como fracción; PK UUID;
soft delete (`deleted_at`) en debts/categories; aislamiento por `user_id`.

`debts` incluye: `insurance_mode`/`insurance_value` (seguro), `interest_mode`.
`installments` incluye `insurance_portion`. `total_amount` = capital+interés+seguro.

Migraciones: 0000 (6 tablas), 0001 (categories+transactions), 0002 (seguro), 0003 (interest_mode).

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
- `features/debts/` — entidades (Debt, Installment, DebtDetail, CreateDebtParams),
  datasource/repo/mappers, providers (`debts_controller`, `debt_detail_provider`),
  pantallas (`debts_list_screen`, `create_debt_screen` [tipo, tasa, sistema, fecha,
  **seguro**, **interés por día**], `debt_detail_screen` [resumen, barra capital/interés,
  cronograma con seguro, abono]), `widgets/debt_card.dart`.
- `features/payments/` — entidades/datasource/repo, `payments_controller.dart`,
  `abono_capital_screen.dart` (monto + modalidad + resultado del recálculo).
- `features/usury/` — `usury_evaluation_provider.dart`, `widgets/usury_badge.dart`
  (verde/rojo/neutro).
- `features/budget/` — entidades (Category, Transaction, BudgetSummary, params),
  datasource/repo (`budget_repository_impl`), providers (`selected_month_provider`,
  `budget_providers`), pantallas (`budget_screen` [mes, totales, metas, movimientos],
  `add_transaction_screen`, `categories_screen`, `add_category_screen`).
- `features/dashboard/presentation/screens/` — `main_shell.dart` (NavigationBar:
  Deudas / Presupuesto / Resumen; cada FAB con `heroTag` único), `dashboard_screen.dart`
  (donut fl_chart de distribución por tipo).
- `shared/` — `money_format`, `month_format`, `enum_labels`, `hex_color`,
  `chart_palette`, `form_validators`.
- `integration_test/` — `auth_debts_flow_test`, `usury_badge_test`, `dashboard_test`,
  `budget_test`, `insurance_test` (todos pasan en simulador iOS contra el backend).

---

## 7. Estado actual — qué está LISTO

- **Dominio** (amortización francés/alemán/americano, conversión de tasas, usura,
  abono a capital, seguro, interés por día) — **94 tests** unitarios.
- **Backend** completo (auth, debts, payments, usury, categories, transactions,
  budget) — probado e2e contra Neon.
- **Flutter iOS** completo: auth, deudas (CRUD + cronograma), pagos + abono, badge
  de usura, dashboard (donut), presupuesto (categorías, movimientos, metas), seguro,
  interés por día. `flutter analyze` limpio; e2e en simulador con screenshots.
- **Pulido visual** unificado (tema esmeralda, tarjetas planas).

---

## 8. Pendiente / roadmap

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

---

## 10. Convenciones del proyecto

- Backend/Frontend en inglés; nombres de dominio en español donde aporta
  (`abono_capital`, `tasa_usura`). BD en inglés snake_case (la del proyecto).
- TS estricto, sin `any`. Métodos cortos con JSDoc en español.
- Angular/Flutter: nunca SFC; template/estilos/lógica separados (aplica a Flutter:
  no SFC para widgets grandes; aquí los widgets están separados por responsabilidad).
- SQL nunca inline en services: queries vía repositorios (Drizzle query builder).
- Commits estilo conventional, mensajes naturales.
