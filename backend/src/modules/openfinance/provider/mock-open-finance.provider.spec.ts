import { OFCreditProduct } from '../../../domain/openfinance/types';
import { MockOpenFinanceProvider } from './mock-open-finance.provider';

describe('MockOpenFinanceProvider', () => {
  const provider = new MockOpenFinanceProvider();

  it('lista al menos dos instituciones', async () => {
    const insts = await provider.listInstitutions();
    expect(insts.length).toBeGreaterThanOrEqual(2);
    expect(insts[0]).toHaveProperty('id');
    expect(insts[0]).toHaveProperty('name');
  });

  it('inicia consentimiento activo con id externo', async () => {
    const r = await provider.startConsent('user-1', insts0Id(await provider.listInstitutions()));
    expect(r.status).toBe('active');
    expect(r.externalConnectionId).toMatch(/.+/);
  });

  it('trae cuentas y productos de crédito deterministas', async () => {
    const consent = await provider.startConsent('user-1', insts0Id(await provider.listInstitutions()));
    const accounts = await provider.fetchAccounts(consent.externalConnectionId);
    const products = await provider.fetchCreditProducts(consent.externalConnectionId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(products.some((p: OFCreditProduct) => p.type === 'credit_card')).toBe(true);
    expect(products.some((p: OFCreditProduct) => p.type === 'loan')).toBe(true);
    // Incluye un producto no mapeable para ejercitar la ruta 'skipped'.
    expect(products.some((p: OFCreditProduct) => p.type !== 'credit_card' && p.type !== 'loan')).toBe(true);
  });
});

function insts0Id(insts: { id: string }[]): string {
  return insts[0].id;
}
