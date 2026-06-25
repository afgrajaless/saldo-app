import '../../domain/entities/debt.dart';
import '../../domain/entities/debt_detail.dart';
import '../../domain/entities/installment.dart';

/// Convierte un JSON num a double de forma segura.
double _toDouble(Object? value) => (value as num).toDouble();

/// Construye un Debt a partir del JSON del backend.
/// @param json - Objeto JSON de la deuda.
/// @return La entidad Debt.
Debt debtFromJson(Map<String, dynamic> json) {
  return Debt(
    id: json['id'] as String,
    creditor: json['creditor'] as String,
    debtType: json['debtType'] as String,
    principalAmount: _toDouble(json['principalAmount']),
    nominalRate: _toDouble(json['nominalRate']),
    rateType: json['rateType'] as String,
    effectiveAnnualRate: _toDouble(json['effectiveAnnualRate']),
    amortizationSystem: json['amortizationSystem'] as String,
    termMonths: json['termMonths'] as int,
    startDate: json['startDate'] as String,
    insuranceMode: json['insuranceMode'] as String,
    insuranceValue:
        json['insuranceValue'] == null ? null : (json['insuranceValue'] as num).toDouble(),
    interestMode: json['interestMode'] as String,
    status: json['status'] as String,
    currentBalance: _toDouble(json['currentBalance']),
    monthlyPayment: _toDouble(json['monthlyPayment']),
    monthlyInterestCost: _toDouble(json['monthlyInterestCost']),
    paidInstallments: json['paidInstallments'] as int,
    remainingInstallments: json['remainingInstallments'] as int,
    source: (json['source'] as String?) ?? 'manual',
  );
}

/// Construye una Installment a partir del JSON del backend.
/// @param json - Objeto JSON de la cuota.
/// @return La entidad Installment.
Installment installmentFromJson(Map<String, dynamic> json) {
  return Installment(
    id: json['id'] as String,
    number: json['number'] as int,
    dueDate: json['dueDate'] as String,
    principalPortion: _toDouble(json['principalPortion']),
    interestPortion: _toDouble(json['interestPortion']),
    insurancePortion: _toDouble(json['insurancePortion']),
    totalAmount: _toDouble(json['totalAmount']),
    remainingBalance: _toDouble(json['remainingBalance']),
    status: json['status'] as String,
  );
}

/// Construye un DebtDetail a partir del JSON del detalle.
/// @param json - Objeto JSON con la deuda, cuotas y totales.
/// @return La entidad DebtDetail.
DebtDetail debtDetailFromJson(Map<String, dynamic> json) {
  final installments = (json['installments'] as List<dynamic>)
      .map((e) => installmentFromJson(e as Map<String, dynamic>))
      .toList();
  return DebtDetail(
    debt: debtFromJson(json),
    installments: installments,
    totalInterest: _toDouble(json['totalInterest']),
    totalInsurance: _toDouble(json['totalInsurance']),
    totalPaid: _toDouble(json['totalPaid']),
  );
}
