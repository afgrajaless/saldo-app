/// Obligacion (deuda) del usuario.
class Debt {
  const Debt({
    required this.id,
    required this.creditor,
    required this.debtType,
    required this.principalAmount,
    required this.nominalRate,
    required this.rateType,
    required this.effectiveAnnualRate,
    required this.amortizationSystem,
    required this.termMonths,
    required this.startDate,
    required this.insuranceMode,
    required this.insuranceValue,
    required this.interestMode,
    required this.status,
    required this.currentBalance,
    required this.monthlyPayment,
    required this.monthlyInterestCost,
    required this.paidInstallments,
    required this.remainingInstallments,
    this.source = 'manual',
  });

  final String id;
  final String creditor;
  final String debtType;
  final double principalAmount;
  final double nominalRate;
  final String rateType;
  final double effectiveAnnualRate;
  final String amortizationSystem;
  final int termMonths;
  final String startDate;

  /// Modalidad del seguro: 'none', 'rate' o 'fixed'.
  final String insuranceMode;

  /// Valor del seguro (tasa o monto fijo); null si no tiene.
  final double? insuranceValue;

  /// Modo de causacion del interes: 'monthly' o 'daily'.
  final String interestMode;
  final String status;

  /// Saldo de capital pendiente hoy (suma del capital de las cuotas no pagadas).
  final double currentBalance;

  /// Valor de la proxima cuota pendiente; 0 si la deuda esta pagada.
  final double monthlyPayment;

  /// Interes que genera la proxima cuota (lo que cuesta la deuda este mes).
  final double monthlyInterestCost;

  /// Cantidad de cuotas ya pagadas.
  final int paidInstallments;

  /// Cantidad de cuotas pendientes.
  final int remainingInstallments;

  /// Origen de la deuda: 'manual' (creada por el usuario) u 'open_finance' (sincronizada).
  final String source;

  /// Indica si la deuda esta en mora.
  bool get isInArrears => status == 'en_mora';

  /// Indica si la deuda fue sincronizada via Open Finance (solo lectura).
  bool get isLinked => source == 'open_finance';
}
