/// Categoria de presupuesto (ingreso o egreso).
class Category {
  const Category({
    required this.id,
    required this.name,
    required this.type,
    required this.color,
    this.parentId,
    this.monthlyBudget,
    this.transactionCount = 0,
    this.hasChildren = false,
  });

  final String id;
  final String name;

  /// 'income' o 'expense'.
  final String type;

  /// UUID de la categoria padre; null si es de primer nivel.
  final String? parentId;

  /// Color hex (#RRGGBB).
  final String color;

  /// Meta mensual de gasto (solo egresos); null si no tiene.
  final double? monthlyBudget;

  /// Cantidad de movimientos asociados a la categoria.
  final int transactionCount;

  /// Indica si la categoria tiene subcategorias vivas (es un padre).
  final bool hasChildren;

  /// Indica si es una categoria de ingreso.
  bool get isIncome => type == 'income';

  /// Indica si es una subcategoria (cuelga de un padre).
  bool get isSubcategory => parentId != null;
}
