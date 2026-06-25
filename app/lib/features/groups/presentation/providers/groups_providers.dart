import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/group.dart';
import '../../domain/entities/group_balance.dart';
import '../../domain/entities/group_debt_summary.dart';
import '../../domain/entities/group_member.dart';
import '../../domain/entities/settlement.dart';
import '../../domain/entities/shared_expense.dart';
import '../../domain/repositories/groups_repository.dart';

part 'groups_providers.g.dart';

/// Lista los grupos en los que participa el usuario autenticado.
/// @param ref - Referencia del provider.
/// @return Lista de grupos del usuario.
@riverpod
Future<List<Group>> groupsList(Ref ref) {
  return getIt<GroupsRepository>().getGroups();
}

/// Lista los miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de miembros del grupo.
@riverpod
Future<List<GroupMember>> groupMembers(Ref ref, String groupId) {
  return getIt<GroupsRepository>().getMembers(groupId);
}

/// Obtiene el balance de deudas entre miembros de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Balance con netos y deudas entre miembros.
@riverpod
Future<GroupBalance> groupBalance(Ref ref, String groupId) {
  return getIt<GroupsRepository>().getBalance(groupId);
}

/// Lista los gastos compartidos de un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de gastos del grupo.
@riverpod
Future<List<SharedExpense>> groupExpenses(Ref ref, String groupId) {
  return getIt<GroupsRepository>().getExpenses(groupId);
}

/// Lista las liquidaciones de deuda registradas en un grupo.
/// @param ref - Referencia del provider.
/// @param groupId - UUID del grupo.
/// @return Lista de liquidaciones del grupo.
@riverpod
Future<List<Settlement>> groupSettlements(Ref ref, String groupId) {
  return getIt<GroupsRepository>().getSettlements(groupId);
}

/// Lista todas las deudas activas del usuario autenticado en todos sus grupos.
/// @param ref - Referencia del provider.
/// @return Lista de resumenes de deuda por grupo.
@riverpod
Future<List<GroupDebtSummary>> myGroupDebts(Ref ref) {
  return getIt<GroupsRepository>().getMyGroupDebts();
}
