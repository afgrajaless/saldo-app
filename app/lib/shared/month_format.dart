/// Nombres de los meses en espanol (indice 1-12).
const List<String> _monthNames = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/// Convierte 'YYYY-MM' en un nombre legible: '2026-06' -> 'Junio 2026'.
/// @param month - Mes en formato YYYY-MM.
/// @return El nombre del mes y el anio.
String monthLabel(String month) {
  final parts = month.split('-');
  if (parts.length != 2) return month;
  final year = parts[0];
  final m = int.tryParse(parts[1]) ?? 0;
  if (m < 1 || m > 12) return month;
  return '${_monthNames[m]} $year';
}

/// Devuelve el mes actual en formato YYYY-MM.
/// @return El mes actual.
String currentMonth() => DateTime.now().toIso8601String().substring(0, 7);

/// Suma meses a un 'YYYY-MM' (delta puede ser negativo).
/// @param month - Mes base YYYY-MM.
/// @param delta - Meses a sumar.
/// @return El nuevo mes YYYY-MM.
String shiftMonth(String month, int delta) {
  final parts = month.split('-').map(int.parse).toList();
  final total = (parts[0] * 12 + (parts[1] - 1)) + delta;
  final year = total ~/ 12;
  final m = total % 12 + 1;
  return '$year-${m.toString().padLeft(2, '0')}';
}
