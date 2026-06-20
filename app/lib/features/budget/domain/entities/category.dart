/// Categoria de presupuesto (ingreso o egreso).
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.type,
    required this.color,
    this.monthlyBudget,
    this.transactionCount = 0,
  });

  final String id;
  final String name;

  /// 'income' o 'expense'.
  final String type;

  /// Color hex (#RRGGBB).
  final String color;

  /// Meta mensual de gasto (solo egresos); null si no tiene.
  final double? monthlyBudget;

  /// Cantidad de movimientos asociados a la categoria.
  final int transactionCount;

  /// Indica si es una categoria de ingreso.
  bool get isIncome => type == 'income';
}
