import { roundMoney } from '../shared/money';

/**
 * Estado de confirmación de una parte de gasto compartido.
 * - confirmed: el miembro aceptó su parte.
 * - pending:   aún no ha respondido (se cuenta en el saldo).
 * - disputed:  el miembro rechaza la parte; se excluye del cálculo.
 */
export type ShareStatus = 'confirmed' | 'pending' | 'disputed';

/** Gasto con su pagador y el reparto entre participantes. */
export interface ExpenseInput {
  paidByMemberId: string;
  shares: { memberId: string; shareAmount: number; status: ShareStatus }[];
}

/** Pago entre dos miembros para saldar. */
export interface SettlementInput {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

/** Neto de un miembro: positivo = le deben; negativo = debe. */
export interface MemberBalance {
  memberId: string;
  net: number;
}

/** Deuda de un miembro hacia otro. */
export interface Debt {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

/**
 * Calcula el neto de cada miembro a partir de gastos y saldados.
 * neto = pagado − lo que le tocaba. Las partes con estado 'disputed' se excluyen:
 * no se acreditan al pagador ni se debitan al miembro que disputa.
 * Un settlement reduce el neto del receptor (cobra su acreencia)
 * e incrementa el del pagador (salda su deuda).
 * @param expenses - Gastos vivos del grupo con su reparto.
 * @param settlements - Pagos de saldo entre miembros.
 * @param memberIds - Todos los miembros del grupo.
 * @returns El neto por miembro (la suma total es 0).
 */
export function computeBalances(
  expenses: ExpenseInput[],
  settlements: SettlementInput[],
  memberIds: string[],
): MemberBalance[] {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (id: string, delta: number) =>
    net.set(id, (net.get(id) ?? 0) + delta);

  for (const expense of expenses) {
    const active = expense.shares.filter((s) => s.status !== 'disputed');
    const total = active.reduce((sum, s) => sum + s.shareAmount, 0);
    add(expense.paidByMemberId, total);
    for (const share of active) add(share.memberId, -share.shareAmount);
  }
  for (const s of settlements) {
    add(s.toMemberId, -s.amount);
    add(s.fromMemberId, s.amount);
  }
  return memberIds.map((id) => ({ memberId: id, net: roundMoney(net.get(id) ?? 0) }));
}

/** Deuda directa de un deudor hacia el pagador de un gasto, con desglose pendiente. */
export interface DirectDebt {
  fromMemberId: string;
  toMemberId: string;
  owed: number;
  pendingOwed: number;
  hasPending: boolean;
}

/**
 * Calcula la deuda directa por pagador (deudor → pagador del gasto), con cuánto
 * de lo adeudado proviene de partes pendientes de confirmar.
 * @param expenses - Gastos con su reparto y estado por parte.
 * @param settlements - Pagos entre miembros.
 * @returns Una entrada por par (deudor, pagador) con owed > 0.
 */
export function computeDirectDebts(
  expenses: ExpenseInput[],
  settlements: SettlementInput[],
): DirectDebt[] {
  const owed = new Map<string, number>();        // key `from|to`
  const pending = new Map<string, number>();
  const key = (from: string, to: string) => `${from}|${to}`;

  for (const expense of expenses) {
    const payer = expense.paidByMemberId;
    for (const s of expense.shares) {
      if (s.status === 'disputed' || s.memberId === payer) continue;
      const k = key(s.memberId, payer);
      owed.set(k, roundMoney((owed.get(k) ?? 0) + s.shareAmount));
      if (s.status === 'pending') {
        pending.set(k, roundMoney((pending.get(k) ?? 0) + s.shareAmount));
      }
    }
  }
  // Las settlements reducen primero la porcion confirmada (owed - pending).
  for (const st of settlements) {
    const k = key(st.fromMemberId, st.toMemberId);
    const newOwed = roundMoney((owed.get(k) ?? 0) - st.amount);
    owed.set(k, newOwed);
    const pend = pending.get(k) ?? 0;
    // pendiente no puede exceder lo adeudado restante.
    if (pend > Math.max(newOwed, 0)) pending.set(k, roundMoney(Math.max(newOwed, 0)));
  }
  const result: DirectDebt[] = [];
  for (const [k, value] of owed) {
    if (value <= 0) continue;
    const [fromMemberId, toMemberId] = k.split('|');
    const pendingOwed = roundMoney(Math.min(pending.get(k) ?? 0, value));
    result.push({ fromMemberId, toMemberId, owed: value, pendingOwed, hasPending: pendingOwed > 0 });
  }
  return result;
}

/**
 * Deriva una lista de deudas pairwise emparejando deudores con acreedores en
 * orden determinista hasta agotar los saldos (no minimiza transacciones).
 * @param balances - Netos por miembro.
 * @returns Lista de "X le debe a Y un monto".
 */
export function deriveDebts(balances: MemberBalance[]): Debt[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.memberId, amount: -b.net }));
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.memberId, amount: b.net }));
  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (pay > 0) {
      debts.push({ fromMemberId: debtors[i].id, toMemberId: creditors[j].id, amount: pay });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - pay);
    creditors[j].amount = roundMoney(creditors[j].amount - pay);
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
    if (pay === 0) break;
  }
  return debts;
}
