import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../core/error/api_exception.dart';
import '../domain/entities/group.dart';
import '../domain/entities/group_balance.dart';
import '../domain/entities/group_debt_summary.dart';
import '../domain/entities/group_invite.dart';
import '../domain/entities/group_member.dart';
import '../domain/entities/group_params.dart';
import '../domain/entities/settlement.dart';
import '../domain/entities/shared_expense.dart';
import '../domain/repositories/groups_repository.dart';
import 'group_mappers.dart';

/// Implementacion del repositorio de grupos de gasto compartido sobre la API NestJS (Dio).
@LazySingleton(as: GroupsRepository)
class GroupsRepositoryImpl implements GroupsRepository {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  GroupsRepositoryImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<Group>> getGroups() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/groups');
      return res.data!.map((e) => groupFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Group> createGroup(CreateGroupParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/groups', data: p.toJson());
      return groupFromJson(res.data!);
    });
  }

  @override
  Future<List<GroupMember>> getMembers(String groupId) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/groups/$groupId/members');
      return res.data!.map((e) => groupMemberFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<GroupMember> addMember(String groupId, AddMemberParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/groups/$groupId/members',
        data: p.toJson(),
      );
      return groupMemberFromJson(res.data!);
    });
  }

  @override
  Future<void> removeMember(String groupId, String memberId) {
    return _send(() => _dio.delete<void>('/groups/$groupId/members/$memberId'));
  }

  @override
  Future<GroupInvite> createInvite(String groupId, CreateInviteParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/groups/$groupId/invites',
        data: p.toJson(),
      );
      return groupInviteFromJson(res.data!);
    });
  }

  @override
  Future<Group> joinGroup(JoinGroupParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/groups/join', data: p.toJson());
      return groupFromJson(res.data!);
    });
  }

  @override
  Future<List<SharedExpense>> getExpenses(String groupId) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/groups/$groupId/expenses');
      return res.data!.map((e) => sharedExpenseFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<SharedExpense> createExpense(String groupId, CreateExpenseParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/groups/$groupId/expenses',
        data: p.toJson(),
      );
      return sharedExpenseFromJson(res.data!);
    });
  }

  @override
  Future<void> deleteExpense(String groupId, String expenseId) {
    return _send(() => _dio.delete<void>('/groups/$groupId/expenses/$expenseId'));
  }

  @override
  Future<void> confirmShare(String groupId, String expenseId) {
    return _send(
      () => _dio.post<void>('/groups/$groupId/expenses/$expenseId/confirm'),
    );
  }

  @override
  Future<void> disputeShare(String groupId, String expenseId, {String? note}) {
    return _send(() {
      final body = note != null ? {'note': note} : <String, dynamic>{};
      return _dio.post<void>('/groups/$groupId/expenses/$expenseId/dispute', data: body);
    });
  }

  @override
  Future<GroupBalance> getBalance(String groupId) {
    return _send(() async {
      final res = await _dio.get<Map<String, dynamic>>('/groups/$groupId/balance');
      return groupBalanceFromJson(res.data!);
    });
  }

  @override
  Future<List<Settlement>> getSettlements(String groupId) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/groups/$groupId/settlements');
      return res.data!.map((e) => settlementFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Settlement> createSettlement(String groupId, CreateSettlementParams p) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/groups/$groupId/settlements',
        data: p.toJson(),
      );
      return settlementFromJson(res.data!);
    });
  }

  @override
  Future<void> leaveGroup(String groupId) {
    return _send(() => _dio.delete<void>('/groups/$groupId/leave'));
  }

  @override
  Future<List<GroupDebtSummary>> getMyGroupDebts() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/groups/me/debts');
      return res.data!
          .map((e) => groupDebtSummaryFromJson(e as Map<String, dynamic>))
          .toList();
    });
  }

  /// Ejecuta una llamada traduciendo los DioException a ApiException.
  /// @param request - Operacion HTTP a ejecutar.
  /// @return El resultado de la operacion.
  Future<T> _send<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
