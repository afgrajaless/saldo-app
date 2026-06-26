import 'package:flutter/material.dart';

import '../../../../shared/money_format.dart';
import '../../domain/entities/card_installment.dart';

/// Tarjeta expandible que muestra un plan diferido con su cronograma de cuotas.
class InstallmentPlanCard extends StatefulWidget {
  const InstallmentPlanCard({super.key, required this.plan});

  /// Plan diferido a mostrar.
  final CardInstallmentPlan plan;

  @override
  State<InstallmentPlanCard> createState() => _InstallmentPlanCardState();
}

class _InstallmentPlanCardState extends State<InstallmentPlanCard> {
  /// Controla si el cronograma esta expandido.
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final plan = widget.plan;
    final label = plan.description?.isNotEmpty == true
        ? plan.description!
        : 'Diferido sin descripción';
    final pct = (plan.monthlyRate * 100).toStringAsFixed(2).replaceAll('.', ',');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerLow,
      child: Column(
        children: [
          // Encabezado del plan.
          InkWell(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Icon(Icons.credit_card_outlined,
                        size: 18,
                        color: theme.colorScheme.onPrimaryContainer),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label,
                            style: theme.textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(
                          '${formatCop(plan.principal)} · ${plan.numberOfInstallments} cuotas · $pct % M.V.',
                          style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.expand_less : Icons.expand_more,
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
          // Cronograma expandible.
          if (_expanded) ...[
            const Divider(height: 1),
            _ScheduleTable(items: plan.items),
          ],
        ],
      ),
    );
  }
}

/// Tabla con el cronograma de cuotas de un plan.
class _ScheduleTable extends StatelessWidget {
  const _ScheduleTable({required this.items});

  final List<CardInstallmentItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Encabezado de columnas.
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _header(context, '#', flex: 1),
              _header(context, 'Fecha', flex: 3),
              _header(context, 'Capital', flex: 3),
              _header(context, 'Interés', flex: 3),
              _header(context, 'Saldo', flex: 3),
            ],
          ),
        ),
        const Divider(height: 1),
        // Filas por cuota.
        for (final item in items)
          Container(
            color: item.number.isOdd
                ? Colors.transparent
                : theme.colorScheme.surfaceContainerLowest,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: Row(
                children: [
                  _cell(context, '${item.number}', flex: 1),
                  _cell(context, _shortDate(item.dueOn), flex: 3),
                  _cell(context, formatCop(item.principal), flex: 3),
                  _cell(context, formatCop(item.interest), flex: 3),
                  _cell(context, formatCop(item.balance), flex: 3,
                      bold: true),
                ],
              ),
            ),
          ),
        const SizedBox(height: 8),
      ],
    );
  }

  /// Encabezado de columna.
  Widget _header(BuildContext context, String text, {required int flex}) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
    );
  }

  /// Celda de datos.
  Widget _cell(BuildContext context, String text,
      {required int flex, bool bold = false}) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
            ),
      ),
    );
  }

  /// Abrevia una fecha YYYY-MM-DD a MMM-YY.
  String _shortDate(String iso) {
    final parts = iso.split('-');
    if (parts.length < 2) return iso;
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    final m = int.tryParse(parts[1]);
    final y = parts[0].length >= 4 ? parts[0].substring(2) : parts[0];
    if (m == null || m < 1 || m > 12) return iso;
    return '${months[m - 1]} $y';
  }
}
