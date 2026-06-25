import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/card_statement.dart';
import '../../domain/entities/credit_card.dart';
import '../providers/budget_providers.dart';
import '../widgets/installment_plan_card.dart';
import 'reconcile_statement_screen.dart';

/// Pantalla de detalle de una tarjeta de credito.
///
/// Muestra tres secciones:
/// 1. Extracto del ciclo actual (estimado y reconciliado si aplica).
/// 2. Planes diferidos activos con su cronograma.
/// 3. Datos de configuracion de la tarjeta (cupo, dias, tasa).
class CardDetailScreen extends ConsumerStatefulWidget {
  const CardDetailScreen({super.key, required this.card});

  /// Tarjeta cuyo detalle se muestra.
  final CreditCard card;

  @override
  ConsumerState<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends ConsumerState<CardDetailScreen> {
  /// Recarga los providers del extracto y los diferidos.
  Future<void> _refresh() async {
    ref.invalidate(cardStatementProvider(widget.card.id));
    ref.invalidate(cardInstallmentsProvider(widget.card.id));
    // Esperamos los nuevos futures para que el RefreshIndicator se complete.
    // Ignoramos errores: cada seccion los muestra de forma independiente.
    try {
      await Future.wait([
        ref.read(cardStatementProvider(widget.card.id).future),
        ref.read(cardInstallmentsProvider(widget.card.id).future),
      ]);
    } catch (_) {
      // Los errores se muestran dentro de cada seccion.
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final card = widget.card;

    return Scaffold(
      appBar: AppBar(
        title: Text(card.name),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Encabezado visual de la tarjeta.
            _CardHeader(card: card),
            const SizedBox(height: 24),
            // Seccion: extracto del ciclo.
            Text('Extracto del ciclo', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            _StatementSection(card: card),
            const SizedBox(height: 24),
            // Seccion: diferidos activos.
            Text('Diferidos activos', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            _InstallmentsSection(cardId: card.id),
            const SizedBox(height: 24),
            // Seccion: datos de configuracion.
            Text('Configuracion', style: theme.textTheme.titleMedium),
            const SizedBox(height: 12),
            _CardConfigSection(card: card),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Encabezado visual
// ---------------------------------------------------------------------------

/// Encabezado con color de la tarjeta, nombre y barra de utilizacion.
class _CardHeader extends StatelessWidget {
  const _CardHeader({required this.card});

  final CreditCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final utilization = card.utilizationRate.clamp(0.0, 1.0);
    final color = hexToColor(card.color);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: color,
                child: Text(
                  card.name.isNotEmpty ? card.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(card.name,
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    Text(
                      'Disponible: ${formatCop(card.available)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              if (card.exceedsUsury)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Alerta usura',
                    style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onErrorContainer,
                        fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: utilization,
            color: _utilizationColor(card.utilizationRate),
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(4),
            minHeight: 8,
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Usado: ${formatCop(card.usedAmount)}',
                style: theme.textTheme.bodySmall,
              ),
              Text(
                'Cupo: ${formatCop(card.creditLimit)}',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Color del indicador segun nivel de utilizacion.
  Color _utilizationColor(double rate) {
    if (rate < 0.5) return Colors.green;
    if (rate < 0.8) return Colors.orange;
    return Colors.red;
  }
}

// ---------------------------------------------------------------------------
// Extracto del ciclo
// ---------------------------------------------------------------------------

/// Seccion que muestra el extracto estimado y reconciliado del ciclo actual.
class _StatementSection extends ConsumerWidget {
  const _StatementSection({required this.card});

  final CreditCard card;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statementAsync = ref.watch(cardStatementProvider(card.id));

    return statementAsync.when(
      loading: () => const SizedBox(
          height: 100, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => Text('No se pudo cargar el extracto: $e',
          style: TextStyle(color: Theme.of(context).colorScheme.error)),
      data: (statement) => _StatementCard(card: card, statement: statement),
    );
  }
}

/// Tarjeta con los datos del extracto (estimado + reconciliado si aplica).
class _StatementCard extends StatelessWidget {
  const _StatementCard({required this.card, required this.statement});

  final CreditCard card;
  final CardStatement statement;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fechas del ciclo.
          Row(
            children: [
              _InfoChip(label: 'Corte', value: statement.cutoffDate),
              const SizedBox(width: 12),
              _InfoChip(label: 'Pago', value: statement.paymentDueDate),
              const Spacer(),
              _StatusBadge(status: statement.status),
            ],
          ),
          const SizedBox(height: 16),
          // Valores estimados.
          Text('Estimado',
              style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          _row(context, 'Saldo estimado', formatCop(statement.estimatedBalance)),
          _row(context, 'Pago minimo estimado',
              formatCop(statement.estimatedMinPayment)),
          // Valores reconciliados (solo si ya se reconcilio).
          if (statement.isReconciled) ...[
            const Divider(height: 20),
            Text('Reconciliado con extracto',
                style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (statement.reconciledBalance != null)
              _row(context, 'Saldo real',
                  formatCop(statement.reconciledBalance!),
                  bold: true),
            if (statement.reconciledMinPayment != null)
              _row(context, 'Pago minimo real',
                  formatCop(statement.reconciledMinPayment!)),
            if (statement.reconciledTotalPayment != null)
              _row(context, 'Pago total realizado',
                  formatCop(statement.reconciledTotalPayment!)),
          ],
          const SizedBox(height: 16),
          // Boton de reconciliacion.
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ReconcileStatementScreen(
                    cardId: card.id,
                    cutoffDate: statement.cutoffDate,
                  ),
                ),
              ),
              icon: const Icon(Icons.sync_alt, size: 18),
              label: Text(statement.isReconciled
                  ? 'Actualizar reconciliacion'
                  : 'Reconciliar con extracto'),
            ),
          ),
        ],
      ),
    );
  }

  /// Fila etiqueta/valor.
  Widget _row(BuildContext context, String label, String value,
      {bool bold = false}) {
    final base = Theme.of(context).textTheme.bodyMedium;
    final style = bold ? base?.copyWith(fontWeight: FontWeight.w600) : base;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [Text(label, style: style), Text(value, style: style)],
      ),
    );
  }
}

/// Chip compacto con etiqueta y valor.
class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: theme.textTheme.labelSmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        Text(value, style: theme.textTheme.bodySmall),
      ],
    );
  }
}

