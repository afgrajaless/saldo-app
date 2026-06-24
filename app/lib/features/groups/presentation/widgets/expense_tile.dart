import 'package:flutter/material.dart';

import '../../../../shared/money_format.dart';
import '../../domain/entities/shared_expense.dart';

/// Fila de un gasto compartido dentro de un grupo.
/// Muestra la descripcion (o "Gasto"), el monto y la fecha.
/// Soporta swipe-to-delete cuando se provee [onDelete].
/// @param expense - Gasto compartido a mostrar.
/// @param onDelete - Callback opcional al eliminar con swipe.
class ExpenseTile extends StatelessWidget {
  const ExpenseTile({
    super.key,
    required this.expense,
    this.onDelete,
  });

  final SharedExpense expense;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tile = ListTile(
      leading: CircleAvatar(
        backgroundColor: theme.colorScheme.secondaryContainer,
        child: Icon(
          Icons.receipt_outlined,
          color: theme.colorScheme.onSecondaryContainer,
          size: 20,
        ),
      ),
      title: Text(expense.description?.isNotEmpty == true
          ? expense.description!
          : 'Gasto'),
      subtitle: Text(expense.occurredOn),
      trailing: Text(
        formatCop(expense.amount),
        style: theme.textTheme.titleSmall?.copyWith(
          color: theme.colorScheme.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );

    if (onDelete == null) return tile;

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
      child: tile,
    );
  }
}
