/// Resumen de deuda del usuario en un grupo especifico.
class GroupDebtSummary {
  const GroupDebtSummary({
    required this.groupId,
    required this.groupName,
    required this.creditorMemberId,
    required this.creditorName,
    required this.amountOwed,
    required this.pendingAmount,
    required this.hasPending,
  });

  /// UUID del grupo al que pertenece la deuda.
  final String groupId;

  /// Nombre del grupo.
  final String groupName;

  /// ID del miembro acreedor (quien recibira el pago).
  final String creditorMemberId;

  /// Nombre del miembro acreedor.
  final String creditorName;

  /// Monto total que el usuario adeuda en este grupo.
  final double amountOwed;

  /// Monto pendiente de confirmacion dentro de la deuda total.
  final double pendingAmount;

  /// Indica si hay partes pendientes de confirmacion.
  final bool hasPending;
}
