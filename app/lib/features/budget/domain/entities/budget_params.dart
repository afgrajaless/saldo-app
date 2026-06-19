/// Parametros para crear una categoria.
class CreateCategoryParams {
  const CreateCategoryParams({
    required this.name,
    required this.type,
    required this.color,
    this.monthlyBudget,
  });

  final String name;
  final String type;
  final String color;
  final double? monthlyBudget;

  /// Cuerpo JSON para el POST /categories.
  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        'color': color,
        if (monthlyBudget != null) 'monthlyBudget': monthlyBudget,
      };
}

/// Parametros para registrar un movimiento.
class CreateTransactionParams {
  const CreateTransactionParams({
    required this.categoryId,
    required this.amount,
    required this.occurredOn,
    this.description,
  });

  final String categoryId;
  final double amount;
  final String occurredOn;
  final String? description;

  /// Cuerpo JSON para el POST /transactions.
  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'amount': amount,
        'occurredOn': occurredOn,
        if (description != null && description!.isNotEmpty) 'description': description,
      };
}
