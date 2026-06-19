import '../entities/create_debt_params.dart';
import '../entities/debt.dart';
import '../entities/debt_detail.dart';

/// Contrato del repositorio de obligaciones (capa de dominio).
abstract class DebtsRepository {
  /// Lista las deudas del usuario.
  /// @return Las obligaciones vivas.
  Future<List<Debt>> getDebts();

  /// Obtiene el detalle de una deuda con su cronograma.
  /// @param id - UUID de la deuda.
  /// @return El detalle de la deuda.
  Future<DebtDetail> getDebt(String id);

  /// Crea una nueva obligacion y su cronograma.
  /// @param params - Datos de la deuda.
  /// @return La deuda creada.
  Future<Debt> createDebt(CreateDebtParams params);

  /// Elimina (soft delete) una deuda.
  /// @param id - UUID de la deuda.
  Future<void> deleteDebt(String id);
}
