/// Item (cuota) individual de un plan diferido de tarjeta de credito.
class CardInstallmentItem {
  const CardInstallmentItem({
    required this.number,
    required this.dueOn,
    required this.principal,
    required this.interest,
    required this.balance,
  });

  /// Numero secuencial de la cuota.
  final int number;

  /// Fecha de vencimiento de la cuota (YYYY-MM-DD).
  final String dueOn;

  /// Capital amortizado en la cuota.
  final double principal;

  /// Interes causado en la cuota.
  final double interest;

  /// Saldo pendiente tras la cuota.
  final double balance;
}

/// Plan diferido de tarjeta de credito con su cronograma de cuotas.
class CardInstallmentPlan {
  const CardInstallmentPlan({
    required this.id,
    required this.accountId,
    required this.principal,
    required this.numberOfInstallments,
    required this.monthlyRate,
    required this.startDate,
    required this.status,
    required this.items,
    this.description,
  });

  /// UUID del plan.
  final String id;

  /// UUID de la tarjeta.
  final String accountId;

  /// Descripcion de la compra diferida.
  final String? description;

  /// Capital total diferido en pesos.
  final double principal;

  /// Numero total de cuotas.
  final int numberOfInstallments;

  /// Tasa mensual vencida del diferido (fraccion decimal).
  final double monthlyRate;

  /// Fecha de inicio del plan (YYYY-MM-DD).
  final String startDate;

  /// Estado del plan: 'active', 'completed', etc.
  final String status;

  /// Cronograma de cuotas.
  final List<CardInstallmentItem> items;
}
