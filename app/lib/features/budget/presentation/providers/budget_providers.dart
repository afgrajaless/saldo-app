import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/budget_summary.dart';
import '../../domain/entities/category.dart';
import '../../domain/entities/transaction.dart';
import '../../domain/repositories/budget_repository.dart';

part 'budget_providers.g.dart';

/// Categorias del usuario.
/// @param ref - Referencia del provider.
/// @return La lista de categorias.
@riverpod
Future<List<Category>> categoriesList(Ref ref) {
  return getIt<BudgetRepository>().getCategories();
}

/// Resumen del presupuesto de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return El resumen mensual.
@riverpod
Future<BudgetSummary> budgetSummary(Ref ref, String month) {
  return getIt<BudgetRepository>().getSummary(month);
}

/// Movimientos de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Los movimientos del periodo.
@riverpod
Future<List<Transaction>> monthTransactions(Ref ref, String month) {
  return getIt<BudgetRepository>().getTransactions(month);
}
