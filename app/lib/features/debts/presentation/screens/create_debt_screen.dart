import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/error/api_exception.dart';
import '../../../../shared/enum_labels.dart';
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

  String _debtType = 'libre_inversion';
  String _rateType = 'mv';
  String _amortizationSystem = 'frances';
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
    );

    try {
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

  @override
  Widget build(BuildContext context) {
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
                options: debtTypeLabels,
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
                  labelText: 'Capital (monto del credito)',
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
                      validator: _validatePositiveNumber,
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
                label: 'Sistema de amortizacion',
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
                  if (n == null || n <= 0) return 'Ingresa un plazo valido.';
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

  /// Valida que el texto sea un numero positivo.
  String? _validatePositiveNumber(String? value) {
    final n = double.tryParse((value ?? '').replaceAll(',', '.'));
    if (n == null || n <= 0) return 'Ingresa un valor valido.';
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
