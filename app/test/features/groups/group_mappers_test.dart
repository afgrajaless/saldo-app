import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/features/groups/data/group_mappers.dart';
import 'package:saldo/features/groups/domain/entities/shared_expense.dart';

void main() {
  test('groupBalanceFromJson parsea netos y deudas (campos legacy)', () {
    final json = {
      'myPendingCount': 0,
      'members': [
        {'memberId': 'a', 'displayName': 'Ana', 'net': 60000},
        {'memberId': 'b', 'displayName': 'Beto', 'net': -60000},
      ],
      'debts': [
        {
          'fromMemberId': 'b',
          'fromName': 'Beto',
          'toMemberId': 'a',
          'toName': 'Ana',
          'owed': 60000,
          'pendingOwed': 0,
          'hasPending': false,
        },
      ],
    };
    final balance = groupBalanceFromJson(json);
    expect(balance.members.length, 2);
    expect(balance.members.first.net, 60000);
    expect(balance.debts.first.owed, 60000);
    expect(balance.debts.first.fromName, 'Beto');
    expect(balance.myPendingCount, 0);
  });

  test('groupBalanceFromJson parsea myPendingCount y deudas con pendiente', () {
    final json = {
      'myPendingCount': 2,
      'members': [
        {'memberId': 'a', 'displayName': 'Ana', 'net': 50000},
      ],
      'debts': [
        {
          'fromMemberId': 'b',
          'fromName': 'Beto',
          'toMemberId': 'a',
          'toName': 'Ana',
          'owed': 50000,
          'pendingOwed': 20000,
          'hasPending': true,
        },
      ],
    };
    final balance = groupBalanceFromJson(json);
    expect(balance.myPendingCount, 2);
    expect(balance.debts.first.pendingOwed, 20000);
    expect(balance.debts.first.hasPending, true);
  });

  test('groupMemberFromJson marca isGhost', () {
    final ghost = groupMemberFromJson({
      'id': 'm1',
      'groupId': 'g',
      'userId': null,
      'displayName': 'Pedro',
      'isGhost': true,
    });
    expect(ghost.isGhost, true);
    expect(ghost.userId, isNull);
  });

  test('_expenseShareFromJson parsea status correctamente', () {
    // Prueba indirecta: el share status se parsea en sharedExpenseFromJson
    final expenseJson = {
      'id': 'e1',
      'groupId': 'g1',
      'paidByMemberId': 'a',
      'description': null,
      'amount': 30000,
      'occurredOn': '2025-01-15',
      'splitMethod': 'equal',
      'shares': [
        {'memberId': 'a', 'shareAmount': 15000, 'status': 'confirmed'},
        {'memberId': 'b', 'shareAmount': 15000, 'status': 'pending'},
        {'memberId': 'c', 'shareAmount': 15000, 'status': 'disputed'},
      ],
    };
    final expense = sharedExpenseFromJson(expenseJson);
    expect(expense.shares[0].status, ShareStatus.confirmed);
    expect(expense.shares[1].status, ShareStatus.pending);
    expect(expense.shares[2].status, ShareStatus.disputed);
  });

  test('_expenseShareFromJson usa confirmed como default si falta status', () {
    final expenseJson = {
      'id': 'e2',
      'groupId': 'g1',
      'paidByMemberId': 'a',
      'description': null,
      'amount': 20000,
      'occurredOn': '2025-01-16',
      'splitMethod': 'equal',
      'shares': [
        {'memberId': 'a', 'shareAmount': 10000},
      ],
    };
    final expense = sharedExpenseFromJson(expenseJson);
    expect(expense.shares.first.status, ShareStatus.confirmed);
  });

  test('groupDebtSummaryFromJson parsea todos los campos', () {
    final json = {
      'groupId': 'g1',
      'groupName': 'Viaje Cartagena',
      'creditorMemberId': 'ma',
      'creditorName': 'Ana',
      'amountOwed': 75000,
      'pendingAmount': 25000,
      'hasPending': true,
    };
    final summary = groupDebtSummaryFromJson(json);
    expect(summary.groupId, 'g1');
    expect(summary.groupName, 'Viaje Cartagena');
    expect(summary.creditorMemberId, 'ma');
    expect(summary.creditorName, 'Ana');
    expect(summary.amountOwed, 75000);
    expect(summary.pendingAmount, 25000);
    expect(summary.hasPending, true);
  });
}
