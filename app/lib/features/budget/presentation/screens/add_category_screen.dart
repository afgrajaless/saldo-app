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
/// Si recibe [parent], crea una subcategoria de esa categoria.
class AddCategoryScreen extends ConsumerStatefulWidget {
  const AddCategoryScreen({super.key, this.category, this.parent});

  /// Categoria a editar; null para crear una nueva.
  final Category? category;

  /// Categoria padre fija cuando se crea una subcategoria; null en otro caso.
  final Category? parent;

  @override
  ConsumerState<AddCategoryScreen> createState() => _AddCategoryScreenState();
}

class _AddCategoryScreenState extends ConsumerState<AddCategoryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _budgetController = TextEditingController();
  String _type = 'expense';
  Color _color = chartPalette.first;
  String? _parentId;
  bool _submitting = false;

  /// Indica si la pantalla esta editando una categoria existente.
  bool get _isEditing => widget.category != null;

  /// Indica si se crea una subcategoria con padre fijo.
  bool get _hasFixedParent => widget.parent != null;

  @override
  void initState() {
    super.initState();
    final category = widget.category;
    final parent = widget.parent;
    if (category != null) {
      _nameController.text = category.name;
      _type = category.type;
      _color = hexToColor(category.color);
      _parentId = category.parentId;
      if (category.monthlyBudget != null) {
        _budgetController.text = category.monthlyBudget!.toStringAsFixed(0);
      }
    } else if (parent != null) {
      _type = parent.type;
      _parentId = parent.id;
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
        parentId: _parentId,
      ),
    );
  }

  /// Actualiza la categoria en edicion con los datos del formulario.
  /// En egresos, si la meta queda vacia se envia el borrado de la meta.
  /// Si cambio la categoria padre, se incluye el movimiento.
  Future<void> _update() async {
    final budget = _parsedBudget();
    final original = widget.category!;
    final parentChanged = _parentId != original.parentId;
    await getIt<BudgetRepository>().updateCategory(
      original.id,
      UpdateCategoryParams(
        name: _nameController.text.trim(),
        color: colorToHex(_color),
        monthlyBudget: budget,
        clearMonthlyBudget: _type == 'expense' && budget == null,
        parentId: _parentId,
        changeParent: parentChanged,
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

  /// Construye la seccion de categoria padre: un banner fijo al crear una
  /// subcategoria, o un selector opcional al crear/editar una categoria.
  /// @param theme - Tema actual.
  /// @return Los widgets de la seccion (vacio si no aplica).
  List<Widget> _parentSection(ThemeData theme) {
    final fixedParent = widget.parent;
    if (fixedParent != null) {
      return [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.subdirectory_arrow_right, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Subcategoría de "${fixedParent.name}"',
                    style: theme.textTheme.bodyMedium),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ];
    }
    // Una categoria que ya es padre no puede convertirse en subcategoria.
    if (_isEditing && widget.category!.hasChildren) return const [];

    final categoriesAsync = ref.watch(categoriesListProvider);
    final parents = categoriesAsync.maybeWhen(
      data: (categories) => categories
          .where((c) =>
              c.parentId == null && c.type == _type && c.id != widget.category?.id)
          .toList(),
      orElse: () => <Category>[],
    );
    if (parents.isEmpty) return const [];
    // Si el padre actual ya no es valido (cambio de tipo), se trata como ninguno.
    final value = parents.any((p) => p.id == _parentId) ? _parentId : null;
    return [
      DropdownButtonFormField<String?>(
        value: value,
        decoration: const InputDecoration(
          labelText: 'Categoría padre (opcional)',
          border: OutlineInputBorder(),
          helperText: 'Conviértela en subcategoría de otra',
        ),
        items: [
          const DropdownMenuItem<String?>(
            value: null,
            child: Text('Ninguna (categoría principal)'),
          ),
          for (final parent in parents)
            DropdownMenuItem<String?>(value: parent.id, child: Text(parent.name)),
        ],
        onChanged: (v) => setState(() => _parentId = v),
      ),
      const SizedBox(height: 20),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = _isEditing
        ? 'Editar categoría'
        : _hasFixedParent
            ? 'Nueva subcategoría'
            : 'Nueva categoría';
    // El tipo no se cambia al editar ni al colgar de un padre fijo.
    final lockType = _isEditing || _hasFixedParent;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
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
                onSelectionChanged: lockType
                    ? null
                    : (s) => setState(() {
                          _type = s.first;
                          _parentId = null; // los padres dependen del tipo
                        }),
              ),
              const SizedBox(height: 20),
              ..._parentSection(theme),
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
                    helperText: 'Límite de gasto sugerido para el mes',
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
                    : Text(_isEditing ? 'Guardar cambios' : 'Crear categoría'),
              ),
              if (_isEditing) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : _delete,
                  icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
                  label: Text('Eliminar categoría',
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
