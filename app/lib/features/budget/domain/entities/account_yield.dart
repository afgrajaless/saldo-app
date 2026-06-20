/// Saldo real de una cuenta en una fecha (snapshot).
class AccountSnapshot {
  const AccountSnapshot({
    required this.id,
    required this.balance,
    required this.asOfDate,
  });

  final String id;
  final double balance;
  final String asOfDate;
}

/// Un punto de la curva de proyeccion de crecimiento.
class ProjectionPoint {
  const ProjectionPoint({
    required this.date,
    required this.value,
    required this.accruedInterest,
  });

  final String date;
  final double value;
  final double accruedInterest;
}

/// Estado de un CDT (vencimiento, retencion y valor a recibir).
class CdtStatus {
  const CdtStatus({
    required this.principal,
    required this.maturesOn,
    required this.daysRemaining,
    required this.grossInterest,
    required this.withholding,
    required this.netInterest,
    required this.maturityValue,
  });

  final double principal;
  final String maturesOn;
  final int daysRemaining;
  final double grossInterest;
  final double withholding;
  final double netInterest;
  final double maturityValue;
}

/// Proyeccion de crecimiento de una cuenta con rendimiento.
class AccountProjection {
  const AccountProjection({
    required this.yieldType,
    required this.effectiveAnnualRate,
    required this.baseValue,
    required this.points,
    this.cdt,
  });

  final String yieldType;
  final double effectiveAnnualRate;
  final double baseValue;
  final List<ProjectionPoint> points;

  /// Estado del CDT; null si la cuenta es remunerada.
  final CdtStatus? cdt;
}

/// Un punto de la serie de patrimonio (suma de saldos por fecha).
class NetWorthPoint {
  const NetWorthPoint({required this.date, required this.total});

  final String date;
  final double total;
}
