# Integración Open Finance — Diseño

> Fecha: 2026-06-25
> Estado: aprobado (pendiente de revisión final del usuario)
> Proyecto: Saldo (app_financiera) · rama `feat/open-finance`
> Reutiliza: `accounts` (con `kind` asset/credit_card), `account_snapshots` (campo
> `source`), `debts`, `credit_card_details`, y los patrones de módulo NestJS + Drizzle
> existentes (controller/service/repository/dto, queries en `.sql`/repos, errores
> estándar en español).

## 1. Resumen

Integración con **Open Finance (Finanzas Abiertas, Colombia)** para que el usuario
**conecte sus bancos** y la app **traiga automáticamente sus cuentas (con saldo) y
productos de crédito (deudas/tarjetas)**. Los datos importados entran como registros
**read-only marcados con origen** (`source='open_finance'`), **agrupados por conexión**,
y se **refrescan idempotentemente** en cada sincronización.

La pieza central es una **interfaz de proveedor** (`OpenFinanceProvider`) con un
**proveedor mock** que devuelve datos de ejemplo en forma canónica Open Finance. Esto
da software funcional y testeable hoy, sin depender de cuentas externas, y queda
**swap-ready**: cambiar el mock por un adaptador real (un agregador tipo Belvo o un
adaptador OF directo) no toca el resto del sistema.

### Decisiones de producto (tomadas en brainstorming)

1. **Estrategia:** abstracción (puerto) + **proveedor mock propio**. El pipeline completo
   (consentimiento → traer → normalizar → conciliar) se implementa ya; el proveedor real
   se enchufa después por configuración.
2. **Convivencia:** los datos de OF entran como **registros propios read-only**, marcados
   con origen y **ligados a una conexión** (banco). **Sin matching difuso** contra lo
   manual: cero riesgo de duplicar o pisar lo que el usuario creó a mano.
3. **Alcance v1:** **cuentas + productos de crédito** (deudas/tarjetas). Los
   **movimientos/transacciones** quedan para una segunda iteración (traen dedup pesado y
   categorización).
4. **Parcialidad explícita:** si un producto no es mapeable, se **omite y se reporta** en
   el resumen de la sincronización ("así no esté completo").

## 2. Alcance

### MVP (v1)
- Interfaz `OpenFinanceProvider` + `MockOpenFinanceProvider` (2 bancos de ejemplo).
- Dominio puro: normalización del JSON canónico OF a las formas internas de Saldo.
- Ciclo de conexión: listar bancos → consentir (mock: instantáneo) → conexión `active`.
- Sincronización idempotente: trae cuentas + créditos, concilia por `external_id`, crea
  `account_snapshots` con `source='open_finance'`, devuelve resumen
  (creadas/actualizadas/omitidas).
- Procedencia y read-only: `accounts` y `debts` ganan `source`, `connection_id`,
  `external_id`; los servicios rechazan editar/borrar lo que viene de OF.
- Revocar conexión: deja de refrescar; conserva lo ya importado.
- Flutter: pantalla "Conectar banco", lista de conexiones, badge "Vinculado" + candado en
  Cuentas/Deudas, acción de sincronizar.

### Fuera del MVP (futuro)
- **Movimientos/transacciones** desde OF (dedup idempotente + categorización).
- **OAuth/consentimiento real** y adaptador de un agregador (Belvo/Finerio) u OF directo.
- **Refresh automático/programado** (hoy: sync manual con botón).
- **Matching** contra registros manuales (fusionar en sitio).
- Registro como **participante** del Sistema de Finanzas Abiertas ante la SFC.

## 3. Arquitectura — puerto + adaptadores

```
Flutter (feature open_finance)
   │ REST + JWT
   ▼
NestJS módulo openfinance/
   Controller → Service (orquesta) → Repository (Drizzle)
                  │
                  ├─ OpenFinanceProvider  (PUERTO, inyectado por DI)
                  │     ├─ MockOpenFinanceProvider   (v1)
                  │     └─ <Agregador/OF real>        (futuro, mismo contrato)
                  │
                  └─ domain/openfinance/ (normalización pura, sin DB)
```

