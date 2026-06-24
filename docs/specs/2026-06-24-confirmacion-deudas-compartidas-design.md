# Confirmación de deudas compartidas + deudas de grupo en la pantalla de Deudas — Diseño

> Fecha: 2026-06-24
> Estado: aprobado (pendiente de revisión final del usuario)
> Proyecto: Saldo (app_financiera) · rama `develop`
> Depende de: feature de grupos de gasto compartido (módulo `groups`).

## 1. Resumen

Dos capacidades enlazadas sobre los grupos de gasto compartido:

1. **Confirmar / refutar** la parte que te corresponde de cada gasto, para que nadie te
   endose una deuda sin tu visto bueno (evitar "deuda inexplicada").
2. **Ver lo que debes en grupos dentro de la pantalla de Deudas**, mezclado con los
   créditos formales, con un color distinto cuando hay partes sin confirmar.

### Decisiones de producto (tomadas en brainstorming)

1. **Granularidad:** confirmas/refutas **tu parte de cada gasto** (no el gasto entero, no el
   neto agregado). Estilo Splitwise.
2. **Estados de una parte:** `confirmed` / `pending` / `disputed`. La parte del **pagador** y
   de los **fantasmas** nace `confirmed`; la de cada **participante real** nace `pending`.
3. **Efecto en el saldo:** `pending` **cuenta** (marcada "sin confirmar"); `confirmed` cuenta;
   `disputed` **NO cuenta** (queda fuera del libro hasta resolverse).
4. **Resolución de disputa:** al refutar (con nota opcional) se avisa al pagador, que puede
   **editar** el gasto (vuelve a `pending` para reconfirmar) o **eliminarlo**; el refutador
   puede **reconfirmar**.
5. **En Deudas:** las deudas de grupo aparecen **mezcladas** con las formales, como tarjetas
   virtuales (no se crean créditos falsos con tasa/amortización), con **color ámbar/rojo si
   hay partes sin confirmar**. Solo lectura (se salda dentro del grupo).

## 2. Alcance

### MVP
- Columna de estado en las partes de gasto; el servicio asigna `pending`/`confirmed` al crear.
- Endpoints `confirm` / `dispute` sobre la parte propia; reset a `pending` al editar el gasto.
- Dominio: `computeBalances` que excluye `disputed`; `computeDirectDebts` (deuda directa por
  pagador, con `owed`/`pendingOwed`).
- Saldo del grupo enriquecido (deudas directas + `pendingOwed`/`hasPending` + `myPendingCount`).
- Endpoint agregado `GET /groups/me/debts` para la pantalla de Deudas.
- UI: estados por participante en el gasto + acciones confirmar/refutar + badge "Por confirmar";
  Deudas mezcla créditos + deudas de grupo con color de estado.

### Fuera del MVP (futuro)
- Minimización de pagos (debt-simplification) — el grupo pasa a deuda **directa por pagador**.
- Confirmación de **liquidaciones** (settlements) por el receptor.
- Notificaciones push (hoy el descubrimiento es pull + badge al abrir).
- Hilo de conversación por gasto.

## 3. Modelo de datos (migración 0008, aditiva)

Enum nuevo `share_status` (`confirmed`, `pending`, `disputed`).

`shared_expense_shares` agrega:
| Columna | Tipo | Notas |
|---|---|---|
| `status` | `share_status` NOT NULL DEFAULT `'confirmed'` | filas existentes y partes de pagador/fantasma quedan `confirmed`; el servicio pone `pending` a participantes reales |
| `disputed_note` | text NULL | motivo opcional al refutar |
| `status_changed_at` | timestamptz NULL | cuándo cambió el estado por última vez |

Rollback: `ALTER TABLE shared_expense_shares DROP COLUMN status, DROP COLUMN disputed_note,
DROP COLUMN status_changed_at;` + `DROP TYPE share_status;`

## 4. Dominio (`backend/src/domain/split/`)

### 4.1 `computeBalances` respeta los estados
Para cada gasto, el crédito del pagador = suma de las partes **no disputadas**, y se debitan
solo las partes **no disputadas**. Así la porción `disputed` queda fuera del libro (el pagador
la "carga" temporalmente) y los netos siguen sumando 0. `pending` y `confirmed` cuentan.

- Entrada: `ExpenseInput.shares` ahora lleva `status` por share.
- Regla: filtrar `status !== 'disputed'` antes de acumular crédito y débito.
- Invariante de test: la suma de todos los netos = 0 (incluyendo gastos con partes disputadas).

### 4.2 `computeDirectDebts` (nuevo)
Deuda directa por pagador, con estado. Para cada (deudor → pagador):
```
owed(deudor, pagador) =
    Σ shareAmount de las partes del deudor (status != disputed) en gastos pagados por el pagador
  − Σ settlements del deudor hacia el pagador
pendingOwed(deudor, pagador) =
    Σ shareAmount de las partes del deudor con status = 'pending' en gastos de ese pagador
```
- Devuelve por par: `{ fromMemberId, toMemberId, owed, pendingOwed, hasPending }` para `owed > 0`.
- Es el reemplazo, para esta feature, del greedy `deriveDebts` (que perdía el vínculo con la
  parte y su estado). El greedy queda para "futuro: simplificar pagos".
- `pendingOwed ≤ owed`. Las settlements reducen `owed`; para el desglose pending/confirmado se
  aplican primero a la porción confirmada (las settlements no "confirman" partes).
- 100% testeable sin BD.

## 5. Backend (`backend/src/modules/groups/`)

