/// Resumen de una categoria dentro del mes.
class BudgetCategorySummary {
  const BudgetCategorySummary({
    required this.categoryId,
    required this.name,
    required this.type,
    required this.color,
    required this.spent,
    this.parentId,
    this.monthlyBudget,
    this.budgetUsage,
    this.subcategories = const [],
  });

  final String categoryId;
  final String name;
  final String type;

  /// UUID de la categoria padre; null si es de primer nivel.
  final String? parentId;
  final String color;
  final double spent;
  final double? monthlyBudget;

  /// Porcentaje de la meta consumido (solo egresos con meta).
  final double? budgetUsage;

  /// Subcategorias con su propio gasto (solo en categorias padre).
  final List<BudgetCategorySummary> subcategories;

  /// Indica si es una categoria de ingreso.
  bool get isIncome => type == 'income';

  /// Indica si la categoria agrupa subcategorias.
  bool get hasChildren => subcategories.isNotEmpty;
}

/// Resumen mensual del presupuesto.
class BudgetSummary {
  const BudgetSummary({
    required this.month,
    required this.totalIncome,
    required this.totalExpense,
    required this.balance,
    required this.categories,
  });

  final String month;
  final double totalIncome;
  final double totalExpense;
  final double balance;
  final List<BudgetCategorySummary> categories;
}
