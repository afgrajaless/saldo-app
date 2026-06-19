import 'payment.dart';
import 'prepayment_summary.dart';

/// Resultado de registrar un pago: el pago y, si es abono, el resumen del recalculo.
class PaymentResult {
  const PaymentResult({required this.payment, this.prepayment});

  final Payment payment;
  final PrepaymentSummary? prepayment;
}
