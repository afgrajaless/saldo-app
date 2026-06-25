import { AccountsService } from './accounts.service';
import { AccountsRepository } from './accounts.repository';

type RepoMock = jest.Mocked<
  Pick<AccountsRepository, 'netWorthSeries' | 'sumCreditCardLiabilities'>
>;

/** Crea un repositorio de cuentas parcialmente mockeado para pruebas de netWorthSeries. */
function makeRepo(): RepoMock {
  return {
    netWorthSeries: jest.fn(),
    sumCreditCardLiabilities: jest.fn().mockResolvedValue('0'),
  };
}

describe('AccountsService — netWorthSeries', () => {
  let service: AccountsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new AccountsService(repo as unknown as AccountsRepository);
  });

  it('resta el saldo de tarjetas de credito del patrimonio cuando hay una tarjeta con deuda', async () => {
    repo.netWorthSeries.mockResolvedValue([
      { asOfDate: '2026-06-01', total: '5000000' },
      { asOfDate: '2026-06-15', total: '5200000' },
    ]);
    repo.sumCreditCardLiabilities.mockResolvedValue('800000.00');

    const result = await service.netWorthSeries('user-1');

    // Patrimonio debe ser saldo_activos - deuda_tarjetas
    expect(result[0].total).toBe(4_200_000);
    expect(result[1].total).toBe(4_400_000);
  });

  it('no resta nada cuando no hay tarjetas de credito (liability = 0)', async () => {
    repo.netWorthSeries.mockResolvedValue([{ asOfDate: '2026-06-01', total: '3000000' }]);
    repo.sumCreditCardLiabilities.mockResolvedValue('0');

    const result = await service.netWorthSeries('user-1');

    expect(result[0].total).toBe(3_000_000);
  });
});
