/// Parametros para crear una categoria.
class CreateCategoryParams {
  const CreateCategoryParams({
    required this.name,
    required this.type,
    required this.color,
    this.monthlyBudget,
    this.parentId,
  });

  final String name;
  final String type;
  final String color;
  final double? monthlyBudget;

  /// UUID de la categoria padre; null para una categoria de primer nivel.
  final String? parentId;

  /// Cuerpo JSON para el POST /categories.
  Map<String, dynamic> toJson() => {
        'name': name,
        'type': type,
        'color': color,
        if (monthlyBudget != null) 'monthlyBudget': monthlyBudget,
        if (parentId != null) 'parentId': parentId,
      };
}

/// Parametros para editar una categoria (el tipo no se cambia).
class UpdateCategoryParams {
  const UpdateCategoryParams({
    this.name,
    this.color,
    this.monthlyBudget,
    this.clearMonthlyBudget = false,
    this.parentId,
    this.changeParent = false,
  });

  final String? name;
  final String? color;
  final double? monthlyBudget;

  /// Si es true, envia la meta en null para quitarla.
  final bool clearMonthlyBudget;

  /// Nuevo padre; null junto con [changeParent] = volver a primer nivel.
  final String? parentId;

  /// Si es true, se envia parentId (incluso null) para mover la categoria.
  final bool changeParent;

  /// Cuerpo JSON para el PATCH /categories/:id (solo envia lo que cambia).
  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (color != null) 'color': color,
        if (monthlyBudget != null) 'monthlyBudget': monthlyBudget,
        if (clearMonthlyBudget && monthlyBudget == null) 'monthlyBudget': null,
        if (changeParent) 'parentId': parentId,
      };
}

/// Parametros para registrar un movimiento.
class CreateTransactionParams {
  const CreateTransactionParams({
    required this.categoryId,
    required this.amount,
    required this.occurredOn,
    this.description,
    this.accountId,
  });

  final String categoryId;
  final double amount;
  final String occurredOn;
  final String? description;
  final String? accountId;

  /// Cuerpo JSON para el POST /transactions.
  Map<String, dynamic> toJson() => {
        'categoryId': categoryId,
        'amount': amount,
        'occurredOn': occurredOn,
        if (description != null && description!.isNotEmpty) 'description': description,
        if (accountId != null) 'accountId': accountId,
      };
}

/// Parametros para crear una cuenta.
class CreateAccountParams {
  const CreateAccountParams({required this.name, this.color});

  final String name;
  final String? color;

  /// Cuerpo JSON para el POST /accounts.
  Map<String, dynamic> toJson() => {
        'name': name,
        if (color != null) 'color': color,
      };
}

/// Parametros para editar una cuenta.
class UpdateAccountParams {
  const UpdateAccountParams({this.name, this.color});

  final String? name;
  final String? color;

  /// Cuerpo JSON para el PATCH /accounts/:id (solo envia lo que cambia).
  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (color != null) 'color': color,
      };
}

/// Parametros para configurar el rendimiento de una cuenta.
class SetYieldParams {
  const SetYieldParams({
    required this.yieldType,
    this.effectiveAnnualRate,
    this.principal,
    this.openedOn,
    this.termDays,
    this.withholdingRate,
    this.interestPayment,
  });

  /// 'none', 'savings' o 'cdt'.
  final String yieldType;
  final double? effectiveAnnualRate;

  // Solo CDT:
  final double? principal;
  final String? openedOn;
  final int? termDays;
  final double? withholdingRate;
  final String? interestPayment;

  /// Cuerpo JSON para el PUT /accounts/:id/yield.
  Map<String, dynamic> toJson() => {
        'yieldType': yieldType,
        if (effectiveAnnualRate != null) 'effectiveAnnualRate': effectiveAnnualRate,
        if (principal != null) 'principal': principal,
        if (openedOn != null) 'openedOn': openedOn,
        if (termDays != null) 'termDays': termDays,
        if (withholdingRate != null) 'withholdingRate': withholdingRate,
        if (interestPayment != null) 'interestPayment': interestPayment,
      };
}

/// Parametros para registrar el saldo real de una cuenta en una fecha.
class CreateSnapshotParams {
  const CreateSnapshotParams({required this.balance, required this.asOfDate});

  final double balance;
  final String asOfDate;

  /// Cuerpo JSON para el POST /accounts/:id/snapshots.
  Map<String, dynamic> toJson() => {'balance': balance, 'asOfDate': asOfDate};
}

