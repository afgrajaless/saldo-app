import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/api_exception.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/payment_result.dart';
import '../../domain/entities/register_payment_params.dart';
import '../providers/payments_controller.dart';

/// Pantalla para registrar un abono a capital (prepago) sobre una deuda.
class AbonoCapitalScreen extends ConsumerStatefulWidget {
  const AbonoCapitalScreen({super.key, required this.debtId});

  final String debtId;

  @override
  ConsumerState<AbonoCapitalScreen> createState() => _AbonoCapitalScreenState();
}

class _AbonoCapitalScreenState extends ConsumerState<AbonoCapitalScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String _mode = PrepaymentMode.reduceTerm;
  bool _submitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  /// Devuelve la fecha de hoy en formato YYYY-MM-DD.
  String _today() => DateTime.now().toIso8601String().substring(0, 10);

  /// Valida y envia el abono al backend, mostrando el resultado.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final params = RegisterPaymentParams(
      type: 'abono_capital',
      amount: double.parse(_amountController.text.replaceAll(',', '.')),
      paymentDate: _today(),
      mode: _mode,
    );

    try {
      final result =
          await ref.read(paymentsControllerProvider.notifier).register(widget.debtId, params);
      if (!mounted) return;
      await _showResult(result);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Muestra un dialogo con el resumen del recalculo del abono.
  Future<void> _showResult(PaymentResult result) async {
    final summary = result.prepayment;
    if (summary == null) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(summary.isPaidOff ? 'Deuda cancelada' : 'Abono aplicado'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _row('Abono aplicado', formatCop(summary.appliedExtraPayment)),
            _row('Nuevo saldo', formatCop(summary.newBalance)),
            _row('Intereses ahorrados', formatCop(summary.interestSaved)),
            _row('Cuotas restantes', '${summary.remainingInstallments}'),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  /// Fila etiqueta/valor para el dialogo de resultado.
  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Abono a capital')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                'Un abono extraordinario a capital recalcula tus cuotas pendientes '
                '(Ley 1555 de 2012, prepago sin sanción).',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                ],
                decoration: const InputDecoration(
                  labelText: 'Monto del abono',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                  if (n == null || n <= 0) return 'Ingresa un monto válido.';
                  return null;
                },
              ),
              const SizedBox(height: 20),
              Text('Modalidad', style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: prepaymentModeLabels.entries
                    .map((e) => ButtonSegment(value: e.key, label: Text(e.value)))
                    .toList(),
                selected: {_mode},
                onSelectionChanged: (selected) =>
                    setState(() => _mode = selected.first),
              ),
              const SizedBox(height: 8),
              Text(
                _mode == PrepaymentMode.reduceTerm
                    ? 'Conserva el valor de la cuota y termina de pagar en menos meses.'
                    : 'Conserva el plazo y baja el valor de cada cuota.',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 28),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Text('Aplicar abono'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
