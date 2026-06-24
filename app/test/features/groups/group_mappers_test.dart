import 'package:flutter_test/flutter_test.dart';
import 'package:saldo/features/groups/data/group_mappers.dart';

void main() {
  test('groupBalanceFromJson parsea netos y deudas', () {
    final json = {
      'members': [
        {'memberId': 'a', 'displayName': 'Ana', 'net': 60000},
        {'memberId': 'b', 'displayName': 'Beto', 'net': -60000},
      ],
      'debts': [
        {'fromMemberId': 'b', 'fromName': 'Beto', 'toMemberId': 'a', 'toName': 'Ana', 'amount': 60000},
      ],
    };
    final balance = groupBalanceFromJson(json);
    expect(balance.members.length, 2);
    expect(balance.members.first.net, 60000);
    expect(balance.debts.first.amount, 60000);
    expect(balance.debts.first.fromName, 'Beto');
  });

  test('groupMemberFromJson marca isGhost', () {
    final ghost = groupMemberFromJson({'id': 'm1', 'groupId': 'g', 'userId': null, 'displayName': 'Pedro', 'isGhost': true});
    expect(ghost.isGhost, true);
    expect(ghost.userId, isNull);
  });
}
