/// Movimiento (ingreso o egreso) con los datos de su categoria.
class Transaction {
  const Transaction({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.categoryType,
    required this.categoryColor,
    required this.amount,
    required this.occurredOn,
    this.description,
    this.accountId,
    this.accountName,
  });

  final String id;
  final String categoryId;
  final String categoryName;

  /// 'income' o 'expense'.
  final String categoryType;
  final String categoryColor;
  final double amount;
  final String occurredOn;
  final String? description;

  /// Cuenta asociada (null si el movimiento no tiene cuenta).
  final String? accountId;
  final String? accountName;

  /// Indica si el movimiento es un ingreso.
  bool get isIncome => categoryType == 'income';
}
