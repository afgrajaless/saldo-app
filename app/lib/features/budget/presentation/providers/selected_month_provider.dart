import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../shared/month_format.dart';

part 'selected_month_provider.g.dart';

/// Mes seleccionado en el presupuesto (formato YYYY-MM). Arranca en el actual.
@riverpod
class SelectedMonth extends _$SelectedMonth {
  @override
  String build() => currentMonth();

  /// Desplaza el mes seleccionado.
  /// @param delta - Numero de meses a sumar (puede ser negativo).
  void shift(int delta) => state = shiftMonth(state, delta);
}
