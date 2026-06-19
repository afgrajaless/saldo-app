import '../entities/budget_params.dart';
import '../entities/budget_summary.dart';
import '../entities/category.dart';
import '../entities/transaction.dart';

/// Contrato del repositorio de presupuesto (categorias, movimientos, resumen).
abstract class BudgetRepository {
  /// Lista las categorias del usuario.
  Future<List<Category>> getCategories();

  /// Crea una categoria.
  /// @param params - Datos de la categoria.
  /// @return La categoria creada.
  Future<Category> createCategory(CreateCategoryParams params);

  /// Elimina (soft delete) una categoria.
  /// @param id - UUID de la categoria.
  Future<void> deleteCategory(String id);

  /// Lista los movimientos de un mes.
  /// @param month - Mes YYYY-MM.
  Future<List<Transaction>> getTransactions(String month);

  /// Registra un movimiento.
  /// @param params - Datos del movimiento.
  /// @return El movimiento creado.
  Future<Transaction> createTransaction(CreateTransactionParams params);

  /// Elimina un movimiento.
  /// @param id - UUID del movimiento.
  Future<void> deleteTransaction(String id);

  /// Obtiene el resumen del presupuesto de un mes.
  /// @param month - Mes YYYY-MM.
  Future<BudgetSummary> getSummary(String month);
}
