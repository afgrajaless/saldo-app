import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/group_member.dart';
import '../../domain/entities/group_params.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';

/// Pantalla para registrar un gasto compartido en un grupo.
/// Soporta dos métodos de división: iguales y exacto.
/// @param groupId - UUID del grupo donde se registra el gasto.
class NewExpenseScreen extends ConsumerStatefulWidget {
  const NewExpenseScreen({super.key, required this.groupId});

  /// UUID del grupo al que pertenece el gasto.
  final String groupId;

  @override
  ConsumerState<NewExpenseScreen> createState() => _NewExpenseScreenState();
}

class _NewExpenseScreenState extends ConsumerState<NewExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();

  /// Método de división seleccionado: 'equal' o 'exact'.
  String _splitMethod = 'equal';

  /// Miembro pagador (su memberId).
  String? _paidByMemberId;

  /// Fecha del gasto.
  late DateTime _date;

  /// Mapa de memberId → true si participa en el gasto.
  final Map<String, bool> _participates = {};

  /// Controladores para los montos exactos por miembro.
  final Map<String, TextEditingController> _exactControllers = {};

  /// Error de validación del reparto exacto.
  String? _exactSplitError;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _date = DateTime.now();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    for (final c in _exactControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  /// Formatea una fecha como YYYY-MM-DD.
  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Abre el selector de fecha y actualiza el estado.
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _date = picked);
  }

  /// Inicializa los mapas de participacion y controladores de monto exacto
  /// para la lista de miembros recibida. Solo lo hace una vez.
  void _initMembersIfNeeded(List<GroupMember> members) {
    if (_participates.isEmpty && members.isNotEmpty) {
      for (final m in members) {
        _participates[m.id] = true;
        _exactControllers[m.id] = TextEditingController();
      }
      _paidByMemberId = members.first.id;
    }
  }

  /// Retorna la lista de IDs de miembros marcados como participantes.
  List<String> get _checkedMemberIds =>
      _participates.entries.where((e) => e.value).map((e) => e.key).toList();

  /// Valida que al menos un miembro esté marcado.
  bool get _hasParticipants => _checkedMemberIds.isNotEmpty;

  /// Valida el reparto exacto: suma debe ser igual al total del gasto.
  /// Retorna null si es válido, o un mensaje de error.
  String? _validateExactSplit(double total, List<GroupMember> members) {
    if (_splitMethod != 'exact') return null;
    final checked = _checkedMemberIds;
    if (checked.isEmpty) return 'Selecciona al menos un participante.';

    double sum = 0;
    for (final id in checked) {
      final raw = _exactControllers[id]?.text ?? '';
      final val = double.tryParse(raw.replaceAll(',', '.'));
      if (val == null || val < 0) {
        final member = members.firstWhere((m) => m.id == id);
        return 'Ingresa un monto válido para ${member.displayName}.';
      }
      sum += val;
    }

    // Tolerancia de 1 peso por redondeo.
    if ((sum - total).abs() > 1) {
      return 'La suma de los montos (${sum.toStringAsFixed(2)}) '
          'debe ser igual al total (${total.toStringAsFixed(2)}).';
    }
    return null;
  }

  /// Valida el formulario y envía el gasto al repositorio.
  Future<void> _submit(List<GroupMember> members) async {
    setState(() => _exactSplitError = null);

    if (!_formKey.currentState!.validate()) return;
    if (!_hasParticipants) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona al menos un participante.')),
      );
      return;
    }

    final total = double.parse(_amountController.text.replaceAll(',', '.'));

    if (_splitMethod == 'exact') {
      final error = _validateExactSplit(total, members);
      if (error != null) {
        setState(() => _exactSplitError = error);
        return;
      }
    }

    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    // Construir los parámetros del gasto según el método elegido.
    final params = CreateExpenseParams(
      paidByMemberId: _paidByMemberId!,
      amount: total,
      occurredOn: _formatDate(_date),
      splitMethod: _splitMethod,
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      participantMemberIds:
          _splitMethod == 'equal' ? _checkedMemberIds : null,
      exactShares: _splitMethod == 'exact'
          ? _checkedMemberIds
              .map((id) => ExactShareParams(
                    memberId: id,
                    shareAmount: double.parse(
                      (_exactControllers[id]?.text ?? '0').replaceAll(',', '.'),
                    ),
                  ))
              .toList()
          : null,
    );

    try {
      await getIt<GroupsRepository>().createExpense(widget.groupId, params);
      ref.invalidate(groupExpensesProvider(widget.groupId));
      ref.invalidate(groupBalanceProvider(widget.groupId));
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
    final membersAsync = ref.watch(groupMembersProvider(widget.groupId));

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo gasto')),
      body: SafeArea(
        child: membersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Error al cargar miembros: $e',
                  textAlign: TextAlign.center),
            ),
          ),
          data: (members) {
            _initMembersIfNeeded(members);
            return _buildForm(context, members);
          },
        ),
      ),
    );
  }

  /// Construye el formulario completo con todos los campos.
  Widget _buildForm(BuildContext context, List<GroupMember> members) {
    final theme = Theme.of(context);
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Pagador ──────────────────────────────────────────────
            DropdownButtonFormField<String>(
              value: _paidByMemberId,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: '¿Quién pagó?',
                border: OutlineInputBorder(),
              ),
              items: members
                  .map((m) => DropdownMenuItem<String>(
                        value: m.id,
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              child: Text(
                                m.displayName.isNotEmpty
                                    ? m.displayName[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Flexible(
                              child: Text(
                                m.displayName,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (m.isGhost) ...[
                              const SizedBox(width: 6),
                              Icon(Icons.person_outline,
                                  size: 14,
                                  color: theme.colorScheme.onSurfaceVariant),
                            ],
                          ],
                        ),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _paidByMemberId = v),
              validator: (v) =>
                  v == null ? 'Selecciona quién pagó el gasto.' : null,
            ),
            const SizedBox(height: 16),

            // ── Monto total ──────────────────────────────────────────
            TextFormField(
              controller: _amountController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: const InputDecoration(
                labelText: 'Monto total',
                prefixText: '\$ ',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                final n =
                    double.tryParse((v ?? '').replaceAll(',', '.'));
                if (n == null || n <= 0) return 'Ingresa un monto válido.';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // ── Fecha ────────────────────────────────────────────────
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Fecha',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today_outlined),
                ),
                child: Text(_formatDate(_date)),
              ),
            ),
            const SizedBox(height: 16),

            // ── Descripción ──────────────────────────────────────────
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
                border: OutlineInputBorder(),
              ),
              maxLength: 200,
            ),
            const SizedBox(height: 8),

            // ── Método de división ───────────────────────────────────
            Text('Método de división', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'equal',
                  label: Text('Iguales'),
                  icon: Icon(Icons.people_outline),
                ),
                ButtonSegment(
                  value: 'exact',
                  label: Text('Exacto'),
                  icon: Icon(Icons.calculate_outlined),
                ),
              ],
              selected: {_splitMethod},
              onSelectionChanged: (selection) {
                setState(() {
                  _splitMethod = selection.first;
                  _exactSplitError = null;
                });
              },
            ),
            const SizedBox(height: 16),

            // ── Participantes ────────────────────────────────────────
            Text('Participantes', style: theme.textTheme.labelLarge),
            const SizedBox(height: 4),
            ...members.map((m) => _buildParticipantRow(m, theme)),

            // Error del reparto exacto
            if (_exactSplitError != null) ...[
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.errorContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline,
                        color: theme.colorScheme.onErrorContainer, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _exactSplitError!,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onErrorContainer),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            // ── Botón guardar ────────────────────────────────────────
            FilledButton(
              onPressed: _submitting ? null : () => _submit(members),
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52)),
              child: _submitting
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child:
                          CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Text('Guardar gasto'),
            ),
          ],
        ),
      ),
    );
  }

  /// Construye la fila de un participante: checkbox + nombre + campo exacto (si aplica).
  Widget _buildParticipantRow(GroupMember member, ThemeData theme) {
    final isChecked = _participates[member.id] ?? false;
    final showExact = _splitMethod == 'exact' && isChecked;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CheckboxListTile(
          value: isChecked,
          contentPadding: EdgeInsets.zero,
          title: Row(
            children: [
              Text(member.displayName),
              if (member.isGhost) ...[
                const SizedBox(width: 6),
                Icon(Icons.person_outline,
                    size: 14,
                    color: theme.colorScheme.onSurfaceVariant),
              ],
            ],
          ),
          onChanged: (v) => setState(
              () => _participates[member.id] = v ?? false),
        ),
        if (showExact)
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 8, bottom: 8),
            child: TextFormField(
              controller: _exactControllers[member.id],
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
              ],
              decoration: InputDecoration(
                labelText: 'Monto para ${member.displayName}',
                prefixText: '\$ ',
                border: const OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (_) => setState(() => _exactSplitError = null),
            ),
          ),
      ],
    );
  }
}
