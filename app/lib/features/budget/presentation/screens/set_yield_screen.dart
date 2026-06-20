import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Pantalla para configurar el rendimiento de una cuenta (remunerada o CDT).
class SetYieldScreen extends ConsumerStatefulWidget {
  const SetYieldScreen({super.key, required this.account});

  final Account account;

  @override
  ConsumerState<SetYieldScreen> createState() => _SetYieldScreenState();
}

class _SetYieldScreenState extends ConsumerState<SetYieldScreen> {
  final _formKey = GlobalKey<FormState>();
  final _rateController = TextEditingController();
  final _principalController = TextEditingController();
  final _termController = TextEditingController();
  String _yieldType = 'none';
  late DateTime _openedOn;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _openedOn = DateTime.now();
    _yieldType = widget.account.yieldType;
    final rate = widget.account.effectiveAnnualRate;
    if (rate != null) _rateController.text = (rate * 100).toStringAsFixed(2);
  }

  @override
  void dispose() {
    _rateController.dispose();
    _principalController.dispose();
    _termController.dispose();
    super.dispose();
  }

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Abre el selector de fecha de apertura del CDT.
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _openedOn,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _openedOn = picked);
  }

  /// Valida y guarda la configuracion de rendimiento.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final rate = _yieldType == 'none'
        ? null
        : double.parse(_rateController.text.replaceAll(',', '.')) / 100;
    final params = SetYieldParams(
      yieldType: _yieldType,
      effectiveAnnualRate: rate,
      principal: _yieldType == 'cdt'
          ? double.parse(_principalController.text.replaceAll(',', '.'))
          : null,
      openedOn: _yieldType == 'cdt' ? _formatDate(_openedOn) : null,
      termDays: _yieldType == 'cdt' ? int.parse(_termController.text) : null,
    );

    try {
      await getIt<BudgetRepository>().setAccountYield(widget.account.id, params);
      ref.invalidate(accountsListProvider);
      ref.invalidate(accountProjectionProvider(widget.account.id));
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isCdt = _yieldType == 'cdt';
    final hasYield = _yieldType != 'none';
    return Scaffold(
      appBar: AppBar(title: Text('Rendimiento · ${widget.account.name}')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'none', label: Text('Ninguno')),
                  ButtonSegment(value: 'savings', label: Text('Remunerada')),
                  ButtonSegment(value: 'cdt', label: Text('CDT')),
                ],
                selected: {_yieldType},
                onSelectionChanged: (s) => setState(() => _yieldType = s.first),
              ),
              const SizedBox(height: 20),
              if (hasYield)
                TextFormField(
                  controller: _rateController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                  decoration: const InputDecoration(
                    labelText: 'Tasa de rendimiento',
                    suffixText: '% E.A.',
                    border: OutlineInputBorder(),
                    helperText: 'Ej. 11.25 para una cuenta al 11.25% efectivo anual',
                  ),
                  validator: (v) {
                    if (!hasYield) return null;
                    final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                    if (n == null || n < 0) return 'Ingresa una tasa valida.';
                    return null;
                  },
                ),
              if (isCdt) ...[
                const SizedBox(height: 16),
                TextFormField(
                  controller: _principalController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                  decoration: const InputDecoration(
                    labelText: 'Capital invertido',
                    prefixText: '\$ ',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) {
                    if (!isCdt) return null;
                    final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                    if (n == null || n <= 0) return 'Ingresa el capital.';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _termController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Plazo (dias)',
                    border: OutlineInputBorder(),
                    helperText: 'Ej. 90, 180, 360',
                  ),
                  validator: (v) {
                    if (!isCdt) return null;
                    final n = int.tryParse(v ?? '');
                    if (n == null || n <= 0) return 'Ingresa el plazo en dias.';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                InkWell(
                  onTap: _pickDate,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Fecha de apertura',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today_outlined),
                    ),
                    child: Text(_formatDate(_openedOn)),
                  ),
                ),
                const SizedBox(height: 8),
                Text('La retencion en la fuente del 4% se aplica automaticamente.',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : const Text('Guardar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
