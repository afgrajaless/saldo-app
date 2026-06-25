import '../domain/entities/group.dart';
import '../domain/entities/group_balance.dart';
import '../domain/entities/group_debt_summary.dart';
import '../domain/entities/group_invite.dart';
import '../domain/entities/group_member.dart';
import '../domain/entities/settlement.dart';
import '../domain/entities/shared_expense.dart';

double _toDouble(Object? value) => (value as num).toDouble();

/// Convierte un string del backend al enum ShareStatus.
/// @param value - Cadena recibida del backend ('confirmed', 'pending', 'disputed').
/// @return El enum correspondiente; retorna [ShareStatus.confirmed] si es nulo o desconocido.
ShareStatus _shareStatusFromString(String? value) {
  switch (value) {
    case 'pending':
      return ShareStatus.pending;
    case 'disputed':
      return ShareStatus.disputed;
    default:
      return ShareStatus.confirmed;
  }
}

/// Construye un Group desde el JSON del backend.
Group groupFromJson(Map<String, dynamic> json) {
  return Group(
    id: json['id'] as String,
    name: json['name'] as String,
    createdAt: json['createdAt'] as String,
    archivedAt: json['archivedAt'] as String?,
  );
}

/// Construye un GroupMember desde el JSON del backend.
GroupMember groupMemberFromJson(Map<String, dynamic> json) {
  return GroupMember(
    id: json['id'] as String,
    groupId: json['groupId'] as String,
    userId: json['userId'] as String?,
    displayName: json['displayName'] as String,
    isGhost: json['isGhost'] as bool,
  );
}

/// Construye un ExpenseShare desde el JSON del backend.
/// @param json - Objeto JSON con memberId, shareAmount y status opcional.
/// @return La parte del gasto con su estado de confirmacion.
ExpenseShare _expenseShareFromJson(Map<String, dynamic> json) {
  return ExpenseShare(
    memberId: json['memberId'] as String,
    shareAmount: _toDouble(json['shareAmount']),
    status: _shareStatusFromString(json['status'] as String?),
  );
}

/// Construye un SharedExpense desde el JSON del backend.
SharedExpense sharedExpenseFromJson(Map<String, dynamic> json) {
  final shares = (json['shares'] as List<dynamic>)
      .map((e) => _expenseShareFromJson(e as Map<String, dynamic>))
      .toList();
  return SharedExpense(
    id: json['id'] as String,
    groupId: json['groupId'] as String,
    paidByMemberId: json['paidByMemberId'] as String,
    description: json['description'] as String?,
    amount: _toDouble(json['amount']),
    occurredOn: json['occurredOn'] as String,
    splitMethod: json['splitMethod'] as String,
    shares: shares,
  );
}

/// Construye un MemberBalance desde el JSON del backend.
MemberBalance _memberBalanceFromJson(Map<String, dynamic> json) {
  return MemberBalance(
    memberId: json['memberId'] as String,
    displayName: json['displayName'] as String,
    net: _toDouble(json['net']),
  );
}

/// Construye un Debt desde el JSON del backend.
/// @param json - Objeto JSON con owed, pendingOwed y hasPending.
/// @return La deuda entre dos miembros con informacion de pendientes.
Debt _debtFromJson(Map<String, dynamic> json) {
  return Debt(
    fromMemberId: json['fromMemberId'] as String,
    fromName: json['fromName'] as String,
    toMemberId: json['toMemberId'] as String,
    toName: json['toName'] as String,
    owed: _toDouble(json['owed']),
    pendingOwed: _toDouble(json['pendingOwed'] ?? 0),
    hasPending: json['hasPending'] as bool? ?? false,
  );
}

/// Construye un GroupBalance desde el JSON del backend.
/// @param json - Objeto JSON con members, debts y myPendingCount.
/// @return Balance consolidado del grupo.
GroupBalance groupBalanceFromJson(Map<String, dynamic> json) {
  final members = (json['members'] as List<dynamic>)
      .map((e) => _memberBalanceFromJson(e as Map<String, dynamic>))
      .toList();
  final debts = (json['debts'] as List<dynamic>)
      .map((e) => _debtFromJson(e as Map<String, dynamic>))
      .toList();
  return GroupBalance(
    members: members,
    debts: debts,
    myPendingCount: json['myPendingCount'] as int? ?? 0,
  );
}

/// Construye un Settlement desde el JSON del backend.
Settlement settlementFromJson(Map<String, dynamic> json) {
  return Settlement(
    id: json['id'] as String,
    fromMemberId: json['fromMemberId'] as String,
    toMemberId: json['toMemberId'] as String,
    amount: _toDouble(json['amount']),
    settledOn: json['settledOn'] as String,
  );
}

/// Construye un GroupInvite desde el JSON del backend.
GroupInvite groupInviteFromJson(Map<String, dynamic> json) {
  return GroupInvite(
    code: json['code'] as String,
    expiresAt: json['expiresAt'] as String,
  );
}

/// Construye un GroupDebtSummary desde el JSON del backend.
/// @param json - Objeto JSON con la deuda del usuario en un grupo especifico.
/// @return Resumen de la deuda en un grupo.
GroupDebtSummary groupDebtSummaryFromJson(Map<String, dynamic> json) {
  return GroupDebtSummary(
    groupId: json['groupId'] as String,
    groupName: json['groupName'] as String,
    creditorMemberId: json['creditorMemberId'] as String,
    creditorName: json['creditorName'] as String,
    amountOwed: _toDouble(json['amountOwed']),
    pendingAmount: _toDouble(json['pendingAmount']),
    hasPending: json['hasPending'] as bool,
  );
}
