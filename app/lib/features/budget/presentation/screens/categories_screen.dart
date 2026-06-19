import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../shared/hex_color.dart';
import '../../../../shared/money_format.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import 'add_category_screen.dart';

/// Pantalla de gestion de categorias (ingresos y egresos).
class CategoriesScreen extends ConsumerWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Categorias')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const AddCategoryScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Categoria'),
      ),
      body: categoriesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (categories) => categories.isEmpty
            ? const _Empty()
            : ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  _section(context, 'Ingresos', categories.where((c) => c.isIncome).toList()),
                  _section(context, 'Egresos', categories.where((c) => !c.isIncome).toList()),
                ],
              ),
      ),
    );
  }

  /// Construye una seccion (ingresos o egresos) con sus categorias.
  Widget _section(BuildContext context, String title, List<Category> items) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text(title, style: Theme.of(context).textTheme.titleSmall),
        ),
        ...items.map((c) => _CategoryTile(category: c)),
      ],
    );
  }
}

/// Fila de una categoria con swipe para eliminar.
class _CategoryTile extends ConsumerWidget {
  const _CategoryTile({required this.category});

  final Category category;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final budget = category.monthlyBudget;
    return Dismissible(
      key: ValueKey(category.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _confirm(context),
      onDismissed: (_) async {
        await getIt<BudgetRepository>().deleteCategory(category.id);
        ref.invalidate(categoriesListProvider);
      },
      background: Container(
        alignment: Alignment.centerRight,
        color: Theme.of(context).colorScheme.errorContainer,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(Icons.delete_outline,
            color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: hexToColor(category.color), radius: 14),
        title: Text(category.name),
        subtitle: budget != null ? Text('Meta: ${formatCop(budget)}') : null,
      ),
    );
  }

  /// Pide confirmacion antes de eliminar.
  Future<bool> _confirm(BuildContext context) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Eliminar "${category.name}"'),
        content: const Text('Los movimientos existentes se conservan.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Eliminar')),
        ],
      ),
    );
    return result ?? false;
  }
}

/// Estado vacio de categorias.
class _Empty extends StatelessWidget {
  const _Empty();

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
            Text('Crea tus categorias',
                style: theme.textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text('Organiza tus ingresos y egresos por categoria.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
