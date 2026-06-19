import '../domain/entities/budget_summary.dart';
import '../domain/entities/category.dart';
import '../domain/entities/transaction.dart';

double _toDouble(Object? value) => (value as num).toDouble();
double? _toDoubleOrNull(Object? value) => value == null ? null : (value as num).toDouble();

/// Construye una Category desde el JSON del backend.
Category categoryFromJson(Map<String, dynamic> json) {
  return Category(
    id: json['id'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    color: json['color'] as String,
    monthlyBudget: _toDoubleOrNull(json['monthlyBudget']),
  );
}

/// Construye una Transaction desde el JSON del backend.
Transaction transactionFromJson(Map<String, dynamic> json) {
  return Transaction(
    id: json['id'] as String,
    categoryId: json['categoryId'] as String,
    categoryName: json['categoryName'] as String,
    categoryType: json['categoryType'] as String,
    categoryColor: json['categoryColor'] as String,
    amount: _toDouble(json['amount']),
    occurredOn: json['occurredOn'] as String,
    description: json['description'] as String?,
  );
}

/// Construye un BudgetCategorySummary desde el JSON del backend.
BudgetCategorySummary categorySummaryFromJson(Map<String, dynamic> json) {
  return BudgetCategorySummary(
    categoryId: json['categoryId'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    color: json['color'] as String,
    spent: _toDouble(json['spent']),
    monthlyBudget: _toDoubleOrNull(json['monthlyBudget']),
    budgetUsage: _toDoubleOrNull(json['budgetUsage']),
  );
}

/// Construye un BudgetSummary desde el JSON del backend.
BudgetSummary budgetSummaryFromJson(Map<String, dynamic> json) {
  final categories = (json['categories'] as List<dynamic>)
      .map((e) => categorySummaryFromJson(e as Map<String, dynamic>))
      .toList();
  return BudgetSummary(
    month: json['month'] as String,
    totalIncome: _toDouble(json['totalIncome']),
    totalExpense: _toDouble(json['totalExpense']),
    balance: _toDouble(json['balance']),
    categories: categories,
  );
}
