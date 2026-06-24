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

/// Deuda simplificada entre dos miembros del grupo.
class Debt {
  const Debt({
    required this.fromMemberId,
    required this.fromName,
    required this.toMemberId,
    required this.toName,
    required this.amount,
  });

  /// ID del miembro que debe.
  final String fromMemberId;
  final String fromName;

  /// ID del miembro que debe recibir el pago.
  final String toMemberId;
  final String toName;

  final double amount;
}

/// Balance consolidado del grupo: netos individuales y deudas simplificadas.
class GroupBalance {
  const GroupBalance({
    required this.members,
    required this.debts,
  });

  final List<MemberBalance> members;
  final List<Debt> debts;
}
