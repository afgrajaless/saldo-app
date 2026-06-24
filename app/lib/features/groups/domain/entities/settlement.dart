/// Liquidacion de deuda entre dos miembros del grupo.
class Settlement {
  const Settlement({
    required this.id,
    required this.fromMemberId,
    required this.toMemberId,
    required this.amount,
    required this.settledOn,
  });

  final String id;

  /// ID del miembro que paga la deuda.
  final String fromMemberId;

  /// ID del miembro que recibe el pago.
  final String toMemberId;

  final double amount;

  /// Fecha en que se registro la liquidacion (ISO 8601, solo fecha).
  final String settledOn;
}
