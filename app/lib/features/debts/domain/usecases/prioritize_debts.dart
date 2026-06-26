import '../entities/debt.dart';

/// Estrategias para ordenar las deudas por conveniencia de pago.
enum PayoffStrategy {
  /// Avalancha: ataca primero la tasa efectiva anual mas alta. Minimiza
  /// el total de intereses pagados (optimo matematico).
  avalanche,

  /// Costo mensual: ataca primero la deuda que mas intereses genera al mes
  /// (saldo x tasa mensual), es decir, la que mas dinero te cuesta hoy.
  monthlyCost,
}

/// Etiqueta corta de cada estrategia para la UI.
/// @param strategy - Estrategia a describir.
/// @return Nombre legible de la estrategia.
String payoffStrategyLabel(PayoffStrategy strategy) => switch (strategy) {
      PayoffStrategy.avalanche => 'Avalancha',
      PayoffStrategy.monthlyCost => 'Costo mensual',
    };

/// Explicacion corta de para que sirve cada estrategia.
/// @param strategy - Estrategia a describir.
/// @return Descripcion legible de la estrategia.
String payoffStrategyHint(PayoffStrategy strategy) => switch (strategy) {
      PayoffStrategy.avalanche => 'Paga menos intereses: ataca la tasa más alta.',
      PayoffStrategy.monthlyCost => 'Ataca la deuda que más te cuesta cada mes.',
    };

/// Ordena las deudas por conveniencia de pago segun la estrategia elegida.
///
/// Regla dura: las deudas en mora van siempre primero (su costo real es la
/// tasa de mora, mucho mas alta). Dentro de cada grupo se aplica la estrategia.
/// Las deudas ya pagadas (sin saldo) quedan al final.
///
/// No muta la lista recibida; devuelve una copia ordenada.
/// @param debts - Deudas a ordenar.
/// @param strategy - Estrategia de pago a aplicar.
/// @return Nueva lista ordenada, la #0 es la que conviene pagar primero.
List<Debt> prioritizeDebts(List<Debt> debts, PayoffStrategy strategy) {
  final sorted = [...debts];
  sorted.sort((a, b) => _compare(a, b, strategy));
  return sorted;
}

/// Compara dos deudas para el ordenamiento (mayor prioridad primero).
/// @param a - Primera deuda.
/// @param b - Segunda deuda.
/// @param strategy - Estrategia activa.
/// @return Negativo si `a` va antes que `b`, positivo si va despues.
int _compare(Debt a, Debt b, PayoffStrategy strategy) {
  // 1) Deudas sin saldo (pagadas) siempre al final.
  final aSettled = a.currentBalance <= 0;
  final bSettled = b.currentBalance <= 0;
  if (aSettled != bSettled) {
    return aSettled ? 1 : -1;
  }

  // 2) Mora primero.
  if (a.isInArrears != b.isInArrears) {
    return a.isInArrears ? -1 : 1;
  }

  // 3) Estrategia (mayor valor = mas prioridad = va antes).
  final cmp = _score(b, strategy).compareTo(_score(a, strategy));
  if (cmp != 0) return cmp;

  // 4) Desempate estable: acreedor.
  return a.creditor.compareTo(b.creditor);
}

/// Calcula el puntaje de prioridad de una deuda segun la estrategia.
/// @param debt - Deuda a puntuar.
/// @param strategy - Estrategia activa.
/// @return Puntaje; a mayor puntaje, mas conviene pagarla primero.
double _score(Debt debt, PayoffStrategy strategy) => switch (strategy) {
      PayoffStrategy.avalanche => debt.effectiveAnnualRate,
      PayoffStrategy.monthlyCost => debt.monthlyInterestCost,
    };

/// Motivo por el que una deuda es la prioridad bajo la estrategia activa.
/// @param debt - Deuda priorizada.
/// @param strategy - Estrategia activa.
/// @return Texto corto para mostrar en la insignia "Paga primero".
String priorityReason(Debt debt, PayoffStrategy strategy) {
  if (debt.isInArrears) return 'En mora';
  return switch (strategy) {
    PayoffStrategy.avalanche => 'Tasa más alta',
    PayoffStrategy.monthlyCost => 'Más interés al mes',
  };
}
