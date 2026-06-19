/// Modalidades de abono a capital (coinciden con el backend).
class PrepaymentMode {
  const PrepaymentMode._();

  /// Conserva la cuota y reduce el plazo.
  static const String reduceTerm = 'REDUCE_TERM';

  /// Conserva el plazo y reduce la cuota.
  static const String reduceInstallment = 'REDUCE_INSTALLMENT';
}

/// Etiquetas en espanol de las modalidades de abono.
const Map<String, String> prepaymentModeLabels = {
  PrepaymentMode.reduceTerm: 'Reducir plazo',
  PrepaymentMode.reduceInstallment: 'Reducir cuota',
};

/// Parametros para registrar un pago.
class RegisterPaymentParams {
  const RegisterPaymentParams({
    required this.type,
    required this.amount,
    required this.paymentDate,
    this.installmentId,
    this.mode,
  });

  /// Tipo de pago: 'regular' o 'abono_capital'.
  final String type;
  final double amount;

  /// Fecha del pago en formato YYYY-MM-DD.
  final String paymentDate;

  /// Cuota asociada (solo pagos regulares).
  final String? installmentId;

  /// Modalidad de abono (solo abono_capital).
  final String? mode;

  /// Convierte los parametros al cuerpo JSON que espera el backend.
  /// @return El mapa JSON para el POST.
  Map<String, dynamic> toJson() => {
        'type': type,
        'amount': amount,
        'paymentDate': paymentDate,
        if (installmentId != null) 'installmentId': installmentId,
        if (mode != null) 'mode': mode,
      };
}
