import '../entities/usury_evaluation.dart';

/// Contrato del repositorio de usura (capa de dominio).
abstract class UsuryRepository {
  /// Evalua la tasa de una deuda contra el tope de usura vigente.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion, o `null` si no hay tope registrado para evaluar.
  Future<UsuryEvaluation?> evaluateDebt(String debtId);
}
