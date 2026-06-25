import 'package:flutter/material.dart';

import '../../../../shared/money_format.dart';
import '../../domain/entities/group_member.dart';
import '../../domain/entities/shared_expense.dart';

/// Fila de un gasto compartido dentro de un grupo.
/// Muestra la descripcion, el monto, la fecha, los chips de estado por
/// participante y acciones para confirmar o refutar la parte propia.
/// Soporta swipe-to-delete cuando se provee [onDelete].
/// @param expense - Gasto compartido a mostrar.
/// @param groupId - UUID del grupo al que pertenece el gasto.
/// @param members - Lista de miembros del grupo para resolver nombres.
/// @param onConfirm - Callback al tocar "Confirmar mi parte".
/// @param onDispute - Callback al tocar "Refutar mi parte".
/// @param onDelete - Callback opcional al eliminar con swipe.
class ExpenseTile extends StatelessWidget {
  const ExpenseTile({
    super.key,
    required this.expense,
    required this.groupId,
    required this.members,
    required this.onConfirm,
    required this.onDispute,
    this.onDelete,
  });

  final SharedExpense expense;
  final String groupId;
  final List<GroupMember> members;
  final VoidCallback onConfirm;
  final VoidCallback onDispute;
  final VoidCallback? onDelete;

  /// Resuelve el nombre del miembro a partir de su ID.
  /// @param memberId - UUID del miembro.
  /// @return Nombre del miembro, o "Miembro" si no se encuentra.
  String _memberName(String memberId) {
    final match = members.where((m) => m.id == memberId);
    return match.isNotEmpty ? match.first.displayName : 'Miembro';
  }

  /// Construye un chip de estado para una parte del gasto.
  /// @param context - Contexto del widget.
  /// @param share - Parte del gasto con su estado.
  /// @return Widget chip con color y etiqueta segun el estado.
  Widget _buildChip(BuildContext context, ExpenseShare share) {
    final theme = Theme.of(context);
    final name = _memberName(share.memberId);

    final Color backgroundColor;
    final Color labelColor;
    final String label;

    switch (share.status) {
      case ShareStatus.confirmed:
        backgroundColor = const Color(0xFF2E7D32).withValues(alpha: 0.12);
        labelColor = const Color(0xFF2E7D32);
        label = '$name: Confirmado';
      case ShareStatus.pending:
        backgroundColor = Colors.amber.withValues(alpha: 0.15);
        labelColor = Colors.amber.shade800;
        label = '$name: Pendiente';
      case ShareStatus.disputed:
        backgroundColor = theme.colorScheme.errorContainer;
        labelColor = theme.colorScheme.onErrorContainer;
        label = '$name: En disputa';
    }

    return Chip(
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
      labelPadding: const EdgeInsets.symmetric(horizontal: 4),
      backgroundColor: backgroundColor,
      side: BorderSide.none,
      label: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: labelColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        ListTile(
          leading: CircleAvatar(
            backgroundColor: theme.colorScheme.secondaryContainer,
            child: Icon(
              Icons.receipt_outlined,
              color: theme.colorScheme.onSecondaryContainer,
              size: 20,
            ),
          ),
          title: Text(
            expense.description?.isNotEmpty == true
                ? expense.description!
                : 'Gasto',
          ),
          subtitle: Text(expense.occurredOn),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                formatCop(expense.amount),
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              PopupMenuButton<_ExpenseAction>(
                tooltip: 'Acciones',
                onSelected: (action) {
                  if (action == _ExpenseAction.confirm) {
                    onConfirm();
                  } else {
                    onDispute();
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(
                    value: _ExpenseAction.confirm,
                    child: ListTile(
                      leading: Icon(Icons.check_circle_outline),
                      title: Text('Confirmar mi parte'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                  PopupMenuItem(
                    value: _ExpenseAction.dispute,
                    child: ListTile(
                      leading: Icon(Icons.report_problem_outlined),
                      title: Text('Refutar mi parte'),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (expense.shares.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              children: expense.shares
                  .map((s) => _buildChip(context, s))
                  .toList(),
            ),
          ),
      ],
    );

    if (onDelete == null) return content;

    return Dismissible(
      key: ValueKey(expense.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDelete!(),
      background: Container(
        alignment: Alignment.centerRight,
        color: theme.colorScheme.errorContainer,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(
          Icons.delete_outline,
          color: theme.colorScheme.onErrorContainer,
        ),
      ),
      child: content,
    );
  }
}

/// Acciones disponibles en el menu popup del gasto.
enum _ExpenseAction {
  /// Confirmar la parte asignada al usuario autenticado.
  confirm,

  /// Refutar la parte asignada al usuario autenticado.
  dispute,
}
