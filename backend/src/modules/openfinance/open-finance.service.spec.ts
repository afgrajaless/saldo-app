import { NotFoundException } from '@nestjs/common';
import { OpenFinanceService } from './open-finance.service';
import { OpenFinanceProvider } from './provider/open-finance.provider';
import { OpenFinanceRepository, ConnectionRow } from './open-finance.repository';

function fakeRepo(): jest.Mocked<Pick<OpenFinanceRepository,
  'findConnectionForUser' | 'updateConnection' | 'upsertAccount' | 'upsertCard' | 'upsertDebt' | 'insertSnapshot'>> {
  return {
    findConnectionForUser: jest.fn(),
    updateConnection: jest.fn(),
    upsertAccount: jest.fn(),
    upsertCard: jest.fn(),
    upsertDebt: jest.fn(),
    insertSnapshot: jest.fn(),
  } as never;
}

function fakeProvider(): jest.Mocked<OpenFinanceProvider> {
  return {
    id: 'mock',
    listInstitutions: jest.fn(),
    startConsent: jest.fn(),
    fetchAccounts: jest.fn(),
    fetchCreditProducts: jest.fn(),
  };
}

describe('OpenFinanceService.sync', () => {
  it('concilia cuentas, tarjeta, deuda y cuenta los omitidos', async () => {
    const repo = fakeRepo();
    const provider = fakeProvider();
    const conn = { id: 'c1', userId: 'u1', externalConnectionId: 'of:banco-001:u1' } as ConnectionRow;
    repo.findConnectionForUser.mockResolvedValue(conn);
    provider.fetchAccounts.mockResolvedValue([
      { externalId: 'a1', name: 'Ahorros', type: 'savings', balance: 1000000, currency: 'COP' },
    ]);
    provider.fetchCreditProducts.mockResolvedValue([
      { externalId: 'card1', name: 'Visa', type: 'credit_card', balance: 900000, creditLimit: 5000000, statementDay: 15, paymentDay: 5, rotativoRateEa: 0.28 },
      { externalId: 'loan1', name: 'Hipoteca', type: 'loan', balance: 8e7, effectiveAnnualRate: 0.13, monthlyPayment: 9e5, termMonths: 180, loanKind: 'hipotecario' },
      { externalId: 'x1', name: 'Leasing', type: 'leasing', balance: 1000 },
    ]);
    repo.upsertAccount.mockResolvedValue({ created: true, accountId: 'acc-a1' });
    repo.upsertCard.mockResolvedValue({ created: true, accountId: 'acc-card1' });
    repo.upsertDebt.mockResolvedValue({ created: true });

    const service = new OpenFinanceService(repo as never, provider);
    const summary = await service.sync('u1', 'c1');

    expect(summary).toEqual({
      accountsCreated: 1, accountsUpdated: 0,
      cardsCreated: 1, cardsUpdated: 0,
      debtsCreated: 1, debtsUpdated: 0,
      skipped: 1,
    });
    expect(repo.insertSnapshot).toHaveBeenCalledWith('u1', 'acc-a1', 1000000);
    expect(repo.updateConnection).toHaveBeenCalledWith('c1', expect.objectContaining({ lastSyncedAt: expect.any(Date) }));
    // snapshot también para la tarjeta, NO para la deuda:
    expect(repo.insertSnapshot).toHaveBeenCalledWith('u1', 'acc-card1', 900000);
    expect(repo.insertSnapshot).toHaveBeenCalledTimes(2);
  });

  it('lanza 404 si la conexión no es del usuario', async () => {
    const repo = fakeRepo();
    const provider = fakeProvider();
    repo.findConnectionForUser.mockResolvedValue(undefined);
    const service = new OpenFinanceService(repo as never, provider);
    await expect(service.sync('u1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
