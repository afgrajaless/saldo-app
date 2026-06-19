import 'package:flutter/material.dart';

import '../../../../shared/enum_labels.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/debt.dart';

/// Tarjeta que resume una obligacion en la lista.
class DebtCard extends StatelessWidget {
  const DebtCard({super.key, required this.debt, required this.onTap});

  final Debt debt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(Icons.request_quote_outlined,
              color: theme.colorScheme.onPrimaryContainer),
        ),
        title: Text(debt.creditor,
            style: theme.textTheme.titleMedium,
            maxLines: 1,
            overflow: TextOverflow.ellipsis),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(labelOf(debtTypeLabels, debt.debtType),
                style: theme.textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(
              '${formatCop(debt.principalAmount)}  ·  ${formatPercent(debt.effectiveAnnualRate)} E.A.',
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        trailing: _StatusChip(status: debt.status),
      ),
    );
  }
}

/// Chip de estado de la deuda con color segun el estado.
class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (Color bg, Color fg) = switch (status) {
      'pagada' => (scheme.secondaryContainer, scheme.onSecondaryContainer),
      'en_mora' => (scheme.errorContainer, scheme.onErrorContainer),
      _ => (scheme.tertiaryContainer, scheme.onTertiaryContainer),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Text(labelOf(debtStatusLabels, status),
          style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}
