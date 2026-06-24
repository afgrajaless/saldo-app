import '../domain/entities/account.dart';
import '../domain/entities/account_yield.dart';
import '../domain/entities/budget_summary.dart';
import '../domain/entities/category.dart';
import '../domain/entities/import_result.dart';
import '../domain/entities/transaction.dart';
import '../domain/entities/transfer.dart';

double _toDouble(Object? value) => (value as num).toDouble();
double? _toDoubleOrNull(Object? value) => value == null ? null : (value as num).toDouble();

/// Construye una Account desde el JSON del backend.
Account accountFromJson(Map<String, dynamic> json) {
  return Account(
    id: json['id'] as String,
    name: json['name'] as String,
    color: json['color'] as String,
    yieldType: (json['yieldType'] as String?) ?? 'none',
    effectiveAnnualRate: _toDoubleOrNull(json['effectiveAnnualRate']),
  );
}

/// Construye un AccountSnapshot desde el JSON del backend.
AccountSnapshot snapshotFromJson(Map<String, dynamic> json) {
  return AccountSnapshot(
    id: json['id'] as String,
    balance: _toDouble(json['balance']),
    asOfDate: json['asOfDate'] as String,
  );
}

/// Construye un AccountProjection desde el JSON del backend.
AccountProjection projectionFromJson(Map<String, dynamic> json) {
  final points = (json['points'] as List<dynamic>)
      .map((e) => ProjectionPoint(
            date: (e as Map<String, dynamic>)['date'] as String,
            value: _toDouble(e['value']),
            accruedInterest: _toDouble(e['accruedInterest']),
          ))
      .toList();
  final cdtJson = json['cdt'] as Map<String, dynamic>?;
  return AccountProjection(
    yieldType: json['yieldType'] as String,
    effectiveAnnualRate: _toDouble(json['effectiveAnnualRate']),
    baseValue: _toDouble(json['baseValue']),
    points: points,
    cdt: cdtJson == null
        ? null
        : CdtStatus(
            principal: _toDouble(cdtJson['principal']),
            maturesOn: cdtJson['maturesOn'] as String,
            daysRemaining: cdtJson['daysRemaining'] as int,
            grossInterest: _toDouble(cdtJson['grossInterest']),
            withholding: _toDouble(cdtJson['withholding']),
            netInterest: _toDouble(cdtJson['netInterest']),
            maturityValue: _toDouble(cdtJson['maturityValue']),
          ),
  );
}

/// Construye un NetWorthPoint desde el JSON del backend.
NetWorthPoint netWorthPointFromJson(Map<String, dynamic> json) {
  return NetWorthPoint(date: json['date'] as String, total: _toDouble(json['total']));
}

/// Construye una Transfer desde el JSON del backend.
Transfer transferFromJson(Map<String, dynamic> json) {
  return Transfer(
    id: json['id'] as String,
    fromAccountId: json['fromAccountId'] as String,
    toAccountId: json['toAccountId'] as String,
    fromAccountName: json['fromAccountName'] as String,
    toAccountName: json['toAccountName'] as String,
    amount: _toDouble(json['amount']),
    occurredOn: json['occurredOn'] as String,
    description: json['description'] as String?,
  );
}

/// Construye un ImportResult desde el JSON del backend.
ImportResult importResultFromJson(Map<String, dynamic> json) {
  final skipped = json['skipped'] as Map<String, dynamic>;
  return ImportResult(
    transactions: json['transactions'] as int,
    transfers: json['transfers'] as int,
    accountsCreated: json['accountsCreated'] as int,
    categoriesCreated: json['categoriesCreated'] as int,
    skippedSummary: skipped['summary'] as int,
    skippedTransferCounterpart: skipped['transferCounterpart'] as int,
    skippedSameAccountTransfer: skipped['sameAccountTransfer'] as int,
    skippedInvalid: skipped['invalid'] as int,
  );
}

/// Construye una Category desde el JSON del backend.
Category categoryFromJson(Map<String, dynamic> json) {
  return Category(
    id: json['id'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    parentId: json['parentId'] as String?,
    color: json['color'] as String,
    monthlyBudget: _toDoubleOrNull(json['monthlyBudget']),
    transactionCount: (json['transactionCount'] as int?) ?? 0,
    hasChildren: (json['hasChildren'] as bool?) ?? false,
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
    accountId: json['accountId'] as String?,
    accountName: json['accountName'] as String?,
  );
}

/// Construye un BudgetCategorySummary desde el JSON del backend.
BudgetCategorySummary categorySummaryFromJson(Map<String, dynamic> json) {
  return BudgetCategorySummary(
    categoryId: json['categoryId'] as String,
    name: json['name'] as String,
    type: json['type'] as String,
    parentId: json['parentId'] as String?,
    color: json['color'] as String,
    spent: _toDouble(json['spent']),
    monthlyBudget: _toDoubleOrNull(json['monthlyBudget']),
    budgetUsage: _toDoubleOrNull(json['budgetUsage']),
    subcategories: (json['subcategories'] as List<dynamic>?)
            ?.map((e) => categorySummaryFromJson(e as Map<String, dynamic>))
            .toList() ??
        const [],
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
