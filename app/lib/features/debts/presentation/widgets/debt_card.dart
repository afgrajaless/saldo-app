import 'package:flutter/material.dart';

import '../../../../shared/enum_labels.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/debt.dart';

/// Tarjeta que resume una obligacion en la lista.
class DebtCard extends StatelessWidget {
  const DebtCard({
    super.key,
    required this.debt,
    required this.onTap,
    this.isPriority = false,
    this.priorityLabel,
    this.isLinked = false,
  });

  final Debt debt;
  final VoidCallback onTap;

  /// Si es la deuda recomendada para pagar primero (resalta la tarjeta).
  final bool isPriority;

  /// Motivo por el que es prioridad (ej. "Tasa mas alta"); null si no aplica.
  final String? priorityLabel;

  /// Indica si la deuda fue sincronizada via Open Finance (solo lectura).
  final bool isLinked;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalInstallments = debt.paidInstallments + debt.remainingInstallments;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: isPriority
          ? RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: theme.colorScheme.primary, width: 1.5),
            )
          : null,
      child: Column(
        children: [
          if (isPriority) _PriorityBanner(label: priorityLabel),
          ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
                  '${formatCop(debt.currentBalance)}  ·  ${formatPercent(debt.effectiveAnnualRate)} E.A.',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  'Cuota ${formatCop(debt.monthlyPayment)}  ·  ${debt.paidInstallments}/$totalInstallments cuotas',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            trailing: isLinked ? const _LinkedBadge() : _StatusChip(status: debt.status),
          ),
        ],
      ),
    );
  }
}

/// Banda superior que marca la deuda recomendada para pagar primero.
class _PriorityBanner extends StatelessWidget {
  const _PriorityBanner({this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.primary,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
      ),
      child: Row(
        children: [
          Icon(Icons.flag, size: 16, color: scheme.onPrimary),
          const SizedBox(width: 6),
          Text(
            label == null ? 'Paga primero' : 'Paga primero · $label',
            style: TextStyle(
                color: scheme.onPrimary,
                fontSize: 12,
                fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

/// Badge indicador de deuda vinculada via Open Finance (solo lectura).
class _LinkedBadge extends StatelessWidget {
  const _LinkedBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.blueGrey.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.lock_outline, size: 12),
        SizedBox(width: 4),
        Text('Vinculado', style: TextStyle(fontSize: 11)),
      ]),
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
