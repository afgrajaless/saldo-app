import '../entities/group.dart';
import '../entities/group_balance.dart';
import '../entities/group_invite.dart';
import '../entities/group_member.dart';
import '../entities/group_params.dart';
import '../entities/settlement.dart';
import '../entities/shared_expense.dart';

/// Contrato del repositorio de grupos de gasto compartido.
abstract class GroupsRepository {
  /// Lista los grupos en los que participa el usuario autenticado.
  /// @return Lista de grupos del usuario.
  Future<List<Group>> getGroups();

  /// Crea un nuevo grupo de gasto compartido.
  /// @param p - Datos del grupo (nombre).
  /// @return El grupo creado.
  Future<Group> createGroup(CreateGroupParams p);

  /// Lista los miembros de un grupo.
  /// @param groupId - UUID del grupo.
  /// @return Lista de miembros del grupo.
  Future<List<GroupMember>> getMembers(String groupId);

  /// Agrega un miembro (invitado) a un grupo.
  /// @param groupId - UUID del grupo.
  /// @param p - Datos del miembro (nombre para mostrar).
  /// @return El miembro creado.
  Future<GroupMember> addMember(String groupId, AddMemberParams p);

  /// Elimina un miembro de un grupo.
  /// @param groupId - UUID del grupo.
  /// @param memberId - UUID del miembro a eliminar.
  Future<void> removeMember(String groupId, String memberId);

  /// Crea un codigo de invitacion para que otro usuario se una al grupo.
  /// @param groupId - UUID del grupo.
  /// @param p - Parametros de la invitacion (miembro opcional a vincular).
  /// @return La invitacion generada con su codigo.
  Future<GroupInvite> createInvite(String groupId, CreateInviteParams p);

  /// Une al usuario autenticado a un grupo via codigo de invitacion.
  /// @param p - Codigo de invitacion.
  /// @return El grupo al que se unio el usuario.
  Future<Group> joinGroup(JoinGroupParams p);

  /// Lista los gastos compartidos de un grupo.
  /// @param groupId - UUID del grupo.
  /// @return Lista de gastos del grupo.
  Future<List<SharedExpense>> getExpenses(String groupId);

  /// Registra un gasto compartido en un grupo.
  /// @param groupId - UUID del grupo.
  /// @param p - Datos del gasto (monto, pagador, metodo de division).
  /// @return El gasto creado.
  Future<SharedExpense> createExpense(String groupId, CreateExpenseParams p);

  /// Elimina un gasto compartido de un grupo.
  /// @param groupId - UUID del grupo.
  /// @param expenseId - UUID del gasto a eliminar.
  Future<void> deleteExpense(String groupId, String expenseId);

  /// Obtiene el balance de deudas entre miembros de un grupo.
  /// @param groupId - UUID del grupo.
  /// @return Balance con netos y deudas entre miembros.
  Future<GroupBalance> getBalance(String groupId);

  /// Lista las liquidaciones de deuda registradas en un grupo.
  /// @param groupId - UUID del grupo.
  /// @return Lista de liquidaciones del grupo.
  Future<List<Settlement>> getSettlements(String groupId);

  /// Registra una liquidacion de deuda entre dos miembros de un grupo.
  /// @param groupId - UUID del grupo.
  /// @param p - Datos de la liquidacion (de, para, monto, fecha).
  /// @return La liquidacion creada.
  Future<Settlement> createSettlement(String groupId, CreateSettlementParams p);

  /// Abandona un grupo (el usuario autenticado deja de pertenecer al grupo).
  /// @param groupId - UUID del grupo a abandonar.
  Future<void> leaveGroup(String groupId);
}
