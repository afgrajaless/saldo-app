import '../../domain/entities/payment.dart';
import '../../domain/entities/payment_result.dart';
import '../../domain/entities/prepayment_summary.dart';

double _toDouble(Object? value) => (value as num).toDouble();

/// Construye un Payment a partir del JSON del backend.
/// @param json - Objeto JSON del pago.
/// @return La entidad Payment.
Payment paymentFromJson(Map<String, dynamic> json) {
  return Payment(
    id: json['id'] as String,
    debtId: json['debtId'] as String,
    installmentId: json['installmentId'] as String?,
    amount: _toDouble(json['amount']),
    paymentDate: json['paymentDate'] as String,
    type: json['type'] as String,
  );
}

/// Construye un PrepaymentSummary a partir del JSON del backend.
/// @param json - Objeto JSON del resumen de abono.
/// @return La entidad PrepaymentSummary.
PrepaymentSummary prepaymentSummaryFromJson(Map<String, dynamic> json) {
  return PrepaymentSummary(
    appliedExtraPayment: _toDouble(json['appliedExtraPayment']),
    newBalance: _toDouble(json['newBalance']),
    isPaidOff: json['isPaidOff'] as bool,
    interestSaved: _toDouble(json['interestSaved']),
    remainingInstallments: json['remainingInstallments'] as int,
  );
}

/// Construye un PaymentResult a partir del JSON del backend.
/// @param json - Objeto JSON con payment y prepayment (opcional).
/// @return La entidad PaymentResult.
PaymentResult paymentResultFromJson(Map<String, dynamic> json) {
  final prepayment = json['prepayment'] as Map<String, dynamic>?;
  return PaymentResult(
    payment: paymentFromJson(json['payment'] as Map<String, dynamic>),
    prepayment: prepayment == null ? null : prepaymentSummaryFromJson(prepayment),
  );
}
