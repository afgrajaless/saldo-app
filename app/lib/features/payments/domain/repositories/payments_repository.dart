import '../entities/payment.dart';
import '../entities/payment_result.dart';
import '../entities/register_payment_params.dart';

/// Contrato del repositorio de pagos (capa de dominio).
abstract class PaymentsRepository {
  /// Registra un pago (regular o abono a capital) sobre una deuda.
  /// @param debtId - UUID de la deuda.
  /// @param params - Datos del pago.
  /// @return El pago y, si es abono, el resumen del recalculo.
  Future<PaymentResult> registerPayment(String debtId, RegisterPaymentParams params);

  /// Lista los pagos de una deuda.
  /// @param debtId - UUID de la deuda.
  /// @return Los pagos registrados.
  Future<List<Payment>> getPayments(String debtId);
}