### 3.1 Puerto `OpenFinanceProvider`
Contrato (formas canónicas OF, no entidades de Saldo):

- `listInstitutions(): Promise<OFInstitution[]>` — bancos disponibles.
- `startConsent(userId, institutionId): Promise<OFConsentResult>` — inicia consentimiento.
  Real: devuelve URL de redirect OAuth. Mock: devuelve consentimiento ya aprobado +
  `externalConnectionId`.
- `fetchAccounts(connection): Promise<OFAccount[]>` — cuentas de depósito con saldo.
- `fetchCreditProducts(connection): Promise<OFCreditProduct[]>` — tarjetas y préstamos.

Selección del adaptador por env (`OPEN_FINANCE_PROVIDER=mock` por defecto), vía token de
DI de NestJS.

### 3.2 `MockOpenFinanceProvider` (v1)
Datos deterministas: 2 instituciones colombianas de ejemplo; por institución, 1–2 cuentas
de depósito (ahorro/corriente con saldo), 1 tarjeta de crédito y 1 préstamo (libre
inversión o hipotecario). Cubre los caminos: cuenta de activo, tarjeta y deuda. Incluye
deliberadamente **un producto no mapeable** (p.ej. un tipo desconocido) para ejercitar la
ruta de "omitido y reportado".

### 3.3 Dominio puro `domain/openfinance/`
Tipos canónicos (`OFInstitution`, `OFAccount`, `OFCreditProduct`) y funciones de
**normalización**: OF → forma interna (`NormalizedAccount`, `NormalizedDebt`,
`NormalizedCard`). Sin dependencias de NestJS/Drizzle. 100% cubierto con unit tests.

## 4. Modelo de datos (migración 0011, aditiva)

### Tabla nueva `open_finance_connections`
- `id` UUID PK, `user_id` FK (cascade).
- `institution_id` text, `institution_name` text.
- `provider` text (`'mock'` en v1).
- `external_connection_id` text (id de la conexión en el proveedor).
- `status` enum `open_finance_status`: `pending` | `active` | `expired` | `revoked` | `error`.
- `consent_granted_at`, `consent_expires_at`, `last_synced_at` timestamps (nullables).
- `created_at`, `updated_at`, `deleted_at` (soft delete).
- Índice por `user_id` (vivas).

### Procedencia en `accounts` y `debts` (cambios aditivos)
A ambas tablas:
- `source` text `NOT NULL DEFAULT 'manual'` (`'manual'` | `'open_finance'`). Las filas
  existentes quedan `'manual'`.
- `connection_id` UUID FK → `open_finance_connections` (nullable; `ON DELETE SET NULL`).
- `external_id` text (id del producto en el banco; nullable para lo manual).
- **Unique parcial `(connection_id, external_id)` where `connection_id IS NOT NULL`** →
  la re-sincronización es **idempotente** (actualiza, no duplica).

### Reutilización
- **Saldos de cuenta:** `account_snapshots` con `source='open_finance'` (campo ya
  existente) y fecha = día de la sync.
- **Tarjetas:** patrón existente — `accounts.kind='credit_card'` + `credit_card_details`,
  con `source='open_finance'`.
- **Préstamos:** filas en `debts` con el tipo, saldo, tasa y cuota que provee OF. Como OF
  da el estado actual (no necesariamente la originación completa), se almacena lo
  disponible; **no se regenera el cronograma de `installments`** para deudas externas en
  v1 (se marcan como externas).

### Rollback
`DROP TABLE open_finance_connections;` + quitar `source`/`connection_id`/`external_id` e
índice unique de `accounts` y `debts`; `DROP TYPE open_finance_status;`.

## 5. Flujo y endpoints (módulo `openfinance/`)

1. `GET /open-finance/institutions` → lista de bancos del proveedor.
2. `POST /open-finance/connections` `{ institutionId }` → crea conexión (`pending`),
   dispara `startConsent`. Mock la deja `active` con `consent_granted_at`. Devuelve la
   conexión (real: incluiría `redirectUrl`).
