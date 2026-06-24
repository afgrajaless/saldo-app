import { roundMoney } from '../shared/money';

/** Parte de un gasto que le corresponde a un miembro. */
export interface MemberShare {
  memberId: string;
  shareAmount: number;
}

/**
 * Reparte un monto en partes iguales entre los participantes. El residuo de
 * centavos se asigna de forma determinista a los primeros para que la suma de
 * las partes sea exactamente el total.
 * @param amount - Monto total del gasto; debe ser mayor que cero.
 * @param memberIds - Ids de los participantes (al menos uno).
 * @returns Una parte por participante; la suma es igual a `amount`.
 */
export function splitEqual(amount: number, memberIds: string[]): MemberShare[] {
  if (memberIds.length === 0) {
    throw new Error('Se requiere al menos un participante.');
  }
  if (amount <= 0) {
    throw new Error('El monto total debe ser mayor que cero.');
  }
  const n = memberIds.length;
  // Convierte a centavos enteros para evitar drift de punto flotante.
  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents % n;

  const shares = memberIds.map((memberId, index) => {
    const centavos = baseCents + (index < remainderCents ? 1 : 0);
    return { memberId, shareAmount: centavos / 100 };
  });

  return shares;
}

/**
 * Valida un reparto exacto: la suma de las partes debe ser el total y cada
 * parte debe ser positiva. El monto total debe ser mayor que cero.
 * @param amount - Monto total del gasto; debe ser mayor que cero.
 * @param shares - Partes por participante.
 * @throws Error si la suma no coincide, hay montos no positivos o monto total <= 0.
 */
export function validateExact(amount: number, shares: MemberShare[]): void {
  if (amount <= 0) {
    throw new Error('El monto total debe ser mayor que cero.');
  }
  if (shares.length === 0) {
    throw new Error('Se requiere al menos un participante.');
  }
  if (shares.some((s) => s.shareAmount <= 0)) {
    throw new Error('Cada parte debe ser mayor que cero.');
  }
  const sum = roundMoney(shares.reduce((acc, s) => acc + s.shareAmount, 0));
  if (sum !== roundMoney(amount)) {
    throw new Error('La suma de las partes debe ser igual al total.');
  }
}
