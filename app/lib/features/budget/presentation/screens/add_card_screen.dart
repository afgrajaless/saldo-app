import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/chart_palette.dart';
import '../../../../shared/hex_color.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Pantalla para crear una nueva tarjeta de credito.
class AddCardScreen extends ConsumerStatefulWidget {
  const AddCardScreen({super.key});

  @override
  ConsumerState<AddCardScreen> createState() => _AddCardScreenState();
}

class _AddCardScreenState extends ConsumerState<AddCardScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _creditLimitController = TextEditingController();
  final _statementDayController = TextEditingController();
  final _paymentDayController = TextEditingController();
  final _rotativoRateController = TextEditingController();
  final _minPaymentPctController = TextEditingController(text: '5');
  final _managementFeeController = TextEditingController();

  Color _color = chartPalette.first;
  String _managementFeePeriod = 'none';
  bool _submitting = false;

  /// Opciones de periodicidad de la cuota de manejo.
  static const _periodOptions = [
    ('none', 'Sin cuota'),
    ('monthly', 'Mensual'),
    ('annual', 'Anual'),
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _creditLimitController.dispose();
    _statementDayController.dispose();
    _paymentDayController.dispose();
    _rotativoRateController.dispose();
    _minPaymentPctController.dispose();
    _managementFeeController.dispose();
    super.dispose();
  }

  /// Valida el formulario y crea la tarjeta; refresca la lista y cierra la pantalla.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    try {
      final ratePercent = double.parse(_rotativoRateController.text.trim());
      final minPctText = _minPaymentPctController.text.trim();
      final managementFeeText = _managementFeeController.text.trim();

      await getIt<BudgetRepository>().createCard(
        CreateCardParams(
          name: _nameController.text.trim(),
          color: colorToHex(_color),
          creditLimit: double.parse(_creditLimitController.text.trim()),
          statementDay: int.parse(_statementDayController.text.trim()),
          paymentDay: int.parse(_paymentDayController.text.trim()),
          rotativoRateEa: ratePercent / 100,
          minPaymentPct: minPctText.isNotEmpty
              ? double.parse(minPctText) / 100
              : 0.05,
          managementFee: managementFeeText.isNotEmpty
              ? double.parse(managementFeeText)
              : null,
          managementFeePeriod: _managementFeePeriod,
        ),
      );

      ref.invalidate(cardsListProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Validador para campos numericos enteros en rango 1-31 (dias).
  String? _validateDay(String? value) {
    if (value == null || value.trim().isEmpty) return 'Campo requerido.';
    final day = int.tryParse(value.trim());
    if (day == null || day < 1 || day > 31) return 'Ingresa un dia entre 1 y 31.';
    return null;
  }

  /// Validador para campos numericos decimales requeridos y positivos.
  String? _validatePositiveDecimal(String? value) {
    if (value == null || value.trim().isEmpty) return 'Campo requerido.';
    final number = double.tryParse(value.trim());
    if (number == null || number <= 0) return 'Ingresa un valor mayor a 0.';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Nueva tarjeta')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // --- Nombre ---
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre',
                  hintText: 'Visa Oro, Mastercard...',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa un nombre.' : null,
              ),
              const SizedBox(height: 20),

              // --- Selector de color ---
              Text('Color', style: theme.textTheme.labelLarge),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  for (final color in chartPalette)
                    GestureDetector(
                      onTap: () => setState(() => _color = color),
                      child: CircleAvatar(
                        backgroundColor: color,
                        radius: 18,
                        child: _color == color
                            ? const Icon(Icons.check,
                                color: Colors.white, size: 18)
                            : null,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 20),

              // --- Cupo total ---
              TextFormField(
                controller: _creditLimitController,
                decoration: const InputDecoration(
                  labelText: 'Cupo total (\$)',
                  hintText: '5000000',
                  border: OutlineInputBorder(),
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
                validator: _validatePositiveDecimal,
              ),
              const SizedBox(height: 16),

              // --- Dias de corte y pago en fila ---
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _statementDayController,
                      decoration: const InputDecoration(
                        labelText: 'Dia de corte',
                        hintText: '1-31',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      validator: _validateDay,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _paymentDayController,
                      decoration: const InputDecoration(
                        labelText: 'Dia de pago',
                        hintText: '1-31',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      validator: _validateDay,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // --- Tasa rotativa E.A. ---
              TextFormField(
                controller: _rotativoRateController,
                decoration: const InputDecoration(
                  labelText: 'Tasa rotativa E.A. (%)',
                  hintText: '28',
                  suffixText: '%',
                  border: OutlineInputBorder(),
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
                validator: _validatePositiveDecimal,
              ),
              const SizedBox(height: 16),

              // --- % pago minimo ---
              TextFormField(
                controller: _minPaymentPctController,
                decoration: const InputDecoration(
                  labelText: '% pago minimo',
                  hintText: '5',
                  suffixText: '%',
                  border: OutlineInputBorder(),
                  helperText: 'Opcional. Por defecto 5%.',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
              ),
              const SizedBox(height: 16),

              // --- Cuota de manejo ---
              TextFormField(
                controller: _managementFeeController,
                decoration: const InputDecoration(
                  labelText: 'Cuota de manejo (\$)',
                  hintText: '15000',
                  border: OutlineInputBorder(),
                  helperText: 'Opcional. Dejar vacio si no aplica.',
                ),
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
                ],
              ),
              const SizedBox(height: 16),

              // --- Periodo de cuota de manejo ---
              DropdownButtonFormField<String>(
                value: _managementFeePeriod,
                decoration: const InputDecoration(
                  labelText: 'Periodo cuota de manejo',
                  border: OutlineInputBorder(),
                ),
                items: _periodOptions
                    .map((option) => DropdownMenuItem(
                          value: option.$1,
                          child: Text(option.$2),
                        ))
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _managementFeePeriod = value);
                  }
                },
              ),
              const SizedBox(height: 28),

              // --- Boton de guardar ---
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child:
                            CircularProgressIndicator(strokeWidth: 2.5))
                    : const Text('Crear tarjeta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
