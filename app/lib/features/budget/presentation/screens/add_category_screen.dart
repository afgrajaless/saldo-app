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

/// Pantalla para crear una categoria de ingreso o egreso.
class AddCategoryScreen extends ConsumerStatefulWidget {
  const AddCategoryScreen({super.key});

  @override
  ConsumerState<AddCategoryScreen> createState() => _AddCategoryScreenState();
}

class _AddCategoryScreenState extends ConsumerState<AddCategoryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _budgetController = TextEditingController();
  String _type = 'expense';
  Color _color = chartPalette.first;
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  /// Valida y crea la categoria; refresca la lista.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final budgetText = _budgetController.text.replaceAll(',', '.');
    final params = CreateCategoryParams(
      name: _nameController.text.trim(),
      type: _type,
      color: colorToHex(_color),
      monthlyBudget:
          _type == 'expense' && budgetText.isNotEmpty ? double.tryParse(budgetText) : null,
    );

    try {
      await getIt<BudgetRepository>().createCategory(params);
      ref.invalidate(categoriesListProvider);
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
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Nueva categoria')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'expense', label: Text('Egreso')),
                  ButtonSegment(value: 'income', label: Text('Ingreso')),
                ],
                selected: {_type},
                onSelectionChanged: (s) => setState(() => _type = s.first),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre',
                  hintText: 'Arriendo, Salario, Mercado...',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa un nombre.' : null,
              ),
              const SizedBox(height: 20),
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
                            ? const Icon(Icons.check, color: Colors.white, size: 18)
                            : null,
                      ),
                    ),
                ],
              ),
              if (_type == 'expense') ...[
                const SizedBox(height: 20),
                TextFormField(
                  controller: _budgetController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                  decoration: const InputDecoration(
                    labelText: 'Meta mensual (opcional)',
                    prefixText: '\$ ',
                    border: OutlineInputBorder(),
                    helperText: 'Limite de gasto sugerido para el mes',
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : const Text('Crear categoria'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
