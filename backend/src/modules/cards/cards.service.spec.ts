import { NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsRepository, CardRow } from './cards.repository';

/** Construye una fila de tarjeta de prueba. */
function makeCard(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Visa Platinum',
    color: '#1A1A2E',
    kind: 'credit_card',
    yieldType: 'none',
    effectiveAnnualRate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    creditLimit: '5000000.00',
    statementDay: 15,
    paymentDay: 25,
    rotativoRateEa: '0.280000',
    minPaymentPct: '0.0500',
    managementFee: null,
    managementFeePeriod: 'none',
    detailCreatedAt: new Date(),
    detailUpdatedAt: new Date(),
    ...overrides,
  };
}

type RepoMock = jest.Mocked<CardsRepository>;

/** Crea un repositorio completamente mockeado. */
function makeRepo(): RepoMock {
  return {
    createCard: jest.fn(),
    updateCard: jest.fn(),
    findCardForUser: jest.fn(),
    listCards: jest.fn().mockResolvedValue([]),
  } as unknown as RepoMock;
}

describe('CardsService', () => {
  let service: CardsService;
  let repo: RepoMock;

  beforeEach(() => {
    repo = makeRepo();
    service = new CardsService(repo);
  });

  describe('createCard', () => {
    it('llama al repositorio con kind credit_card y los detalles correctos', async () => {
      const card = makeCard();
      repo.createCard.mockResolvedValue(card);

      const dto = {
        name: 'Visa Platinum',
        creditLimit: 5_000_000,
        statementDay: 15,
        paymentDay: 25,
        rotativoRateEa: 0.28,
      };

      await service.createCard('user-1', dto);

      expect(repo.createCard).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          name: 'Visa Platinum',
          creditLimit: 5_000_000,
          statementDay: 15,
          paymentDay: 25,
          rotativoRateEa: 0.28,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException cuando la tarjeta no pertenece al usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);

      await expect(service.findOne('user-1', 'acc-ajena')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retorna el DTO cuando la tarjeta pertenece al usuario', async () => {
      const card = makeCard();
      repo.findCardForUser.mockResolvedValue(card);

      const result = await service.findOne('user-1', 'acc-1');

      expect(result.id).toBe('acc-1');
      expect(result.creditLimit).toBe(5_000_000);
    });
  });

  describe('updateCard', () => {
    it('lanza NotFoundException cuando la tarjeta no existe para el usuario', async () => {
      repo.findCardForUser.mockResolvedValue(undefined);

      await expect(service.updateCard('user-1', 'acc-ajena', { name: 'Otro' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