/// Badge con el estado del extracto.
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color bg;
    final String label;
    switch (status) {
      case 'paid':
        bg = Colors.green.shade100;
        label = 'Pagado';
      case 'closed':
        bg = Colors.orange.shade100;
        label = 'Cerrado';
      default:
        bg = theme.colorScheme.primaryContainer;
        label = 'Abierto';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
          color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: theme.textTheme.labelSmall),
    );
  }
}

// ---------------------------------------------------------------------------
// Diferidos
// ---------------------------------------------------------------------------

/// Seccion con los planes diferidos activos de la tarjeta.
class _InstallmentsSection extends ConsumerWidget {
  const _InstallmentsSection({required this.cardId});

  final String cardId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final installmentsAsync = ref.watch(cardInstallmentsProvider(cardId));

    return installmentsAsync.when(
      loading: () => const SizedBox(
          height: 80, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => Text('No se pudieron cargar los diferidos: $e',
          style: TextStyle(color: Theme.of(context).colorScheme.error)),
      data: (plans) {
        if (plans.isEmpty) return const _EmptyInstallments();
        return Column(
          children: [
            for (final plan in plans) InstallmentPlanCard(plan: plan),
          ],
        );
      },
    );
  }
}

/// Estado vacio cuando no hay planes diferidos.
class _EmptyInstallments extends StatelessWidget {
  const _EmptyInstallments();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline,
              color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 12),
          Text(
            'No tienes compras diferidas activas.',
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Configuracion
// ---------------------------------------------------------------------------

/// Seccion con los parametros de configuracion de la tarjeta.
class _CardConfigSection extends StatelessWidget {
  const _CardConfigSection({required this.card});

  final CreditCard card;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pct =
        (card.rotativoRateEa * 100).toStringAsFixed(2).replaceAll('.', ',');
    final minPct =
        (card.minPaymentPct * 100).toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          _configRow(context, Icons.credit_score_outlined, 'Cupo total',
              formatCop(card.creditLimit)),
          _configRow(context, Icons.today_outlined, 'Dia de corte',
              'Dia ${card.statementDay}'),
          _configRow(context, Icons.payment_outlined, 'Dia de pago',
              'Dia ${card.paymentDay}'),
          _configRow(context, Icons.percent_outlined,
              'Tasa rotativa E.A.', '$pct %'),
          _configRow(context, Icons.account_balance_wallet_outlined,
              'Pago minimo', '$minPct % del saldo'),
          if (card.managementFee != null &&
              card.managementFeePeriod != 'none') ...[
            _configRow(
              context,
              Icons.receipt_outlined,
              'Cuota de manejo',
              '${formatCop(card.managementFee!)} · ${_periodLabel(card.managementFeePeriod)}',
            ),
          ],
        ],
      ),
    );
  }

  /// Fila de configuracion con icono, etiqueta y valor.
  Widget _configRow(
      BuildContext context, IconData icon, String label, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 12),
          Expanded(
              child: Text(label, style: theme.textTheme.bodyMedium)),
          Text(value,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  /// Traduce el periodo de la cuota de manejo a texto legible.
  String _periodLabel(String period) {
    switch (period) {
      case 'monthly':
        return 'mensual';
      case 'annual':
        return 'anual';
      default:
        return period;
    }
  }
}
