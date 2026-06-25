import {
  normalizeAccount,
  normalizeCreditProduct,
  mapLoanKindToDebtType,
} from './normalize';
import { OFAccount, OFCreditProduct } from './types';

describe('normalizeAccount', () => {
  it('mapea una cuenta de ahorro a la forma interna', () => {
    const of: OFAccount = {
      externalId: 'acc-1',
      name: 'Ahorros Bancolombia',
      type: 'savings',
      balance: 1500000,
      currency: 'COP',
    };
    expect(normalizeAccount(of)).toEqual({
      externalId: 'acc-1',
      name: 'Ahorros Bancolombia',
      balance: 1500000,
    });
  });
});

describe('mapLoanKindToDebtType', () => {
  it('mapea tipos conocidos', () => {
    expect(mapLoanKindToDebtType('hipotecario')).toBe('hipotecario');
    expect(mapLoanKindToDebtType('libre_inversion')).toBe('libre_inversion');
  });
  it('cae a libre_inversion cuando es desconocido', () => {
    expect(mapLoanKindToDebtType('algo_raro')).toBe('libre_inversion');
    expect(mapLoanKindToDebtType(undefined)).toBe('libre_inversion');
  });
});

describe('normalizeCreditProduct', () => {
  it('normaliza una tarjeta de crédito', () => {
    const of: OFCreditProduct = {
      externalId: 'card-1',
      name: 'Visa Oro',
      type: 'credit_card',
      balance: 900000,
      creditLimit: 5000000,
      statementDay: 15,
      paymentDay: 5,
      rotativoRateEa: 0.28,
    };
    const r = normalizeCreditProduct(of);
    expect(r.kind).toBe('card');
    if (r.kind === 'card') {
      expect(r.card).toEqual({
        externalId: 'card-1',
        name: 'Visa Oro',
        balance: 900000,
        creditLimit: 5000000,
        statementDay: 15,
        paymentDay: 5,
        rotativoRateEa: 0.28,
      });
    }
  });

  it('normaliza un préstamo a deuda', () => {
    const of: OFCreditProduct = {
      externalId: 'loan-1',
      name: 'Crédito hipotecario',
      type: 'loan',
      balance: 80000000,
      effectiveAnnualRate: 0.13,
      monthlyPayment: 950000,
      termMonths: 180,
      loanKind: 'hipotecario',
    };
    const r = normalizeCreditProduct(of);
    expect(r.kind).toBe('debt');
    if (r.kind === 'debt') {
      expect(r.debt).toEqual({
        externalId: 'loan-1',
        creditor: 'Crédito hipotecario',
        debtType: 'hipotecario',
        balance: 80000000,
        effectiveAnnualRate: 0.13,
        monthlyPayment: 950000,
        termMonths: 180,
      });
    }
  });

  it('omite una tarjeta sin datos mínimos', () => {
    const of: OFCreditProduct = {
      externalId: 'card-x',
      name: 'Tarjeta incompleta',
      type: 'credit_card',
      balance: 100000,
    };
    const r = normalizeCreditProduct(of);
    expect(r).toEqual({ kind: 'skipped', reason: 'tarjeta sin datos mínimos: card-x' });
  });

  it('omite un tipo de producto desconocido', () => {
    const of: OFCreditProduct = {
      externalId: 'p-9',
      name: 'Producto raro',
      type: 'leasing',
      balance: 100000,
    };
    const r = normalizeCreditProduct(of);
    expect(r).toEqual({ kind: 'skipped', reason: 'tipo de producto no soportado: leasing' });
  });
});
