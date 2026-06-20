import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/chart_palette.dart';
import '../../../../shared/hex_color.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Pantalla para crear o editar una cuenta.
class AddAccountScreen extends ConsumerStatefulWidget {
  const AddAccountScreen({super.key, this.account});

  /// Cuenta a editar; null para crear una nueva.
  final Account? account;

  @override
  ConsumerState<AddAccountScreen> createState() => _AddAccountScreenState();
}

class _AddAccountScreenState extends ConsumerState<AddAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  Color _color = chartPalette.first;
  bool _submitting = false;

  bool get _isEditing => widget.account != null;

  @override
  void initState() {
    super.initState();
    final account = widget.account;
    if (account != null) {
      _nameController.text = account.name;
      _color = hexToColor(account.color);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  /// Valida y guarda la cuenta (crea o actualiza); refresca la lista.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final name = _nameController.text.trim();
    final color = colorToHex(_color);
    try {
      if (_isEditing) {
        await getIt<BudgetRepository>()
            .updateAccount(widget.account!.id, UpdateAccountParams(name: name, color: color));
      } else {
        await getIt<BudgetRepository>().createAccount(CreateAccountParams(name: name, color: color));
      }
      ref.invalidate(accountsListProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Editar cuenta' : 'Nueva cuenta')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre',
                  hintText: 'Nequi, Efectivo, Banco...',
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
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: _submitting
                    ? const SizedBox(
                        height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : Text(_isEditing ? 'Guardar cambios' : 'Crear cuenta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
