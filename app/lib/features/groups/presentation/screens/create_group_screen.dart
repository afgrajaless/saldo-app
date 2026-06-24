import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/group_params.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';

/// Pantalla para crear un nuevo grupo de gasto compartido.
/// Solicita unicamente el nombre del grupo y lo envia al repositorio.
class CreateGroupScreen extends ConsumerStatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  ConsumerState<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends ConsumerState<CreateGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  /// Valida el formulario, crea el grupo en el backend y cierra la pantalla.
  /// Refresca [groupsListProvider] para que la lista refleje el nuevo grupo.
  /// Muestra un [SnackBar] si el servidor devuelve un error.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    try {
      await getIt<GroupsRepository>().createGroup(
        CreateGroupParams(name: _nameController.text.trim()),
      );
      ref.invalidate(groupsListProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo grupo')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _nameController,
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Nombre del grupo',
                  hintText: 'Viaje a Cartagena, Aparta, Cumple...',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ingresa un nombre.' : null,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child:
                            CircularProgressIndicator(strokeWidth: 2.5))
                    : const Text('Crear grupo'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
