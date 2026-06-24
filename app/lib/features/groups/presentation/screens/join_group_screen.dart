import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/group_params.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';
import 'group_detail_screen.dart';

/// Pantalla para unirse a un grupo usando un codigo de invitacion.
/// El usuario ingresa el codigo recibido y confirma para unirse.
class JoinGroupScreen extends ConsumerStatefulWidget {
  const JoinGroupScreen({super.key});

  @override
  ConsumerState<JoinGroupScreen> createState() => _JoinGroupScreenState();
}

class _JoinGroupScreenState extends ConsumerState<JoinGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  /// Procesa el intento de unirse al grupo con el codigo ingresado.
  /// Invalida la lista de grupos y navega al detalle del grupo si tiene exito.
  /// Muestra el mensaje del backend ante errores (409, codigo invalido, etc.).
  Future<void> _join() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    try {
      final group = await getIt<GroupsRepository>().joinGroup(
        JoinGroupParams(code: _codeController.text.trim().toUpperCase()),
      );
      ref.invalidate(groupsListProvider);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => GroupDetailScreen(group: group),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Unirme con codigo')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 12),
              Icon(
                Icons.group_add_outlined,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 20),
              Text(
                'Ingresa el codigo',
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Pídele a quien creó el grupo que te comparta el código de invitación.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextFormField(
                controller: _codeController,
                decoration: const InputDecoration(
                  labelText: 'Codigo de invitacion',
                  hintText: 'Ej: ABC123',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.link),
                  helperText: 'El codigo no distingue mayusculas/minusculas',
                ),
                textCapitalization: TextCapitalization.characters,
                autocorrect: false,
                enableSuggestions: false,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa el codigo.' : null,
              ),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: _submitting ? null : _join,
                icon: _submitting
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : const Icon(Icons.login_outlined),
                label: const Text('Unirme al grupo'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
