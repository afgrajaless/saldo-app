import 'package:flutter/material.dart';

import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/credit_card.dart';

/// Tile de tarjeta de credito con indicador de utilizacion y alerta de usura.
class CreditCardTile extends StatelessWidget {
  const CreditCardTile({
    super.key,
    required this.card,
    required this.onTap,
  });

  /// Tarjeta a mostrar.
  final CreditCard card;

  /// Callback al tocar el tile.
  final VoidCallback onTap;

  /// Retorna el color del indicador segun el nivel de utilizacion del cupo.
  /// - Verde: menor al 50%.
  /// - Naranja: entre el 50% y el 80%.
  /// - Rojo: 80% o mas.
  Color _utilizationColor() {
    final rate = card.utilizationRate;
    if (rate < 0.5) return Colors.green;
    if (rate < 0.8) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final utilization = card.utilizationRate;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: hexToColor(card.color),
        radius: 20,
        child: Text(
          card.name.isNotEmpty ? card.name[0].toUpperCase() : '?',
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      title: Text(card.name, style: theme.textTheme.bodyLarge),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: utilization.clamp(0.0, 1.0),
            color: _utilizationColor(),
            backgroundColor:
                theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(4),
            minHeight: 6,
          ),
          const SizedBox(height: 4),
          Text(
            'Usado: ${formatCop(card.usedAmount)} / ${formatCop(card.creditLimit)}',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            'Pago: ${card.paymentDueDate}',
            style: theme.textTheme.bodySmall,
          ),
          if (card.exceedsUsury) ...[
            const SizedBox(height: 4),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: theme.colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Alerta usura',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onErrorContainer,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
      isThreeLine: true,
    );
  }
}
