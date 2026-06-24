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
 * @param amount - Monto total del gasto.
 * @param memberIds - Ids de los participantes (al menos uno).
 * @returns Una parte por participante; la suma es igual a `amount`.
 */
export function splitEqual(amount: number, memberIds: string[]): MemberShare[] {
  if (memberIds.length === 0) {
    throw new Error('Se requiere al menos un participante.');
  }
  const n = memberIds.length;
  const base = roundMoney(Math.floor((amount * 100) / n) / 100);
  const shares = memberIds.map((memberId) => ({ memberId, shareAmount: base }));
  // Residuo en centavos a repartir de a uno desde el primer participante.
  let remainder = Math.round((amount - base * n) * 100);
  for (let i = 0; remainder > 0; i = (i + 1) % n, remainder--) {
    shares[i].shareAmount = roundMoney(shares[i].shareAmount + 0.01);
  }
  return shares;
}

/**
 * Valida un reparto exacto: la suma de las partes debe ser el total y cada
 * parte debe ser positiva.
 * @param amount - Monto total del gasto.
 * @param shares - Partes por participante.
 * @throws Error si la suma no coincide o hay montos no positivos.
 */
export function validateExact(amount: number, shares: MemberShare[]): void {
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
