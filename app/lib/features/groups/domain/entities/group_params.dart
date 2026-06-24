/// Parametros para crear un grupo de gasto compartido.
class CreateGroupParams {
  const CreateGroupParams({required this.name});

  final String name;

  /// Cuerpo JSON para el POST /groups.
  Map<String, dynamic> toJson() => {'name': name};
}

/// Parametros para agregar un miembro a un grupo.
class AddMemberParams {
  const AddMemberParams({required this.displayName});

  final String displayName;

  /// Cuerpo JSON para el POST /groups/:id/members.
  Map<String, dynamic> toJson() => {'displayName': displayName};
}

/// Parametros para crear una invitacion de grupo.
class CreateInviteParams {
  const CreateInviteParams({this.memberId});

  /// ID del miembro asociado a la invitacion; null si es invitacion abierta.
  final String? memberId;

  /// Cuerpo JSON para el POST /groups/:id/invites.
  Map<String, dynamic> toJson() => {
        if (memberId != null) 'memberId': memberId,
      };
}

/// Parametros para unirse a un grupo via codigo de invitacion.
class JoinGroupParams {
  const JoinGroupParams({required this.code});

  final String code;

  /// Cuerpo JSON para el POST /groups/join.
  Map<String, dynamic> toJson() => {'code': code};
}

/// Parte exacta asignada a un miembro en un gasto.
class ExactShareParams {
  const ExactShareParams({
    required this.memberId,
    required this.shareAmount,
  });

  final String memberId;
  final double shareAmount;

  /// Serializa la parte exacta.
  Map<String, dynamic> toJson() => {
        'memberId': memberId,
        'shareAmount': shareAmount,
      };
}

/// Parametros para registrar un gasto compartido en un grupo.
class CreateExpenseParams {
  const CreateExpenseParams({
    required this.paidByMemberId,
    required this.amount,
    required this.occurredOn,
    required this.splitMethod,
    this.description,
    this.participantMemberIds,
    this.exactShares,
  });

  final String paidByMemberId;
  final double amount;
  final String occurredOn;

  /// Metodo de division: 'equal', 'exact', 'percentage', etc.
  final String splitMethod;

  final String? description;

  /// IDs de los miembros participantes (para division igualitaria).
  final List<String>? participantMemberIds;

  /// Partes exactas por miembro (para division exacta).
  final List<ExactShareParams>? exactShares;

  /// Cuerpo JSON para el POST /groups/:id/expenses.
  Map<String, dynamic> toJson() => {
        'paidByMemberId': paidByMemberId,
        'amount': amount,
        'occurredOn': occurredOn,
        'splitMethod': splitMethod,
        if (description != null && description!.isNotEmpty) 'description': description,
        if (participantMemberIds != null) 'participantMemberIds': participantMemberIds,
        if (exactShares != null) 'exactShares': exactShares!.map((s) => s.toJson()).toList(),
      };
}

/// Parametros para registrar una liquidacion de deuda entre miembros.
class CreateSettlementParams {
  const CreateSettlementParams({
    required this.fromMemberId,
    required this.toMemberId,
    required this.amount,
    required this.settledOn,
    this.recordAccountId,
    this.recordCategoryId,
  });

  final String fromMemberId;
  final String toMemberId;
  final double amount;

  /// Fecha en que se liquida la deuda (ISO 8601, solo fecha).
  final String settledOn;

  /// ID de cuenta para registrar como gasto personal; requiere [recordCategoryId].
  final String? recordAccountId;

  /// ID de categoria para registrar como gasto personal; requiere [recordAccountId].
  final String? recordCategoryId;

  /// Cuerpo JSON para el POST /groups/:id/settlements.
  /// Si ambos [recordAccountId] y [recordCategoryId] estan presentes,
  /// se incluye el objeto 'recordPersonal' para crear el gasto en el presupuesto.
  Map<String, dynamic> toJson() => {
        'fromMemberId': fromMemberId,
        'toMemberId': toMemberId,
        'amount': amount,
        'settledOn': settledOn,
        if (recordAccountId != null && recordCategoryId != null)
          'recordPersonal': {
            'accountId': recordAccountId,
            'categoryId': recordCategoryId,
          },
      };
}
