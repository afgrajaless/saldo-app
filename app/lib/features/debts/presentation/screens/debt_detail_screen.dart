import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/api_exception.dart';
import '../../../../shared/enum_labels.dart';
import '../../../../shared/money_format.dart';
import '../../../payments/domain/entities/register_payment_params.dart';
import '../../../payments/presentation/providers/payments_controller.dart';
import '../../../payments/presentation/screens/abono_capital_screen.dart';
import '../../../usury/presentation/widgets/usury_badge.dart';
import '../../domain/entities/debt_detail.dart';
import '../../domain/entities/installment.dart';
import '../providers/debt_detail_provider.dart';

/// Detalle de una deuda: resumen, distribucion capital/interes y cronograma,
/// con acciones de pago de cuota y abono a capital.
class DebtDetailScreen extends ConsumerWidget {
  const DebtDetailScreen({super.key, required this.debtId});

  final String debtId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(debtDetailProvider(debtId));

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle de la deuda')),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('$error', textAlign: TextAlign.center),
          ),
        ),
        data: (detail) => _DetailBody(debtId: debtId, detail: detail),
      ),
    );
  }
}

/// Cuerpo del detalle con resumen, acciones y lista de cuotas.
class _DetailBody extends ConsumerWidget {
  const _DetailBody({required this.debtId, required this.detail});

  final String debtId;
  final DebtDetail detail;

  /// Registra el pago de una cuota tras confirmar.
  /// @param context - Contexto de la pantalla.
  /// @param ref - Referencia de Riverpod.
  /// @param installment - Cuota a pagar.
  Future<void> _payInstallment(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Pagar cuota #${installment.number}'),
        content: Text('Registrar el pago de ${formatCop(installment.totalAmount)}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancelar')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Pagar')),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(paymentsControllerProvider.notifier).register(
            debtId,
            RegisterPaymentParams(
              type: 'regular',
              amount: installment.totalAmount,
              paymentDate: DateTime.now().toIso8601String().substring(0, 10),
              installmentId: installment.id,
            ),
          );
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Pago registrado.')));
      }
    } on ApiException catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final debt = detail.debt;
    final theme = Theme.of(context);
    final canAbonar = detail.installments.isNotEmpty;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(debt.creditor, style: theme.textTheme.headlineSmall),
        Text(labelOf(debtTypeLabels, debt.debtType),
            style: theme.textTheme.bodyMedium
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 16),
        _SummaryGrid(detail: detail),
        const SizedBox(height: 16),
        UsuryBadge(debtId: debtId),
        const SizedBox(height: 16),
        if (canAbonar)
          FilledButton.tonalIcon(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => AbonoCapitalScreen(debtId: debtId),
              ),
            ),
            icon: const Icon(Icons.savings_outlined),
            label: const Text('Abono a capital'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        const SizedBox(height: 20),
        Text('Capital vs. interes', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        _CapitalInterestBar(
          principal: debt.principalAmount,
          interest: detail.totalInterest,
        ),
        const SizedBox(height: 24),
        Text('Cronograma (${detail.installments.length} cuotas)',
            style: theme.textTheme.titleMedium),
        const SizedBox(height: 4),
        if (detail.installments.isNotEmpty)
          Text('Toca una cuota pendiente para registrar su pago.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
        const SizedBox(height: 8),
        ...detail.installments.map(
          (i) => _InstallmentTile(
            installment: i,
            onPay: i.status == 'pendiente'
                ? () => _payInstallment(context, ref, i)
                : null,
          ),
        ),
      ],
    );
  }
}

/// Cuadricula con los datos clave del credito.
class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.detail});

  final DebtDetail detail;

  @override
  Widget build(BuildContext context) {
    final debt = detail.debt;
    final items = <(String, String)>[
      ('Capital', formatCop(debt.principalAmount)),
      ('Tasa E.A.', formatPercent(debt.effectiveAnnualRate)),
      ('Sistema', labelOf(amortizationSystemLabels, debt.amortizationSystem)),
      ('Plazo', '${debt.termMonths} meses'),
      ('Total interes', formatCop(detail.totalInterest)),
      if (detail.totalInsurance > 0) ('Total seguro', formatCop(detail.totalInsurance)),
      ('Total a pagar', formatCop(detail.totalPaid)),
    ];
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: items
          .map((item) => _SummaryCell(label: item.$1, value: item.$2))
          .toList(),
    );
  }
}

/// Celda de resumen (etiqueta + valor).
class _SummaryCell extends StatelessWidget {
  const _SummaryCell({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = (MediaQuery.of(context).size.width - 16 * 2 - 12) / 2;
    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: theme.textTheme.labelMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 4),
          Text(value,
              style:
                  theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Barra apilada que muestra la proporcion capital vs interes.
class _CapitalInterestBar extends StatelessWidget {
  const _CapitalInterestBar({required this.principal, required this.interest});

  final double principal;
  final double interest;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = principal + interest;
    final principalFlex = total == 0 ? 1 : (principal / total * 1000).round();
    final interestFlex = total == 0 ? 1 : (interest / total * 1000).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Row(
            children: [
              Expanded(
                flex: principalFlex,
                child: Container(height: 24, color: theme.colorScheme.primary),
              ),
              Expanded(
                flex: interestFlex,
                child: Container(height: 24, color: theme.colorScheme.tertiary),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _Legend(color: theme.colorScheme.primary, label: 'Capital ${formatCop(principal)}'),
            const SizedBox(width: 16),
            _Legend(color: theme.colorScheme.tertiary, label: 'Interes ${formatCop(interest)}'),
          ],
        ),
      ],
    );
  }
}

/// Leyenda de color para la barra.
class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Flexible(child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
      ],
    );
  }
}

/// Fila de una cuota del cronograma; pulsable si esta pendiente.
class _InstallmentTile extends StatelessWidget {
  const _InstallmentTile({required this.installment, this.onPay});

  final Installment installment;
  final VoidCallback? onPay;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPaid = installment.status == 'pagada';
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        onTap: onPay,
        leading: CircleAvatar(
          backgroundColor: isPaid
              ? theme.colorScheme.secondaryContainer
              : theme.colorScheme.surfaceContainerHighest,
          child: isPaid
              ? Icon(Icons.check, color: theme.colorScheme.onSecondaryContainer)
              : Text('${installment.number}'),
        ),
        title: Text(formatCop(installment.totalAmount),
            style: theme.textTheme.titleSmall),
        subtitle: Text(
          'Vence ${installment.dueDate}\n'
          'Capital ${formatCop(installment.principalPortion)} · Interes ${formatCop(installment.interestPortion)}'
          '${installment.insurancePortion > 0 ? ' · Seguro ${formatCop(installment.insurancePortion)}' : ''}',
        ),
        isThreeLine: true,
        trailing: Text(
          isPaid ? 'Pagada' : 'Saldo\n${formatCop(installment.remainingBalance)}',
          textAlign: TextAlign.right,
          style: theme.textTheme.bodySmall,
        ),
      ),
    );
  }
}
