import '../entities/usury_evaluation.dart';

/// Contrato del repositorio de usura (capa de dominio).
abstract class UsuryRepository {
  /// Evalua la tasa de una deuda contra el tope de usura vigente.
  /// @param debtId - UUID de la deuda.
  /// @return La evaluacion, o `null` si no hay tope registrado para evaluar.
  Future<UsuryEvaluation?> evaluateDebt(String debtId);

  /// Evalua una tasa hipotetica contra el tope de usura, antes de crear la deuda.
  /// @param rate - Tasa como fraccion decimal.
  /// @param rateType - Representacion: 'ea' | 'mv' | 'nominal_anual'.
  /// @param debtType - Tipo de obligacion.
  /// @return La evaluacion, o `null` si no hay tope registrado para evaluar.
  Future<UsuryEvaluation?> evaluateRate({
    required double rate,
    required String rateType,
    required String debtType,
  });
}
