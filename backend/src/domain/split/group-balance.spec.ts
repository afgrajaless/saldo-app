import { computeBalances, deriveDebts } from './group-balance';

describe('computeBalances', () => {
  it('calcula el neto por miembro y suma cero', () => {
    // a paga 90000, repartido 30000 c/u entre a,b,c.
    const balances = computeBalances(
      [
        {
          paidByMemberId: 'a',
          shares: [
            { memberId: 'a', shareAmount: 30000, status: 'confirmed' },
            { memberId: 'b', shareAmount: 30000, status: 'confirmed' },
            { memberId: 'c', shareAmount: 30000, status: 'confirmed' },
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
            { memberId: 'a', shareAmount: 0, status: 'confirmed' },
            { memberId: 'b', shareAmount: 100, status: 'confirmed' },
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

  it('excluye las partes disputadas y los netos siguen sumando 0', () => {
    // a paga 90000, repartido 30000 c/u; b disputa su parte.
    const balances = computeBalances(
      [{
        paidByMemberId: 'a',
        shares: [
          { memberId: 'a', shareAmount: 30000, status: 'confirmed' },
          { memberId: 'b', shareAmount: 30000, status: 'disputed' },
          { memberId: 'c', shareAmount: 30000, status: 'pending' },
        ],
      }],
      [],
      ['a', 'b', 'c'],
    );
    const byId = Object.fromEntries(balances.map((x) => [x.memberId, x.net]));
    // La parte de b queda fuera del libro: a solo recupera 30000 (la de c).
    expect(byId.a).toBe(30000);
    expect(byId.b).toBe(0);
    expect(byId.c).toBe(-30000);
    expect(balances.reduce((s, x) => s + x.net, 0)).toBe(0);
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

  it('multi-acreedor/multi-deudor: empareja deterministicamente', () => {
    const debts = deriveDebts([
      { memberId: 'a', net: 50 },
      { memberId: 'b', net: 50 },
      { memberId: 'c', net: -60 },
      { memberId: 'd', net: -40 },
    ]);
    // c debe 60: paga 50 a a, luego 10 a b.
    // d debe 40: paga 40 a b.
    expect(debts).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amount: 50 },
      { fromMemberId: 'c', toMemberId: 'b', amount: 10 },
      { fromMemberId: 'd', toMemberId: 'b', amount: 40 },
    ]);
    // Verificar suma de montos: suma de pagos por deudor = su deuda.
    const cPayments = debts.filter((d) => d.fromMemberId === 'c').reduce((s, d) => s + d.amount, 0);
    const dPayments = debts.filter((d) => d.fromMemberId === 'd').reduce((s, d) => s + d.amount, 0);
    expect(cPayments).toBe(60);
    expect(dPayments).toBe(40);
    // Verificar suma de montos: suma recibida por acreedor = su acreencia.
    const aReceived = debts.filter((d) => d.toMemberId === 'a').reduce((s, d) => s + d.amount, 0);
    const bReceived = debts.filter((d) => d.toMemberId === 'b').reduce((s, d) => s + d.amount, 0);
    expect(aReceived).toBe(50);
    expect(bReceived).toBe(50);
  });
});
