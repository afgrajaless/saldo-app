import { Injectable } from '@nestjs/common';
import { CategoriesRepository, CategoryRow } from '../categories/categories.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { currentMonth, monthRange } from '../../shared/date/month-range';
import {
  BudgetCategorySummaryDto,
  BudgetSummaryDto,
} from './dto/budget-summary.dto';

/**
 * Servicio de presupuesto. Construye el resumen mensual cruzando las categorias
 * del usuario con la suma de sus movimientos del periodo.
 */
@Injectable()
export class BudgetService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  /**
   * Calcula el resumen del mes: totales de ingreso/egreso, balance y detalle por
   * categoria (incluye el avance frente a la meta en los egresos).
   * @param userId - Dueno de los datos.
   * @param month - Mes en formato YYYY-MM (por defecto, el mes actual).
   * @returns El resumen del presupuesto del mes.
   */
  async getSummary(userId: string, month?: string): Promise<BudgetSummaryDto> {
    const period = month ?? currentMonth();
    const { start, nextStart } = monthRange(period);

    const [categories, sums] = await Promise.all([
      this.categoriesRepository.findAllByUser(userId),
      this.transactionsRepository.sumByCategoryForMonth(userId, start, nextStart),
    ]);

    const spentByCategory = new Map<string, number>();
    for (const sum of sums) {
      spentByCategory.set(sum.categoryId, Number(sum.total));
    }

    const categorySummaries = categories.map((category) =>
      this.buildCategorySummary(category, spentByCategory.get(category.id) ?? 0),
    );

    const totalIncome = this.sumByType(categorySummaries, 'income');
    const totalExpense = this.sumByType(categorySummaries, 'expense');

    return {
      month: period,
      totalIncome,
      totalExpense,
      balance: this.round(totalIncome - totalExpense),
      categories: categorySummaries,
    };
  }

  /**
   * Construye el resumen de una categoria con su gasto y avance de meta.
   * @param category - Categoria.
   * @param spent - Total del mes en la categoria.
   * @returns El resumen de la categoria.
   */
  private buildCategorySummary(
    category: CategoryRow,
    spent: number,
  ): BudgetCategorySummaryDto {
    const monthlyBudget = category.monthlyBudget === null ? null : Number(category.monthlyBudget);
    const hasTarget = category.type === 'expense' && monthlyBudget !== null && monthlyBudget > 0;
    return {
      categoryId: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      monthlyBudget,
      spent: this.round(spent),
      budgetUsage: hasTarget ? this.round((spent / monthlyBudget!) * 100) : null,
    };
  }

  /**
   * Suma el gasto de las categorias de un tipo dado.
   * @param summaries - Resumenes de categoria.
   * @param type - 'income' o 'expense'.
   * @returns La suma redondeada.
   */
  private sumByType(summaries: BudgetCategorySummaryDto[], type: string): number {
    const total = summaries
      .filter((summary) => summary.type === type)
      .reduce((sum, summary) => sum + summary.spent, 0);
    return this.round(total);
  }

  /**
   * Redondea un valor monetario a 2 decimales.
   * @param value - Valor a redondear.
   * @returns El valor redondeado.
   */
  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
