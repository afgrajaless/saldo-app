import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/group.dart';
import '../providers/groups_providers.dart';
import 'create_group_screen.dart';
import 'group_detail_screen.dart';
import 'join_group_screen.dart';

/// Pantalla principal del tab Compartido: lista los grupos del usuario.
/// Muestra un estado vacio con CTA cuando no hay grupos, y un ListView
/// de tarjetas cuando los hay. El FAB navega a [CreateGroupScreen].
class GroupsListScreen extends ConsumerWidget {
  const GroupsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(groupsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Compartido'),
        actions: [
          IconButton(
            tooltip: 'Unirme con codigo',
            icon: const Icon(Icons.input_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const JoinGroupScreen()),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'fab-new-group',
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const CreateGroupScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Nuevo grupo'),
      ),
      body: groupsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (groups) =>
            groups.isEmpty ? const _EmptyGroups() : _GroupsList(groups: groups),
      ),
    );
  }
}

/// Estado vacio: invita al usuario a crear su primer grupo o unirse a uno.
class _EmptyGroups extends StatelessWidget {
  const _EmptyGroups();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.groups_outlined,
                size: 72, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Sin grupos aun',
                style: theme.textTheme.titleMedium,
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Crea un grupo para dividir gastos con amigos o familia.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                    builder: (_) => const CreateGroupScreen()),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Crear grupo'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                    builder: (_) => const JoinGroupScreen()),
              ),
              icon: const Icon(Icons.input_outlined),
              label: const Text('Unirme con codigo'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Lista de grupos del usuario: cada item muestra el nombre del grupo.
class _GroupsList extends StatelessWidget {
  const _GroupsList({required this.groups});

  final List<Group> groups;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 96),
      itemCount: groups.length,
      itemBuilder: (context, i) {
        final group = groups[i];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: ListTile(
            leading: CircleAvatar(
              child: Text(
                group.name.isNotEmpty
                    ? group.name[0].toUpperCase()
                    : '?',
              ),
            ),
            title: Text(group.name),
            subtitle: group.isArchived ? const Text('Archivado') : null,
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => GroupDetailScreen(group: group),
              ),
            ),
          ),
        );
      },
    );
  }
}
