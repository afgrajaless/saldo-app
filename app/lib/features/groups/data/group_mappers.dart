import '../domain/entities/group.dart';
import '../domain/entities/group_balance.dart';
import '../domain/entities/group_invite.dart';
import '../domain/entities/group_member.dart';
import '../domain/entities/settlement.dart';
import '../domain/entities/shared_expense.dart';

double _toDouble(Object? value) => (value as num).toDouble();

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
ExpenseShare _expenseShareFromJson(Map<String, dynamic> json) {
  return ExpenseShare(
    memberId: json['memberId'] as String,
    shareAmount: _toDouble(json['shareAmount']),
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
Debt _debtFromJson(Map<String, dynamic> json) {
  return Debt(
    fromMemberId: json['fromMemberId'] as String,
    fromName: json['fromName'] as String,
    toMemberId: json['toMemberId'] as String,
    toName: json['toName'] as String,
    amount: _toDouble(json['amount']),
  );
}

/// Construye un GroupBalance desde el JSON del backend.
GroupBalance groupBalanceFromJson(Map<String, dynamic> json) {
  final members = (json['members'] as List<dynamic>)
      .map((e) => _memberBalanceFromJson(e as Map<String, dynamic>))
      .toList();
  final debts = (json['debts'] as List<dynamic>)
      .map((e) => _debtFromJson(e as Map<String, dynamic>))
      .toList();
  return GroupBalance(members: members, debts: debts);
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
