import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/chart_palette.dart';
import '../../../../shared/hex_color.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import '../widgets/delete_category_dialog.dart';

/// Pantalla para crear o editar una categoria de ingreso o egreso.
/// Si recibe [category], opera en modo edicion (el tipo no se cambia).
class AddCategoryScreen extends ConsumerStatefulWidget {
  const AddCategoryScreen({super.key, this.category});

  /// Categoria a editar; null para crear una nueva.
  final Category? category;

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

  /// Indica si la pantalla esta editando una categoria existente.
  bool get _isEditing => widget.category != null;

  @override
  void initState() {
    super.initState();
    final category = widget.category;
    if (category != null) {
      _nameController.text = category.name;
      _type = category.type;
      _color = hexToColor(category.color);
      if (category.monthlyBudget != null) {
        _budgetController.text = category.monthlyBudget!.toStringAsFixed(0);
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  /// Valida y guarda la categoria (crea o actualiza); refresca la lista.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    try {
      if (_isEditing) {
        await _update();
      } else {
        await _create();
      }
      ref.invalidate(categoriesListProvider);
      ref.invalidate(budgetSummaryProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Crea una categoria nueva con los datos del formulario.
  Future<void> _create() async {
    await getIt<BudgetRepository>().createCategory(
      CreateCategoryParams(
        name: _nameController.text.trim(),
        type: _type,
        color: colorToHex(_color),
        monthlyBudget: _parsedBudget(),
      ),
    );
  }

  /// Actualiza la categoria en edicion con los datos del formulario.
  /// En egresos, si la meta queda vacia se envia el borrado de la meta.
  Future<void> _update() async {
    final budget = _parsedBudget();
    await getIt<BudgetRepository>().updateCategory(
      widget.category!.id,
      UpdateCategoryParams(
        name: _nameController.text.trim(),
        color: colorToHex(_color),
        monthlyBudget: budget,
        clearMonthlyBudget: _type == 'expense' && budget == null,
      ),
    );
  }

  /// Confirma y elimina la categoria en edicion; cierra la pantalla si se borra.
  Future<void> _delete() async {
    final category = widget.category!;
    final confirmed = await confirmDeleteCategory(context, category);
    if (!confirmed) return;
    try {
      await deleteCategory(ref, category.id);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  /// Lee la meta mensual del formulario (solo egresos); null si vacia.
  /// @return La meta como double, o null.
  double? _parsedBudget() {
    if (_type != 'expense') return null;
    final text = _budgetController.text.replaceAll(',', '.');
    return text.isNotEmpty ? double.tryParse(text) : null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Editar categoria' : 'Nueva categoria')),
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
                // El tipo no se puede cambiar al editar.
                onSelectionChanged:
                    _isEditing ? null : (s) => setState(() => _type = s.first),
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
                    : Text(_isEditing ? 'Guardar cambios' : 'Crear categoria'),
              ),
              if (_isEditing) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : _delete,
                  icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
                  label: Text('Eliminar categoria',
                      style: TextStyle(color: theme.colorScheme.error)),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    side: BorderSide(color: theme.colorScheme.error),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
