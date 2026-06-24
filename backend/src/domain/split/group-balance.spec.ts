import { computeBalances, deriveDebts } from './group-balance';

describe('computeBalances', () => {
  it('calcula el neto por miembro y suma cero', () => {
    // a paga 90000, repartido 30000 c/u entre a,b,c.
    const balances = computeBalances(
      [
        {
          paidByMemberId: 'a',
          shares: [
            { memberId: 'a', shareAmount: 30000 },
            { memberId: 'b', shareAmount: 30000 },
            { memberId: 'c', shareAmount: 30000 },
          ],
        },
      ],
      [],
      ['a', 'b', 'c'],
    );
    const byId = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(byId.a).toBe(60000); // pago 90000, le tocaba 30000
    expect(byId.b).toBe(-30000);
    expect(byId.c).toBe(-30000);
    expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0);
  });

  it('un settlement reduce la deuda', () => {
    const balances = computeBalances(
      [
        {
          paidByMemberId: 'a',
          shares: [
            { memberId: 'a', shareAmount: 0 },
            { memberId: 'b', shareAmount: 100 },
          ],
        },
      ],
      [{ fromMemberId: 'b', toMemberId: 'a', amount: 100 }],
      ['a', 'b'],
    );
    const byId = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(byId.a).toBe(0);
    expect(byId.b).toBe(0);
  });
});

describe('deriveDebts', () => {
  it('empareja deudores con acreedores', () => {
    const debts = deriveDebts([
      { memberId: 'a', net: 60000 },
      { memberId: 'b', net: -30000 },
      { memberId: 'c', net: -30000 },
    ]);
    // b y c le deben 30000 cada uno a a.
    expect(debts).toEqual([
      { fromMemberId: 'b', toMemberId: 'a', amount: 30000 },
      { fromMemberId: 'c', toMemberId: 'a', amount: 30000 },
    ]);
  });

  it('sin deudas cuando todo esta saldado', () => {
    expect(deriveDebts([
      { memberId: 'a', net: 0 },
      { memberId: 'b', net: 0 },
    ])).toEqual([]);
  });
});
