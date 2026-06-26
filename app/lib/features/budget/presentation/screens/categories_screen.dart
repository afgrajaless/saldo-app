import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import '../widgets/delete_category_dialog.dart';
import 'add_category_screen.dart';

/// Categorias sugeridas para sembrar al primer uso (nombre, tipo, color hex).
const List<CreateCategoryParams> _suggestedCategories = [
  CreateCategoryParams(name: 'Salario', type: 'income', color: '#10B981'),
  CreateCategoryParams(name: 'Otros ingresos', type: 'income', color: '#3B82F6'),
  CreateCategoryParams(name: 'Arriendo', type: 'expense', color: '#EF4444'),
  CreateCategoryParams(name: 'Mercado', type: 'expense', color: '#F59E0B'),
  CreateCategoryParams(name: 'Transporte', type: 'expense', color: '#8B5CF6'),
  CreateCategoryParams(name: 'Servicios', type: 'expense', color: '#06B6D4'),
  CreateCategoryParams(name: 'Ocio', type: 'expense', color: '#EC4899'),
  CreateCategoryParams(name: 'Pagos de deuda', type: 'expense', color: '#6B7280'),
];

/// Pantalla de gestion de categorias (ingresos y egresos).
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Categorías')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const AddCategoryScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Categoría'),
      ),
      body: categoriesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (categories) => categories.isEmpty
            ? const _Empty()
            : ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  _section(context, 'Ingresos', Icons.trending_up,
                      categories.where((c) => c.isIncome).toList()),
                  _section(context, 'Egresos', Icons.trending_down,
                      categories.where((c) => !c.isIncome).toList()),
                ],
              ),
      ),
    );
  }

  /// Construye una seccion (ingresos o egresos) con su encabezado y categorias,
  /// anidando las subcategorias bajo su categoria padre.
  Widget _section(
    BuildContext context,
    String title,
    IconData icon,
    List<Category> items,
  ) {
    if (items.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final isIncome = title == 'Ingresos';
    final accent = isIncome ? theme.colorScheme.primary : theme.colorScheme.error;

    final topLevel = items.where((c) => c.parentId == null).toList();
    final childrenByParent = <String, List<Category>>{};
    for (final c in items.where((c) => c.parentId != null)) {
      childrenByParent.putIfAbsent(c.parentId!, () => []).add(c);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Row(
            children: [
              Icon(icon, size: 18, color: accent),
              const SizedBox(width: 8),
              Text(title,
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(width: 6),
              Text('(${items.length})', style: theme.textTheme.bodySmall),
            ],
          ),
        ),
        for (final parent in topLevel) ...[
          _CategoryTile(category: parent),
          for (final child in childrenByParent[parent.id] ?? const <Category>[])
            _CategoryTile(category: child, isChild: true),
        ],
      ],
    );
  }
}

/// Fila de una categoria: tap para editar, swipe para eliminar.
/// Las subcategorias ([isChild]) se muestran indentadas.
class _CategoryTile extends ConsumerWidget {
  const _CategoryTile({required this.category, this.isChild = false});

  final Category category;
  final bool isChild;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final budget = category.monthlyBudget;
    // Solo las categorias de primer nivel pueden recibir subcategorias.
    final canAddChild = category.parentId == null;
    return Dismissible(
      key: ValueKey(category.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => confirmDeleteCategory(context, category),
      onDismissed: (_) => deleteCategory(ref, category.id),
      background: Container(
        alignment: Alignment.centerRight,
        color: theme.colorScheme.errorContainer,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(Icons.delete_outline, color: theme.colorScheme.onErrorContainer),
      ),
      child: ListTile(
        contentPadding: EdgeInsets.only(left: isChild ? 40 : 16, right: 8),
        leading: isChild
            ? Icon(Icons.subdirectory_arrow_right,
                size: 18, color: theme.colorScheme.onSurfaceVariant)
            : CircleAvatar(backgroundColor: hexToColor(category.color), radius: 14),
        title: Text(category.name),
        subtitle: _subtitle(budget, category.transactionCount),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (canAddChild)
              IconButton(
                icon: const Icon(Icons.add),
                tooltip: 'Agregar subcategoría',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => AddCategoryScreen(parent: category),
                  ),
                ),
              ),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => AddCategoryScreen(category: category),
          ),
        ),
      ),
    );
  }

  /// Construye el subtitulo con la meta y/o el conteo de movimientos.
  /// @param budget - Meta mensual (null si no tiene).
  /// @param count - Cantidad de movimientos.
  /// @return El widget de subtitulo, o null si no hay nada que mostrar.
  Widget? _subtitle(double? budget, int count) {
    final parts = <String>[
      if (budget != null) 'Meta: ${formatCop(budget)}',
      if (count > 0) '$count ${count == 1 ? 'movimiento' : 'movimientos'}',
    ];
    return parts.isEmpty ? null : Text(parts.join('  ·  '));
  }
}

/// Estado vacio de categorias, con opcion de sembrar categorias sugeridas.
class _Empty extends ConsumerStatefulWidget {
  const _Empty();

  @override
  ConsumerState<_Empty> createState() => _EmptyState();
}

class _EmptyState extends ConsumerState<_Empty> {
  bool _seeding = false;

  /// Crea el set de categorias sugeridas; ignora las que ya existan.
  Future<void> _seedSuggested() async {
    setState(() => _seeding = true);
    final repo = getIt<BudgetRepository>();
    try {
      for (final params in _suggestedCategories) {
        try {
          await repo.createCategory(params);
        } on ApiException {
          // Si alguna ya existe (409), se omite y se sigue con las demas.
        }
      }
      ref.invalidate(categoriesListProvider);
      ref.invalidate(budgetSummaryProvider);
    } finally {
      if (mounted) setState(() => _seeding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.category_outlined, size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Crea tus categorías',
                style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text('Organiza tus ingresos y egresos por categoría.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _seeding ? null : _seedSuggested,
              icon: _seeding
                  ? const SizedBox(
                      height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2.5))
                  : const Icon(Icons.auto_awesome),
              label: const Text('Usar categorías sugeridas'),
            ),
          ],
        ),
      ),
    );
  }
}
