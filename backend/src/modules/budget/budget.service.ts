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

    const childrenByParent = this.groupChildrenByParent(categories);
    const topLevel = categories.filter((category) => category.parentId === null);
    const categorySummaries = topLevel.map((category) =>
      this.buildTopLevelSummary(category, childrenByParent, spentByCategory),
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
   * Agrupa las subcategorias vivas por el id de su categoria padre.
   * @param categories - Todas las categorias del usuario.
   * @returns Mapa parentId -> subcategorias.
   */
  private groupChildrenByParent(categories: CategoryRow[]): Map<string, CategoryRow[]> {
    const map = new Map<string, CategoryRow[]>();
    for (const category of categories) {
      if (category.parentId === null) continue;
      const siblings = map.get(category.parentId) ?? [];
      siblings.push(category);
      map.set(category.parentId, siblings);
    }
    return map;
  }

  /**
   * Construye el resumen de una categoria de primer nivel. Si tiene subcategorias,
   * su gasto es la suma de estas y se incluyen anidadas.
   * @param category - Categoria de primer nivel.
   * @param childrenByParent - Mapa de subcategorias por padre.
   * @param spentByCategory - Gasto del mes por categoria (hojas).
   * @returns El resumen de la categoria con su rollup.
   */
  private buildTopLevelSummary(
    category: CategoryRow,
    childrenByParent: Map<string, CategoryRow[]>,
    spentByCategory: Map<string, number>,
  ): BudgetCategorySummaryDto {
    const children = childrenByParent.get(category.id) ?? [];
    if (children.length === 0) {
      return this.buildCategorySummary(category, spentByCategory.get(category.id) ?? 0);
    }
    const subcategories = children.map((child) =>
      this.buildCategorySummary(child, spentByCategory.get(child.id) ?? 0),
    );
    const spent = subcategories.reduce((sum, sub) => sum + sub.spent, 0);
    return { ...this.buildCategorySummary(category, spent), subcategories };
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
      parentId: category.parentId,
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