/// Parametros para crear una tarjeta de credito.
class CreateCardParams {
  const CreateCardParams({
    required this.name,
    required this.creditLimit,
    required this.statementDay,
    required this.paymentDay,
    required this.rotativoRateEa,
    this.color,
    this.minPaymentPct,
    this.managementFee,
    this.managementFeePeriod,
  });

  final String name;
  final String? color;
  final double creditLimit;
  final int statementDay;
  final int paymentDay;

  /// Tasa de interes corriente E.A. del diferido rotativo (fraccion decimal).
  final double rotativoRateEa;

  /// Pago minimo como fraccion del saldo (ej. 0.05 = 5%). Por defecto 0.05.
  final double? minPaymentPct;

  /// Cuota de manejo en pesos; null si no cobra.
  final double? managementFee;

  /// Periodicidad de la cuota de manejo: 'none', 'monthly' o 'annual'.
  final String? managementFeePeriod;

  /// Cuerpo JSON para el POST /cards.
  Map<String, dynamic> toJson() => {
        'name': name,
        if (color != null) 'color': color,
        'creditLimit': creditLimit,
        'statementDay': statementDay,
        'paymentDay': paymentDay,
        'rotativoRateEa': rotativoRateEa,
        if (minPaymentPct != null) 'minPaymentPct': minPaymentPct,
        if (managementFee != null) 'managementFee': managementFee,
        if (managementFeePeriod != null) 'managementFeePeriod': managementFeePeriod,
      };
}

/// Parametros para editar una tarjeta de credito (todos opcionales).
class UpdateCardParams {
  const UpdateCardParams({
    this.name,
    this.color,
    this.creditLimit,
    this.statementDay,
    this.paymentDay,
    this.rotativoRateEa,
    this.minPaymentPct,
    this.managementFee,
    this.managementFeePeriod,
  });

  final String? name;
  final String? color;
  final double? creditLimit;
  final int? statementDay;
  final int? paymentDay;
  final double? rotativoRateEa;
  final double? minPaymentPct;
  final double? managementFee;
  final String? managementFeePeriod;

  /// Cuerpo JSON para el PATCH /cards/:id (solo envia los campos con valor).
  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (color != null) 'color': color,
        if (creditLimit != null) 'creditLimit': creditLimit,
        if (statementDay != null) 'statementDay': statementDay,
        if (paymentDay != null) 'paymentDay': paymentDay,
        if (rotativoRateEa != null) 'rotativoRateEa': rotativoRateEa,
        if (minPaymentPct != null) 'minPaymentPct': minPaymentPct,
        if (managementFee != null) 'managementFee': managementFee,
        if (managementFeePeriod != null) 'managementFeePeriod': managementFeePeriod,
      };
}

/// Parametros para reconciliar el extracto de tarjeta con los valores reales del banco.
class ReconcileStatementParams {
  const ReconcileStatementParams({
    required this.cutoffDate,
    required this.reconciledBalance,
    required this.reconciledMinPayment,
    this.reconciledTotalPayment,
  });

  /// Fecha de corte del extracto (YYYY-MM-DD).
  final String cutoffDate;

  /// Saldo real del extracto en pesos.
  final double reconciledBalance;

  /// Pago minimo real del extracto en pesos.
  final double reconciledMinPayment;

  /// Pago total realizado; null si aun no se ha pagado.
  final double? reconciledTotalPayment;

  /// Cuerpo JSON para el POST /cards/:id/statement/reconcile.
  Map<String, dynamic> toJson() => {
        'cutoffDate': cutoffDate,
        'reconciledBalance': reconciledBalance,
        'reconciledMinPayment': reconciledMinPayment,
        if (reconciledTotalPayment != null) 'reconciledTotalPayment': reconciledTotalPayment,
      };
}

/// Parametros para registrar una transferencia entre cuentas.
class CreateTransferParams {
  const CreateTransferParams({
    required this.fromAccountId,
    required this.toAccountId,
    required this.amount,
    required this.occurredOn,
    this.description,
  });

  final String fromAccountId;
  final String toAccountId;
  final double amount;
  final String occurredOn;
  final String? description;

  /// Cuerpo JSON para el POST /transfers.
  Map<String, dynamic> toJson() => {
        'fromAccountId': fromAccountId,
        'toAccountId': toAccountId,
        'amount': amount,
        'occurredOn': occurredOn,
        if (description != null && description!.isNotEmpty) 'description': description,
      };
}
