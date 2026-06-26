import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/money_format.dart';
import '../../domain/entities/usury_evaluation.dart';
import '../providers/usury_evaluation_provider.dart';

/// Badge que muestra si la tasa de la deuda esta dentro del tope de usura.
class UsuryBadge extends ConsumerWidget {
  const UsuryBadge({super.key, required this.debtId});

  final String debtId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final evalAsync = ref.watch(usuryEvaluationProvider(debtId));
    return evalAsync.when(
      loading: () => const SizedBox(
        height: 64,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, __) => const _NeutralBadge(
        message: 'No se pudo evaluar la usura.',
      ),
      data: (evaluation) => evaluation == null
          ? const _NeutralBadge(
              message: 'Sin tope de usura registrado para esta modalidad y fecha.',
            )
          : _ResultBadge(evaluation: evaluation),
    );
  }
}

/// Badge con el resultado de la evaluacion (verde legal / rojo usura).
class _ResultBadge extends StatelessWidget {
  const _ResultBadge({required this.evaluation});

  final UsuryEvaluation evaluation;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final theme = Theme.of(context);
    final usurious = evaluation.isUsurious;

    final bg = usurious ? scheme.errorContainer : scheme.tertiaryContainer;
    final fg = usurious ? scheme.onErrorContainer : scheme.onTertiaryContainer;
    final icon = usurious ? Icons.gpp_bad_outlined : Icons.verified_user_outlined;
    final title = usurious ? 'Tasa usuraria' : 'Dentro del límite legal';
    final usage = evaluation.usagePercentage.toStringAsFixed(1).replaceAll('.', ',');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(icon, color: fg, size: 32),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: theme.textTheme.titleMedium
                        ?.copyWith(color: fg, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(
                  usurious
                      ? 'Supera el tope vigente de ${formatPercent(evaluation.usuryCap)} E.A.'
                      : 'Usa el $usage% del tope (${formatPercent(evaluation.usuryCap)} E.A.).',
                  style: theme.textTheme.bodyMedium?.copyWith(color: fg),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Badge neutro para cuando no se puede evaluar.
class _NeutralBadge extends StatelessWidget {
  const _NeutralBadge({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: scheme.onSurfaceVariant),
          const SizedBox(width: 14),
          Expanded(
            child: Text(message,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: scheme.onSurfaceVariant)),
          ),
        ],
      ),
    );
  }
}
