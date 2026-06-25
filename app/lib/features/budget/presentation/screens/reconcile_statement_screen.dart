import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Pantalla para reconciliar el extracto de una tarjeta con los valores reales del banco.
///
/// Recibe [cardId] y [cutoffDate] del extracto actual. El usuario ingresa el
/// saldo real, el pago minimo oficial y opcionalmente el pago total ya realizado.
/// Al guardar, llama a [reconcileStatement] e invalida [cardStatementProvider].
class ReconcileStatementScreen extends ConsumerStatefulWidget {
  const ReconcileStatementScreen({
    super.key,
    required this.cardId,
    required this.cutoffDate,
  });

  /// UUID de la tarjeta.
  final String cardId;

  /// Fecha de corte del extracto (YYYY-MM-DD).
  final String cutoffDate;

  @override
  ConsumerState<ReconcileStatementScreen> createState() =>
      _ReconcileStatementScreenState();
}

class _ReconcileStatementScreenState
    extends ConsumerState<ReconcileStatementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _balanceCtrl = TextEditingController();
  final _minPaymentCtrl = TextEditingController();
  final _totalPaymentCtrl = TextEditingController();

  bool _saving = false;

  @override
  void dispose() {
    _balanceCtrl.dispose();
    _minPaymentCtrl.dispose();
    _totalPaymentCtrl.dispose();
    super.dispose();
  }

  /// Valida el formulario y llama al repositorio para reconciliar el extracto.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final balance = double.parse(_balanceCtrl.text.replaceAll(',', '.'));
    final minPayment =
        double.parse(_minPaymentCtrl.text.replaceAll(',', '.'));
    final totalText = _totalPaymentCtrl.text.trim();
    final totalPayment =
        totalText.isNotEmpty ? double.tryParse(totalText.replaceAll(',', '.')) : null;

    setState(() => _saving = true);
    try {
      await getIt<BudgetRepository>().reconcileStatement(
        widget.cardId,
        ReconcileStatementParams(
          cutoffDate: widget.cutoffDate,
          reconciledBalance: balance,
          reconciledMinPayment: minPayment,
          reconciledTotalPayment: totalPayment,
        ),
      );
      ref.invalidate(cardStatementProvider(widget.cardId));
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Reconciliar extracto')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ingresa los valores tal como aparecen en el extracto del banco.',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              // Etiqueta de la fecha de corte (solo informativa).
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_month_outlined,
                        size: 16,
                        color: theme.colorScheme.onSurfaceVariant),
                    const SizedBox(width: 8),
                    Text(
                      'Corte: ${widget.cutoffDate}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Campo: saldo real del extracto.
              TextFormField(
                controller: _balanceCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                ],
                decoration: const InputDecoration(
                  labelText: 'Saldo del extracto *',
                  helperText: 'Monto total adeudado segun el banco',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Ingresa el saldo del extracto';
                  }
                  if (double.tryParse(v.replaceAll(',', '.')) == null) {
                    return 'Valor invalido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Campo: pago minimo oficial.
              TextFormField(
                controller: _minPaymentCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                ],
                decoration: const InputDecoration(
                  labelText: 'Pago minimo oficial *',
                  helperText: 'Pago minimo que indica el extracto del banco',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Ingresa el pago minimo';
                  }
                  if (double.tryParse(v.replaceAll(',', '.')) == null) {
                    return 'Valor invalido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Campo: pago total realizado (opcional).
              TextFormField(
                controller: _totalPaymentCtrl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                ],
                decoration: const InputDecoration(
                  labelText: 'Pago total realizado (opcional)',
                  helperText:
                      'Deja vacio si aun no has realizado el pago de este ciclo',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v != null && v.trim().isNotEmpty) {
                    if (double.tryParse(v.replaceAll(',', '.')) == null) {
                      return 'Valor invalido';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _saving ? null : _submit,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: Text(_saving ? 'Guardando...' : 'Reconciliar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
