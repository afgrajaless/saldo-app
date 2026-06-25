/// Saldo neto de un miembro dentro del grupo.
class MemberBalance {
  const MemberBalance({
    required this.memberId,
    required this.displayName,
    required this.net,
  });

  final String memberId;
  final String displayName;

  /// Neto del miembro: positivo = le deben, negativo = debe.
  final double net;
}

/// Deuda simplificada entre dos miembros del grupo, con informacion de pendientes.
class Debt {
  const Debt({
    required this.fromMemberId,
    required this.fromName,
    required this.toMemberId,
    required this.toName,
    required this.owed,
    this.pendingOwed = 0,
    this.hasPending = false,
  });

  /// ID del miembro que debe.
  final String fromMemberId;
  final String fromName;

  /// ID del miembro que debe recibir el pago.
  final String toMemberId;
  final String toName;

  /// Monto total que se adeuda (ya confirmado + pendiente).
  final double owed;

  /// Monto pendiente de confirmacion dentro de la deuda total.
  final double pendingOwed;

  /// Indica si hay partes pendientes de confirmacion en esta deuda.
  final bool hasPending;
}

/// Balance consolidado del grupo: netos individuales y deudas simplificadas.
class GroupBalance {
  const GroupBalance({
    required this.members,
    required this.debts,
    this.myPendingCount = 0,
  });

  final List<MemberBalance> members;
  final List<Debt> debts;

  /// Cantidad de partes pendientes de confirmacion para el usuario autenticado.
  final int myPendingCount;
}
