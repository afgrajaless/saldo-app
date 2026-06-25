/// Estado de confirmacion de una parte del gasto por el miembro correspondiente.
enum ShareStatus {
  /// El miembro confirmo que debe su parte.
  confirmed,

  /// El miembro aun no ha confirmado ni disputado su parte.
  pending,

  /// El miembro disputa el monto asignado.
  disputed,
}

/// Parte proporcional de un gasto compartido asignada a un miembro.
class ExpenseShare {
  const ExpenseShare({
    required this.memberId,
    required this.shareAmount,
    this.status = ShareStatus.confirmed,
  });

  final String memberId;

  /// Monto que le corresponde a este miembro.
  final double shareAmount;

  /// Estado de confirmacion de la parte por el miembro.
  final ShareStatus status;
}

/// Gasto compartido registrado dentro de un grupo.
class SharedExpense {
  const SharedExpense({
    required this.id,
    required this.groupId,
    required this.paidByMemberId,
    required this.amount,
    required this.occurredOn,
    required this.splitMethod,
    required this.shares,
    this.description,
  });

  final String id;
  final String groupId;

  /// ID del miembro que pago el gasto.
  final String paidByMemberId;

  /// Descripcion opcional del gasto.
  final String? description;

  /// Monto total del gasto.
  final double amount;

  /// Fecha en que ocurrio el gasto (ISO 8601, solo fecha).
  final String occurredOn;

  /// Metodo de division: 'equal', 'exact', 'percentage', etc.
  final String splitMethod;

  /// Lista de partes asignadas a cada miembro.
  final List<ExpenseShare> shares;
}
