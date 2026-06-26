import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/group_invite.dart';
import '../../domain/entities/group_params.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';

/// Pantalla para agregar miembros a un grupo.
/// Tiene dos secciones: agregar un miembro fantasma (sin cuenta) e
/// invitar a un usuario real generando un codigo de enlace.
/// @param groupId - UUID del grupo al que se agregan miembros.
class AddMemberScreen extends ConsumerStatefulWidget {
  const AddMemberScreen({super.key, required this.groupId});

  /// UUID del grupo al que se agregan los miembros.
  final String groupId;

  @override
  ConsumerState<AddMemberScreen> createState() => _AddMemberScreenState();
}

class _AddMemberScreenState extends ConsumerState<AddMemberScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  bool _submitting = false;
  GroupInvite? _generatedInvite;
  bool _generatingCode = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  /// Agrega un miembro fantasma al grupo con el nombre ingresado.
  /// Invalida el provider de miembros y cierra la pantalla al terminar.
  Future<void> _addGhost() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    try {
      await getIt<GroupsRepository>().addMember(
        widget.groupId,
        AddMemberParams(displayName: _nameController.text.trim()),
      );
      ref.invalidate(groupMembersProvider(widget.groupId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Miembro agregado correctamente.')),
      );
      Navigator.of(context).pop();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Genera un codigo de invitacion para el grupo y lo muestra en pantalla.
  /// El usuario puede copiar el codigo al portapapeles.
  Future<void> _generateCode() async {
    setState(() {
      _generatingCode = true;
      _generatedInvite = null;
    });

    try {
      final invite = await getIt<GroupsRepository>().createInvite(
        widget.groupId,
        const CreateInviteParams(),
      );
      if (!mounted) return;
      setState(() => _generatedInvite = invite);
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _generatingCode = false);
    }
  }

  /// Copia el codigo de invitacion al portapapeles y muestra confirmacion.
  /// @param code - Codigo de invitacion a copiar.
  Future<void> _copyCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Código copiado al portapapeles.')),
    );
  }

  /// Construye la pestaña para agregar un miembro fantasma (sin cuenta).
  Widget _buildGhostTab(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Miembro sin cuenta',
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Agrega a alguien que no usa la app. Sus deudas quedan registradas pero no puede iniciar sesión.',
              style: theme.textTheme.bodySmall
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nombre del miembro',
                hintText: 'Ej: Carlos, Mamá, Compañero...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person_outline),
              ),
              textCapitalization: TextCapitalization.words,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Ingresa un nombre.' : null,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _submitting ? null : _addGhost,
              icon: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Icon(Icons.person_add_outlined),
              label: const Text('Agregar miembro'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Construye la pestaña para generar y compartir un codigo de invitacion.
  Widget _buildInviteTab(ThemeData theme) {
    final invite = _generatedInvite;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Invitar por código',
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            'Genera un código único y compártelo. Quien lo use se unirá a este grupo con su propia cuenta.',
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
          if (invite == null) ...[
            OutlinedButton.icon(
              onPressed: _generatingCode ? null : _generateCode,
              icon: _generatingCode
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Icon(Icons.link),
              label: const Text('Generar código'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ] else ...[
            _InviteCodeCard(invite: invite, onCopy: () => _copyCode(invite.code)),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _generatingCode ? null : _generateCode,
              icon: const Icon(Icons.refresh),
              label: const Text('Generar nuevo código'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agregar miembro'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Miembro fantasma'),
            Tab(text: 'Invitar por código'),
          ],
        ),
      ),
      body: SafeArea(
        child: TabBarView(
          controller: _tabController,
          children: [
            SingleChildScrollView(child: _buildGhostTab(theme)),
            SingleChildScrollView(child: _buildInviteTab(theme)),
          ],
        ),
      ),
    );
  }
}

/// Tarjeta que muestra el codigo de invitacion generado con boton de copia.
class _InviteCodeCard extends StatelessWidget {
  const _InviteCodeCard({required this.invite, required this.onCopy});

  final GroupInvite invite;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(
            'Código de invitación',
            style: theme.textTheme.labelMedium?.copyWith(
              color: theme.colorScheme.onPrimaryContainer,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            invite.code,
            style: theme.textTheme.displaySmall?.copyWith(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.w700,
              letterSpacing: 4,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'Comparte este código para que se unan al grupo',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onPrimaryContainer.withAlpha(180),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onCopy,
            icon: const Icon(Icons.copy_outlined, size: 18),
            label: const Text('Copiar código'),
            style: FilledButton.styleFrom(
              backgroundColor: theme.colorScheme.onPrimaryContainer,
              foregroundColor: theme.colorScheme.primaryContainer,
            ),
          ),
        ],
      ),
    );
  }
}
