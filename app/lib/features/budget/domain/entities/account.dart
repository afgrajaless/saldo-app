/// Cuenta (Nequi, efectivo, banco, etc.).
class Account {
  const Account({
    required this.id,
    required this.name,
    required this.color,
    this.yieldType = 'none',
    this.effectiveAnnualRate,
  });

  final String id;
  final String name;

  /// Color hex (#RRGGBB).
  final String color;

  /// Tipo de rendimiento: 'none', 'savings' o 'cdt'.
  final String yieldType;

  /// Tasa E.A. vigente (fraccion decimal); null si no genera rendimiento.
  final double? effectiveAnnualRate;

  /// Indica si la cuenta genera algun rendimiento.
  bool get hasYield => yieldType != 'none';

  /// Indica si la cuenta es un CDT.
  bool get isCdt => yieldType == 'cdt';
}
