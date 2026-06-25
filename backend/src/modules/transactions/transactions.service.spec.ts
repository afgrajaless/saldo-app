import { BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository, TransactionRow } from './transactions.repository';
import { CategoriesRepository, CategoryRow } from '../categories/categories.repository';
import { AccountsRepository, AccountRow } from '../accounts/accounts.repository';
import { CardsRepository, CardRow } from '../cards/cards.repository';

// ---------- helpers ----------

function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Compras',
    type: 'expense',
    parentId: null,
    color: '#000000',
    monthlyBudget: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeAccount(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Cuenta corriente',
    color: '#2D6FB0',
    kind: 'asset',
    yieldType: 'none',
    effectiveAnnualRate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeCard(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'card-1',
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
    // 28 % E.A. — tasa tipica de tarjeta en Colombia
    rotativoRateEa: '0.280000',
    minPaymentPct: '0.0500',
    managementFee: null,
    managementFeePeriod: 'none',
    detailCreatedAt: new Date(),
    detailUpdatedAt: new Date(),
    ...overrides,
  };
}

function makeTxRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
  return {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    accountId: 'card-1',
    amount: '1200000.00',
    occurredOn: '2026-06-01',
    description: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------- tipos de mock ----------

type TxRepoMock = jest.Mocked<TransactionsRepository>;
type CatRepoMock = jest.Mocked<CategoriesRepository>;
type AccRepoMock = jest.Mocked<AccountsRepository>;
type CardsRepoMock = jest.Mocked<CardsRepository>;

function makeTxRepo(): TxRepoMock {
  return {
    create: jest.fn(),
    createTransactionWithPlan: jest.fn(),
    findByUserAndMonth: jest.fn().mockResolvedValue([]),
    sumByCategoryForMonth: jest.fn().mockResolvedValue([]),
    findByIdForUser: jest.fn(),
    delete: jest.fn(),
  } as unknown as TxRepoMock;
}

function makeCatRepo(): CatRepoMock {
  return {
    findByIdForUser: jest.fn(),
    hasLiveChildren: jest.fn().mockResolvedValue(false),
    create: jest.fn(),
    findAllByUser: jest.fn().mockResolvedValue([]),
    findByNameInScope: jest.fn(),
    findChildren: jest.fn(),
    hasTransactions: jest.fn(),
    moveTransactions: jest.fn(),
    reassignTransactions: jest.fn(),
    softDelete: jest.fn(),
    update: jest.fn(),
    countTransactionsByUser: jest.fn(),
  } as unknown as CatRepoMock;
}

function makeAccRepo(): AccRepoMock {
  return {
    findByIdForUser: jest.fn(),
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findByName: jest.fn(),
    setYield: jest.fn(),
    insertRate: jest.fn(),
    listRates: jest.fn(),
    upsertCdtTerms: jest.fn(),
    getCdtTerms: jest.fn(),
    upsertSnapshot: jest.fn(),
    listSnapshots: jest.fn(),
    latestSnapshotOnOrBefore: jest.fn(),
    deleteSnapshot: jest.fn(),
    netWorthSeries: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as AccRepoMock;
}

function makeCardsRepo(): CardsRepoMock {
  return {
    createCard: jest.fn(),
    updateCard: jest.fn(),
    findCardForUser: jest.fn(),
    listCards: jest.fn().mockResolvedValue([]),
  } as unknown as CardsRepoMock;
}

// ---------- suite ----------

describe('TransactionsService', () => {
  let service: TransactionsService;
  let txRepo: TxRepoMock;
  let catRepo: CatRepoMock;
  let accRepo: AccRepoMock;
  let cardsRepo: CardsRepoMock;

  beforeEach(() => {
    txRepo = makeTxRepo();
    catRepo = makeCatRepo();
    accRepo = makeAccRepo();
    cardsRepo = makeCardsRepo();
    service = new TransactionsService(txRepo, catRepo, accRepo, cardsRepo);
  });

  // ------------------------------------------------------------------ //
  // create — compra diferida a cuotas                                   //
  // ------------------------------------------------------------------ //

  describe('create — diferido en tarjeta', () => {
    it('(a) llama a createTransactionWithPlan con un plan de 3 items cuando installments=3', async () => {
      catRepo.findByIdForUser.mockResolvedValue(makeCategory());
      catRepo.hasLiveChildren.mockResolvedValue(false);
      accRepo.findByIdForUser.mockResolvedValue(makeAccount({ id: 'card-1', kind: 'credit_card' }));
      cardsRepo.findCardForUser.mockResolvedValue(makeCard());
      txRepo.createTransactionWithPlan.mockResolvedValue(makeTxRow());

      await service.create('user-1', {
        categoryId: 'cat-1',
        accountId: 'card-1',
        amount: 1_200_000,
        occurredOn: '2026-06-01',
        installments: 3,
      });

      // Debe haber llamado a createTransactionWithPlan, no a create simple
      expect(txRepo.createTransactionWithPlan).toHaveBeenCalledTimes(1);
      expect(txRepo.create).not.toHaveBeenCalled();

      // El plan pasado debe tener exactamente 3 items en el cronograma
      const callArgs = txRepo.createTransactionWithPlan.mock.calls[0];
      const plan = callArgs[2]; // tercer argumento: el plan con el cronograma
      expect(plan.items).toHaveLength(3);
      expect(plan.items[0]).toMatchObject({ number: 1 });
      expect(plan.items[2]).toMatchObject({ number: 3 });
    });

    it('(b) lanza BadRequestException cuando installments viene pero la cuenta NO es tarjeta', async () => {
      catRepo.findByIdForUser.mockResolvedValue(makeCategory());
      catRepo.hasLiveChildren.mockResolvedValue(false);
      // La cuenta es tipo 'asset', no 'credit_card'
      accRepo.findByIdForUser.mockResolvedValue(makeAccount({ id: 'acc-2', kind: 'asset' }));

      await expect(
        service.create('user-1', {
          categoryId: 'cat-1',
          accountId: 'acc-2',
          amount: 500_000,
          occurredOn: '2026-06-01',
          installments: 3,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      // No debe tocar el repositorio de tarjetas ni insertar nada
      expect(cardsRepo.findCardForUser).not.toHaveBeenCalled();
      expect(txRepo.createTransactionWithPlan).not.toHaveBeenCalled();
    });

    it('sin installments llama a create simple (sin cambios en el flujo normal)', async () => {
      catRepo.findByIdForUser.mockResolvedValue(makeCategory());
      catRepo.hasLiveChildren.mockResolvedValue(false);
      accRepo.findByIdForUser.mockResolvedValue(makeAccount());
      txRepo.create.mockResolvedValue(makeTxRow({ accountId: 'acc-1' }));

      await service.create('user-1', {
        categoryId: 'cat-1',
        accountId: 'acc-1',
        amount: 50_000,
        occurredOn: '2026-06-10',
      });

      expect(txRepo.create).toHaveBeenCalledTimes(1);
      expect(txRepo.createTransactionWithPlan).not.toHaveBeenCalled();
    });
  });
});