3. `POST /open-finance/connections/:id/sync` → `fetchAccounts` + `fetchCreditProducts`,
   **concilia** (upsert por `(connection_id, external_id)`), crea snapshots, fija
   `last_synced_at`. Devuelve **resumen**: `{ accountsCreated, accountsUpdated,
   debtsCreated, debtsUpdated, cardsCreated, cardsUpdated, skipped }`.
4. `GET /open-finance/connections` → conexiones del usuario con estado y `last_synced_at`.
5. `DELETE /open-finance/connections/:id` → `status='revoked'`; deja de refrescar; conserva
   lo importado (queda read-only, sin conexión activa).

Todos los endpoints están aislados por `user_id` (un usuario solo ve/sincroniza sus
conexiones, aunque adivine un UUID), documentados en Swagger en español.

### Conciliación (núcleo del Service)
- **Cuenta de depósito OF:** upsert en `accounts` (`kind='asset'`, `source='open_finance'`,
  `connection_id`, `external_id`); inserta/actualiza `account_snapshots` de hoy con
  `source='open_finance'`.
- **Tarjeta OF:** upsert en `accounts` (`kind='credit_card'`) + `credit_card_details`.
- **Préstamo OF:** upsert en `debts` (saldo, tasa, cuota; sin cronograma en v1).
- **No mapeable:** se omite y suma a `skipped` en el resumen.
- **Idempotencia:** una segunda sync sin cambios no crea filas nuevas; si cambió el saldo,
  actualiza el snapshot/saldo.

### Read-only
Los servicios de `accounts` y `debts` rechazan **editar/borrar** filas con
`source='open_finance'` con error estándar `{ statusCode, message, detail }` (HTTP 409),
`message` en español ("Esta cuenta/deuda está vinculada a un banco y no se edita a mano").

## 6. Frontend (Flutter, feature `open_finance/`)

- **Pantalla "Conectar banco"** (entrada desde Cuentas): lista de bancos → consentir
  (mock: instantáneo) → conexión creada → botón **"Sincronizar"** → toast con el resumen.
- **Pantalla de conexiones**: estado, `last_synced_at`, acción **revocar**, re-sincronizar.
- **Cuentas y Deudas**: los ítems vinculados muestran **badge "Vinculado" + candado**; al
  tocar, detalle **sin editar/borrar**.
- **Estado (Riverpod):** `institutionsProvider`, `connectionsListProvider`, y una acción de
  sync que invalida `accountsListProvider`, deudas y `cardsListProvider`.
- Sigue la línea visual existente (Material 3, feedback inmediato, estados vacíos).

## 7. Manejo de errores

- **Proveedor (red/consentimiento):** la conexión pasa a `status='error'`; se superficie
  en la lista de conexiones con mensaje claro; reintentable con otra sync.
- **Productos parciales/no mapeables:** se omiten y se reportan en `skipped` (no rompen la
  sync).
- **Read-only:** edición/borrado de registros OF → 409 con `message` en español.
- Sin `catch` vacíos; errores logueados o propagados como `HttpException`.

## 8. Pruebas

- **Dominio (puro), 100%:** normalización OF → formas internas, incluyendo el caso no
  mapeable.
- **Conciliación (service + DB de test con mock):** sync dos veces ⇒ sin duplicados;
  cambio de saldo ⇒ snapshot/saldo actualizado; `skipped` contado.
- **Guard read-only:** editar/borrar cuenta y deuda OF ⇒ 409.
- **Aislamiento:** un usuario no ve ni sincroniza la conexión de otro ⇒ 404.
- **Integración Flutter (simulador):** conectar banco mock → sync → ver cuenta + deuda con
  badge "Vinculado", no editables.

## 9. Riesgos y notas

- **Cobertura parcial es esperada:** el diseño asume datos incompletos y lo reporta; no se
  bloquea por productos faltantes.
- **Swap a proveedor real:** solo implica una nueva clase que cumple `OpenFinanceProvider`
  y mapear su forma a la canónica OF; el resto (conciliación, read-only, UI) no cambia.
- **OAuth real (futuro):** `startConsent` ya contempla devolver `redirectUrl`; el ciclo
  `pending → active` queda modelado para enchufar el callback después.
