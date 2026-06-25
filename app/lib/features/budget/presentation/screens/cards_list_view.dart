import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/budget_providers.dart';
import '../widgets/credit_card_tile.dart';

/// Vista de lista de tarjetas de credito del usuario.
/// Muestra estados de carga, error, lista vacia y lista con datos.
class CardsListView extends ConsumerWidget {
  const CardsListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cardsAsync = ref.watch(cardsListProvider);

    return cardsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (cards) {
        if (cards.isEmpty) return const _EmptyCards();
        return ListView.builder(
          padding: const EdgeInsets.only(top: 8, bottom: 96),
          itemCount: cards.length,
          itemBuilder: (context, index) {
            final card = cards[index];
            return CreditCardTile(
              card: card,
              // TODO(Task 13): navegar a CardDetailScreen
              onTap: () {},
            );
          },
        );
      },
    );
  }
}

/// Estado vacio de tarjetas.
class _EmptyCards extends StatelessWidget {
  const _EmptyCards();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.credit_card_outlined,
                size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Agrega tu primera tarjeta',
                style: theme.textTheme.titleMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Registra tus tarjetas para controlar cupo, pagos y tasa.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
