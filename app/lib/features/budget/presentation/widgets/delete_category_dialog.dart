import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Muestra el dialogo de confirmacion para eliminar una categoria.
/// Si la categoria tiene movimientos, avisa que se moveran a "Otros".
/// @param context - Contexto de la pantalla.
/// @param category - Categoria a eliminar.
/// @return `true` si el usuario confirma.
Future<bool> confirmDeleteCategory(BuildContext context, Category category) async {
  final count = category.transactionCount;
  final content = count > 0
      ? 'Tiene $count ${count == 1 ? 'movimiento' : 'movimientos'}. '
          'Se moveran a la categoria "Otros" conservando "${category.name}" '
          'en su descripcion.'
      : 'Esta accion no se puede deshacer.';
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Eliminar "${category.name}"'),
      content: Text(content),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar')),
        FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar')),
      ],
    ),
  );
  return result ?? false;
}

/// Elimina la categoria y refresca la lista y el resumen del presupuesto.
/// @param ref - Referencia de Riverpod.
/// @param categoryId - UUID de la categoria a eliminar.
Future<void> deleteCategory(WidgetRef ref, String categoryId) async {
  await getIt<BudgetRepository>().deleteCategory(categoryId);
  ref.invalidate(categoriesListProvider);
  ref.invalidate(budgetSummaryProvider);
}
