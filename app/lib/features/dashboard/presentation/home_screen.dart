import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/providers/auth_controller.dart';

/// Pantalla principal tras autenticarse. Por ahora muestra el usuario en sesion
/// y el cierre de sesion; el dashboard y la lista de deudas llegan despues.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).valueOrNull;
    final theme = Theme.of(context);
    final user = session?.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Saldo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesion',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_outline,
                size: 64, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Sesion iniciada', style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              user?.fullName?.isNotEmpty == true ? user!.fullName! : (user?.email ?? ''),
              style: theme.textTheme.bodyLarge
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            Text('Aqui ira tu dashboard de deudas',
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: theme.colorScheme.outline)),
          ],
        ),
      ),
    );
  }
}
