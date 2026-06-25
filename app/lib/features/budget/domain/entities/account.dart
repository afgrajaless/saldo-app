/// Cuenta (Nequi, efectivo, banco, etc.).
class Account {
  const Account({
    required this.id,
    required this.name,
    required this.color,
    this.yieldType = 'none',
    this.effectiveAnnualRate,
    this.kind = 'asset',
    this.source = 'manual',
  });

  final String id;
  final String name;

  /// Color hex (#RRGGBB).
  final String color;

  /// Tipo de rendimiento: 'none', 'savings' o 'cdt'.
  final String yieldType;

  /// Tasa E.A. vigente (fraccion decimal); null si no genera rendimiento.
  final double? effectiveAnnualRate;

  /// Tipo de cuenta: 'asset' (cuenta normal) o 'credit_card' (tarjeta de credito).
  final String kind;

  /// Origen de la cuenta: 'manual' (creada por el usuario) u 'open_finance' (sincronizada).
  final String source;

  /// Indica si la cuenta genera algun rendimiento.
  bool get hasYield => yieldType != 'none';

  /// Indica si la cuenta es un CDT.
  bool get isCdt => yieldType == 'cdt';

  /// Indica si la cuenta es una tarjeta de credito.
  bool get isCard => kind == 'credit_card';

  /// Indica si la cuenta fue sincronizada via Open Finance (solo lectura).
  bool get isLinked => source == 'open_finance';
}
