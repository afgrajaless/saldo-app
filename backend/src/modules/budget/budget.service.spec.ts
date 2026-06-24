import { CategoriesRepository, CategoryRow } from '../categories/categories.repository';
import {
  CategorySum,
  TransactionsRepository,
} from '../transactions/transactions.repository';
import { BudgetService } from './budget.service';

function makeCategory(overrides: Partial<CategoryRow>): CategoryRow {
  return {
    id: 'cat',
    userId: 'user',
    name: 'Cat',
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

describe('BudgetService', () => {
  let service: BudgetService;
  let categoriesRepo: jest.Mocked<Pick<CategoriesRepository, 'findAllByUser'>>;
  let transactionsRepo: jest.Mocked<Pick<TransactionsRepository, 'sumByCategoryForMonth'>>;

  beforeEach(() => {
    categoriesRepo = { findAllByUser: jest.fn() };
    transactionsRepo = { sumByCategoryForMonth: jest.fn() };
    service = new BudgetService(
      categoriesRepo as unknown as CategoriesRepository,
      transactionsRepo as unknown as TransactionsRepository,
    );
  });

  it('calcula totales, balance y avance de meta', async () => {
    categoriesRepo.findAllByUser.mockResolvedValue([
      makeCategory({ id: 'salary', type: 'income', name: 'Salario' }),
      makeCategory({ id: 'rent', type: 'expense', name: 'Arriendo', monthlyBudget: '1500000.00' }),
      makeCategory({ id: 'food', type: 'expense', name: 'Mercado', monthlyBudget: null }),
    ]);
    const sums: CategorySum[] = [
      { categoryId: 'salary', total: '5000000.00' },
      { categoryId: 'rent', total: '1200000.00' },
      { categoryId: 'food', total: '800000.00' },
    ];
    transactionsRepo.sumByCategoryForMonth.mockResolvedValue(sums);

    const summary = await service.getSummary('user', '2026-06');

    expect(summary.month).toBe('2026-06');
    expect(summary.totalIncome).toBe(5000000);
    expect(summary.totalExpense).toBe(2000000);
    expect(summary.balance).toBe(3000000);

    const rent = summary.categories.find((c) => c.categoryId === 'rent')!;
    expect(rent.spent).toBe(1200000);
    expect(rent.budgetUsage).toBe(80); // 1.2M / 1.5M

    const food = summary.categories.find((c) => c.categoryId === 'food')!;
    expect(food.budgetUsage).toBeNull(); // sin meta
  });

  it('agrupa subcategorias: el gasto del padre es la suma de los hijos', async () => {
    categoriesRepo.findAllByUser.mockResolvedValue([
      makeCategory({ id: 'food', name: 'Alimentacion', monthlyBudget: '1000000.00' }),
      makeCategory({ id: 'market', name: 'Mercado', parentId: 'food' }),
      makeCategory({ id: 'resto', name: 'Restaurantes', parentId: 'food' }),
    ]);
    transactionsRepo.sumByCategoryForMonth.mockResolvedValue([
      { categoryId: 'market', total: '600000.00' },
      { categoryId: 'resto', total: '300000.00' },
    ]);

    const summary = await service.getSummary('user', '2026-06');

    // Solo el padre aparece en el primer nivel.
    expect(summary.categories).toHaveLength(1);
    const food = summary.categories[0];
    expect(food.categoryId).toBe('food');
    expect(food.spent).toBe(900000); // 600k + 300k
    expect(food.budgetUsage).toBe(90); // 900k / 1M
    expect(food.subcategories?.map((s) => s.categoryId)).toEqual(['market', 'resto']);
    expect(food.subcategories?.find((s) => s.categoryId === 'market')?.spent).toBe(600000);
    // El total del mes no cuenta dos veces (padre + hijos).
    expect(summary.totalExpense).toBe(900000);
  });

  it('devuelve ceros cuando no hay movimientos', async () => {
    categoriesRepo.findAllByUser.mockResolvedValue([
      makeCategory({ id: 'rent', type: 'expense', monthlyBudget: '1000000.00' }),
    ]);
    transactionsRepo.sumByCategoryForMonth.mockResolvedValue([]);

    const summary = await service.getSummary('user', '2026-06');

    expect(summary.totalExpense).toBe(0);
    expect(summary.balance).toBe(0);
    expect(summary.categories[0].spent).toBe(0);
    expect(summary.categories[0].budgetUsage).toBe(0);
  });
});