### 5.1 Confirmar / refutar (sobre la parte propia)
- `POST /groups/:id/expenses/:expenseId/confirm` → pone la parte del usuario en `confirmed`
  (sirve para reconfirmar desde `disputed`).
- `POST /groups/:id/expenses/:expenseId/dispute` (body `{ note?: string }`) → parte del usuario
  a `disputed` + guarda `disputed_note` y `status_changed_at`.
- Validación: `assertActiveMember`; el usuario debe **participar** del gasto (tener una share);
  no puede actuar sobre la parte de otro; no puede disputar su propia parte como pagador
  (`paidByMemberId` == su memberId). Errores `HttpException` en español (403/404/400).

### 5.2 Reset al editar
En `updateExpense`, **todas** las partes de participantes reales no pagadores se ponen en
`pending` (con `status_changed_at`) — cualquier edición invalida las confirmaciones previas;
pagador y fantasmas permanecen `confirmed`. (Cubre la "resolución" de una disputa: el pagador
corrige → cada participante reconfirma.)

### 5.3 Saldo enriquecido
`GET /groups/:id/balance` → además de `members` (neto), agrega:
- `debts`: deudas **directas** (de `computeDirectDebts`) con `fromName`/`toName`, `owed`,
  `pendingOwed`, `hasPending`.
- `myPendingCount`: cuántas partes del usuario actual están `pending` en el grupo (para badge).

### 5.4 Endpoint agregado para Deudas
`GET /groups/me/debts` → recorre los grupos activos del usuario y devuelve, por acreedor:
`{ groupId, groupName, creditorMemberId, creditorName, amountOwed, pendingAmount, hasPending }`
solo donde `amountOwed > 0`. Una sola llamada para poblar la sección de Deudas. Repositorio
dedicado (lee gastos+shares+settlements de todos los grupos del usuario en una pasada) +
dominio para el cálculo.

## 6. Frontend (Flutter)

### 6.1 Grupo — estados y acciones
- En la pestaña **Gastos** (y/o un detalle de gasto), cada participante muestra su estado con
  un chip: *Confirmado* (verde) / *Pendiente* (ámbar) / *En disputa* (rojo).
- En un gasto donde la parte del usuario está `pending` o `disputed`, aparecen **Confirmar** /
  **Refutar** (diálogo con nota opcional). Tras la acción: invalidar `groupExpensesProvider` +
  `groupBalanceProvider`.
- **Badge "Por confirmar (N)"** usando `myPendingCount` del balance: en el detalle del grupo y
  un indicador en el tab **Compartido** del shell.
- La pestaña **Saldos** muestra las deudas directas con su monto; marca "sin confirmar" cuando
  `hasPending`.

### 6.2 Deudas — lista mezclada
- La pantalla de Deudas combina dos fuentes: créditos formales (existente) + deudas de grupo
  (`myGroupDebtsProvider` → `GET /groups/me/debts`).
- **Tarjeta de deuda de grupo:** marca/ícono de grupo, "Le debes a Ana · Apto 502", monto;
  **color ámbar/rojo si `hasPending`** con etiqueta "sin confirmar". **Solo lectura** (no
  abono/pago; se salda dentro del grupo); `onTap` abre el `GroupDetailScreen`.
- **Orden:** la estrategia de pago (avalancha / costo mensual, `prioritize_debts`) aplica solo
  a las formales. Las de grupo (sin tasa) van en un bloque propio, ordenadas por monto, debajo
  de las formales (o en una sección "Compartido" dentro de la misma lista).
- Entidades nuevas: `ShareStatus` (enum) en `ExpenseShare`; `GroupDebtSummary
  { groupId, groupName, creditorName, amountOwed, pendingAmount, hasPending }`; provider
  `myGroupDebts`.

## 7. Manejo de errores
- Estructura consistente (`HttpException`, mensaje en español): 403 (no miembro), 404
  (gasto/grupo inexistente o no participas), 400 (acción inválida: disputar parte ajena o la
  propia del pagador; `note` excede `maxLength`). El front muestra `message` en `SnackBar`.

## 8. Pruebas
- **Dominio:** `computeBalances` excluye `disputed` y los netos suman 0; `computeDirectDebts`
  (owed/pendingOwed, settlements reducen owed, pending ≤ owed).
- **Backend:** confirmar/disputar (solo la parte propia; 403/400 en casos inválidos), reset a
  `pending` al editar, `myPendingCount`, endpoint agregado `groups/me/debts`, aislamiento (un
  no-miembro recibe 403).
- **Flutter:** `analyze` limpio + integration test: usuario A crea gasto → usuario B ve su
  parte `pending` → confirma → el saldo lo refleja; B refuta → la porción sale del saldo; la
  pantalla de Deudas de B muestra la deuda de grupo con color de estado.

## 9. Riesgos y notas
- **Cambio de modelo de "quién debe a quién"** (greedy → directo por pagador): es más
  transparente y necesario para el estado, pero altera la vista de Saldos del grupo respecto a
  la versión actual. Asumido como mejora.
- **Settlements vs estado:** una liquidación reduce `owed` pero no "confirma" partes; el
  desglose pending/confirmado aplica las settlements primero a lo confirmado para no ocultar lo
  pendiente.
- **Descubrimiento pull:** el usuario ve sus pendientes al abrir el grupo / por el badge; sin
  push en el MVP.
- **Aislamiento cross-user:** las nuevas rutas y el agregado siguen validando membresía real
  activa; cubrir con test que un no-miembro reciba 403.
