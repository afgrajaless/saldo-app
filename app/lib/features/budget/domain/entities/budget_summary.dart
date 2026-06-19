/// Resumen de una categoria dentro del mes.
class BudgetCategorySummary {
  const BudgetCategorySummary({
    required this.categoryId,
    required this.name,
    required this.type,
    required this.color,
    required this.spent,
    this.monthlyBudget,
    this.budgetUsage,
  });

  final String categoryId;
  final String name;
  final String type;
  final String color;
  final double spent;
  final double? monthlyBudget;

  /// Porcentaje de la meta consumido (solo egresos con meta).
  final double? budgetUsage;

  /// Indica si es una categoria de ingreso.
  bool get isIncome => type == 'income';
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
