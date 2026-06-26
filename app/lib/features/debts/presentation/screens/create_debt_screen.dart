import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/enum_labels.dart';
import '../../../usury/domain/entities/usury_evaluation.dart';
import '../../../usury/domain/repositories/usury_repository.dart';
import '../../domain/entities/create_debt_params.dart';
import '../providers/debts_controller.dart';

/// Formulario para crear una nueva obligacion.
class CreateDebtScreen extends ConsumerStatefulWidget {
  const CreateDebtScreen({super.key});

  @override
  ConsumerState<CreateDebtScreen> createState() => _CreateDebtScreenState();
}

class _CreateDebtScreenState extends ConsumerState<CreateDebtScreen> {
  final _formKey = GlobalKey<FormState>();
  final _creditorController = TextEditingController();
  final _principalController = TextEditingController();
  final _rateController = TextEditingController();
  final _termController = TextEditingController();
  final _insuranceController = TextEditingController();

  String _debtType = 'libre_inversion';
  String _rateType = 'mv';
  String _amortizationSystem = 'frances';
  String _insuranceMode = 'none';
  bool _dailyInterest = false;
  late DateTime _startDate;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _startDate = DateTime.now();
  }

  @override
  void dispose() {
    _creditorController.dispose();
    _principalController.dispose();
    _rateController.dispose();
    _termController.dispose();
    _insuranceController.dispose();
    super.dispose();
  }

  /// Formatea una fecha como YYYY-MM-DD.
  String _formatDate(DateTime date) {
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '${date.year}-$m-$d';
  }

  /// Abre el selector de fecha de inicio.
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  /// Valida y envia el formulario al backend.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final insuranceValue = _resolveInsuranceValue();
    if (_insuranceMode != 'none' && insuranceValue == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Ingresa el valor del seguro.')));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final params = CreateDebtParams(
      creditor: _creditorController.text.trim(),
      debtType: _debtType,
      principalAmount: double.parse(_principalController.text.replaceAll(',', '.')),
      // El usuario ingresa porcentaje; el backend espera fraccion decimal.
      nominalRate: double.parse(_rateController.text.replaceAll(',', '.')) / 100,
      rateType: _rateType,
      amortizationSystem: _amortizationSystem,
      termMonths: int.parse(_termController.text),
      startDate: _formatDate(_startDate),
      interestMode: _dailyInterest ? 'daily' : 'monthly',
      insuranceMode: _insuranceMode,
      insuranceValue: insuranceValue,
    );

    try {
      // Si la tasa supera el tope de usura, advertir y pedir confirmacion.
      if (!await _confirmIfUsurious(params)) return;
      await ref.read(debtsControllerProvider.notifier).createDebt(params);
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Deuda creada con su cronograma.')),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Si la tasa supera el tope de usura vigente, muestra una advertencia y pide
  /// confirmacion. Es best-effort: si no se puede evaluar (sin tope o falla de
  /// red), no bloquea la creacion.
  /// @param params - Datos de la deuda a crear.
  /// @return true si se debe continuar creando la deuda.
  Future<bool> _confirmIfUsurious(CreateDebtParams params) async {
    UsuryEvaluation? evaluation;
    try {
      evaluation = await getIt<UsuryRepository>().evaluateRate(
        rate: params.nominalRate,
        rateType: params.rateType,
        debtType: params.debtType,
      );
    } on Object {
      return true; // no se pudo evaluar: continuar sin bloquear
    }
    if (evaluation == null || !evaluation.isUsurious || !mounted) return true;

    final cap = (evaluation.usuryCap * 100).toStringAsFixed(2);
    final rate = (evaluation.effectiveAnnualRate * 100).toStringAsFixed(2);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: Icon(Icons.warning_amber_rounded,
            color: Theme.of(ctx).colorScheme.error),
        title: const Text('Tasa por encima del tope de usura'),
        content: Text(
          'La tasa equivale a $rate % E.A., que supera el tope de usura vigente '
          '($cap % E.A.). Cobrar por encima del tope es ilegal en Colombia. '
          'Puedes registrarla de todos modos para llevar el control.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Registrar de todos modos'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Nueva deuda')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
              TextFormField(
                controller: _creditorController,
                decoration: const InputDecoration(
                  labelText: 'Acreedor',
                  hintText: 'Bancolombia, Davivienda...',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa el acreedor.' : null,
              ),
              const SizedBox(height: 16),
              _dropdown(
                label: 'Tipo de deuda',
                value: _debtType,
                options: debtTypeOptions,
                onChanged: (v) => setState(() => _debtType = v!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _principalController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                ],
                decoration: const InputDecoration(
                  labelText: 'Capital (monto del crédito)',
                  prefixText: '\$ ',
                  border: OutlineInputBorder(),
                ),
                validator: _validatePositiveNumber,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _rateController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Tasa',
                        suffixText: '%',
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateNonNegativeNumber,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: _dropdown(
                      label: 'Tipo de tasa',
                      value: _rateType,
                      options: rateTypeLabels,
                      onChanged: (v) => setState(() => _rateType = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _dropdown(
                label: 'Sistema de amortización',
                value: _amortizationSystem,
                options: amortizationSystemLabels,
                onChanged: (v) => setState(() => _amortizationSystem = v!),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _termController,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Plazo (meses)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n <= 0) return 'Ingresa un plazo válido.';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: _pickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Fecha de inicio',
                    border: OutlineInputBorder(),
                    suffixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(_formatDate(_startDate)),
                ),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _dailyInterest,
                onChanged: (v) => setState(() => _dailyInterest = v),
                title: const Text('Interés por día'),
                subtitle: Text(
                  'Causa el interés por días reales entre cuotas (efectivo diario base 365).',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
              const SizedBox(height: 12),
              Text('Seguro de vida deudor', style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'none', label: Text('Sin seguro')),
                  ButtonSegment(value: 'fixed', label: Text('Monto fijo')),
                  ButtonSegment(value: 'rate', label: Text('Tasa')),
                ],
                selected: {_insuranceMode},
                onSelectionChanged: (s) => setState(() => _insuranceMode = s.first),
              ),
              if (_insuranceMode != 'none') ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _insuranceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                  decoration: InputDecoration(
                    labelText: _insuranceMode == 'fixed'
                        ? 'Monto mensual del seguro'
                        : 'Tasa mensual del seguro',
                    prefixText: _insuranceMode == 'fixed' ? '\$ ' : null,
                    suffixText: _insuranceMode == 'rate' ? '%' : null,
                    border: const OutlineInputBorder(),
                    helperText: _insuranceMode == 'fixed'
                        ? 'Se suma a cada cuota (ej. 1811)'
                        : 'Porcentaje del saldo cada mes',
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Text('Crear deuda'),
              ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Resuelve el valor del seguro segun la modalidad (tasa en fraccion, monto fijo).
  /// @return El valor, o null si no aplica o es invalido.
  double? _resolveInsuranceValue() {
    if (_insuranceMode == 'none') return null;
    final parsed = double.tryParse(_insuranceController.text.replaceAll(',', '.'));
    if (parsed == null || parsed <= 0) return null;
    return _insuranceMode == 'rate' ? parsed / 100 : parsed;
  }

  /// Valida que el texto sea un numero positivo.
  String? _validatePositiveNumber(String? value) {
    final n = double.tryParse((value ?? '').replaceAll(',', '.'));
    if (n == null || n <= 0) return 'Ingresa un valor válido.';
    return null;
  }

  /// Valida que el texto sea un numero mayor o igual a cero.
  /// Permite tasa 0 (deudas sin interes).
  String? _validateNonNegativeNumber(String? value) {
    final n = double.tryParse((value ?? '').replaceAll(',', '.'));
    if (n == null || n < 0) return 'Ingresa un valor válido.';
    return null;
  }

  /// Construye un dropdown a partir de un mapa de etiquetas.
  Widget _dropdown({
    required String label,
    required String value,
    required Map<String, String> options,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      items: options.entries
          .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
          .toList(),
      onChanged: onChanged,
    );
  }
}
