import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/account_yield.dart';
import '../../domain/entities/budget_summary.dart';
import '../../domain/entities/category.dart';
import '../../domain/entities/transaction.dart';
import '../../domain/entities/transfer.dart';
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

/// Cuentas del usuario.
/// @param ref - Referencia del provider.
/// @return La lista de cuentas.
@riverpod
Future<List<Account>> accountsList(Ref ref) {
  return getIt<BudgetRepository>().getAccounts();
}

/// Transferencias de un mes.
/// @param ref - Referencia del provider.
/// @param month - Mes YYYY-MM.
/// @return Las transferencias del periodo.
@riverpod
Future<List<Transfer>> monthTransfers(Ref ref, String month) {
  return getIt<BudgetRepository>().getTransfers(month);
}

/// Proyeccion de crecimiento de una cuenta con rendimiento.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return La proyeccion.
@riverpod
Future<AccountProjection> accountProjection(Ref ref, String accountId) {
  return getIt<BudgetRepository>().getProjection(accountId);
}

/// Snapshots de saldo de una cuenta.
/// @param ref - Referencia del provider.
/// @param accountId - UUID de la cuenta.
/// @return Los snapshots ordenados por fecha.
@riverpod
Future<List<AccountSnapshot>> accountSnapshots(Ref ref, String accountId) {
  return getIt<BudgetRepository>().getSnapshots(accountId);
}

/// Serie de patrimonio total por fecha.
/// @param ref - Referencia del provider.
/// @return Los puntos de patrimonio.
@riverpod
Future<List<NetWorthPoint>> netWorth(Ref ref) {
  return getIt<BudgetRepository>().getNetWorth();
}
