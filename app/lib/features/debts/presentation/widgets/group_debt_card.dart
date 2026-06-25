import 'package:flutter/material.dart';

import '../../../../features/groups/domain/entities/group.dart';
import '../../../../features/groups/domain/entities/group_debt_summary.dart';
import '../../../../features/groups/presentation/screens/group_detail_screen.dart';
import '../../../../shared/money_format.dart';

/// Tarjeta de deuda compartida en la pantalla principal de Deudas.
/// Muestra el acreedor, el nombre del grupo, el monto adeudado
/// y, si hay partes sin confirmar, un indicador ambar con el monto pendiente.
/// Al tocar, navega al detalle del grupo.
/// @param summary - Resumen de la deuda del usuario en el grupo.
class GroupDebtCard extends StatelessWidget {
  const GroupDebtCard({super.key, required this.summary});

  final GroupDebtSummary summary;

  /// Construye un Group minimo a partir del resumen para abrir el detalle.
  /// createdAt se deja vacio porque GroupDetailScreen no lo muestra.
  Group _buildGroup() => Group(
        id: summary.groupId,
        name: summary.groupName,
        createdAt: '',
      );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasPending = summary.hasPending;

    // Color de fondo: ambar suave si hay partes pendientes, superficie normal si no.
    final cardColor = hasPending
        ? Colors.amber.shade50
        : theme.colorScheme.surfaceContainerLow;

    final borderColor = hasPending ? Colors.amber.shade400 : Colors.transparent;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: borderColor, width: 1.5),
      ),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => GroupDetailScreen(group: _buildGroup()),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              // Icono de grupo
              CircleAvatar(
                radius: 22,
                backgroundColor: hasPending
                    ? Colors.amber.shade100
                    : theme.colorScheme.secondaryContainer,
                child: Icon(
                  Icons.group_outlined,
                  size: 22,
                  color: hasPending
                      ? Colors.amber.shade800
                      : theme.colorScheme.onSecondaryContainer,
                ),
              ),
              const SizedBox(width: 14),

              // Nombre acreedor y grupo
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Le debes a ${summary.creditorName}',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      summary.groupName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (hasPending) ...[
                      const SizedBox(height: 4),
                      // Etiqueta "sin confirmar" con el monto pendiente
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade200,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.pending_outlined,
                              size: 12,
                              color: Colors.amber.shade900,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Sin confirmar · ${formatCop(summary.pendingAmount)}',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.amber.shade900,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Monto total adeudado
              Text(
                formatCop(summary.amountOwed),
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
