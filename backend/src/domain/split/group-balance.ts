import { roundMoney } from '../shared/money';

/** Gasto con su pagador y el reparto entre participantes. */
export interface ExpenseInput {
  paidByMemberId: string;
  shares: { memberId: string; shareAmount: number }[];
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
 * neto = pagado − lo que le tocaba + recibido (settlements) − pagado (settlements).
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
    const total = expense.shares.reduce((s, x) => s + x.shareAmount, 0);
    add(expense.paidByMemberId, total);
    for (const share of expense.shares) add(share.memberId, -share.shareAmount);
  }
  for (const s of settlements) {
    add(s.toMemberId, -s.amount);
    add(s.fromMemberId, s.amount);
  }
  return memberIds.map((id) => ({ memberId: id, net: roundMoney(net.get(id) ?? 0) }));
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
  }
  return debts;
}
