/// Formatea un valor en pesos colombianos: `$ 1.234.567`.
/// @param value - Monto a formatear.
/// @return El texto formateado con separador de miles y simbolo de peso.
String formatCop(num value) {
  final rounded = value.round();
  final digits = rounded.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digits[i]);
  }
  final sign = rounded < 0 ? '-' : '';
  return '$sign\$ ${buffer.toString()}';
}

/// Formatea una fraccion decimal como porcentaje: `0.2674` -> `26,74 %`.
/// @param fraction - Tasa como fraccion decimal.
/// @return El texto en porcentaje con coma decimal.
String formatPercent(num fraction) {
  final percent = (fraction * 100).toStringAsFixed(2).replaceAll('.', ',');
  return '$percent %';
}
