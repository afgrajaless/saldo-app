import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/hex_color.dart';
import '../../../budget/presentation/providers/budget_providers.dart';
import '../../domain/entities/group_member.dart';
import '../../domain/entities/group_params.dart';
import '../../domain/repositories/groups_repository.dart';
import '../providers/groups_providers.dart';

/// Pantalla para registrar una liquidacion de deuda entre dos miembros de un grupo.
/// Permite opcionalmente vincular el pago a una cuenta y categoria del presupuesto personal.
///
/// @param groupId - UUID del grupo.
/// @param initialFromMemberId - ID del miembro deudor (opcional, para precargar desde una deuda).
/// @param initialToMemberId - ID del miembro acreedor (opcional, para precargar desde una deuda).
/// @param initialAmount - Monto de la deuda (opcional, para precargar desde una deuda).
class SettleScreen extends ConsumerStatefulWidget {
  const SettleScreen({
    super.key,
    required this.groupId,
    this.initialFromMemberId,
    this.initialToMemberId,
    this.initialAmount,
  });

  final String groupId;
  final String? initialFromMemberId;
  final String? initialToMemberId;
  final double? initialAmount;

  @override
  ConsumerState<SettleScreen> createState() => _SettleScreenState();
}

class _SettleScreenState extends ConsumerState<SettleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();

  String? _fromMemberId;
  String? _toMemberId;
  late DateTime _date;

  /// Si el usuario activa el checkbox, se muestran los campos de cuenta y categoria.
  bool _recordPersonal = false;
  String? _recordAccountId;
  String? _recordCategoryId;

  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _date = DateTime.now();
    _fromMemberId = widget.initialFromMemberId;
    _toMemberId = widget.initialToMemberId;
    if (widget.initialAmount != null) {
      _amountController.text = widget.initialAmount!.toStringAsFixed(2);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  /// Formatea una fecha como YYYY-MM-DD.
  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Abre el selector de fecha y actualiza [_date].
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _date = picked);
  }

  /// Valida y guarda la liquidacion; invalida los providers de balance y liquidaciones, luego hace pop.
  Future<void> _submit(List<GroupMember> members) async {
    if (!_formKey.currentState!.validate()) return;

    // Validar que los miembros sean distintos.
    if (_fromMemberId == _toMemberId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El deudor y el acreedor no pueden ser el mismo miembro.')),
      );
      return;
    }

    // Si el checkbox esta activo, ambos campos son requeridos.
    if (_recordPersonal && (_recordAccountId == null || _recordCategoryId == null)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una cuenta y una categoria para registrar el movimiento.')),
      );
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final params = CreateSettlementParams(
      fromMemberId: _fromMemberId!,
      toMemberId: _toMemberId!,
      amount: double.parse(_amountController.text.replaceAll(',', '.')),
      settledOn: _formatDate(_date),
      recordAccountId: _recordPersonal ? _recordAccountId : null,
      recordCategoryId: _recordPersonal ? _recordCategoryId : null,
    );

    try {
      await getIt<GroupsRepository>().createSettlement(widget.groupId, params);
      ref.invalidate(groupBalanceProvider(widget.groupId));
      ref.invalidate(groupSettlementsProvider(widget.groupId));
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
    final membersAsync = ref.watch(groupMembersProvider(widget.groupId));

    return Scaffold(
      appBar: AppBar(title: const Text('Saldar deuda')),
      body: SafeArea(
        child: membersAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('$e')),
          data: (members) => _buildForm(context, members),
        ),
      ),
    );
  }

  /// Construye el formulario principal con la lista de miembros cargada.
  Widget _buildForm(BuildContext context, List<GroupMember> members) {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // --- Deudor (desde) ---
            DropdownButtonFormField<String>(
              value: members.any((m) => m.id == _fromMemberId) ? _fromMemberId : null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Deudor (quien paga)',
                border: OutlineInputBorder(),
              ),
              items: members
                  .map((m) => DropdownMenuItem(
                        value: m.id,
                        child: Text(m.displayName),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _fromMemberId = v),
              validator: (v) => v == null ? 'Selecciona el miembro deudor.' : null,
            ),
            const SizedBox(height: 16),

            // --- Acreedor (hacia) ---
            DropdownButtonFormField<String>(
              value: members.any((m) => m.id == _toMemberId) ? _toMemberId : null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Acreedor (quien recibe)',
                border: OutlineInputBorder(),
              ),
              items: members
                  .map((m) => DropdownMenuItem(
                        value: m.id,
                        child: Text(m.displayName),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _toMemberId = v),
              validator: (v) => v == null ? 'Selecciona el miembro acreedor.' : null,
            ),
            const SizedBox(height: 16),

            // --- Monto ---
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
              decoration: const InputDecoration(
                labelText: 'Monto',
                prefixText: '\$ ',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                final n = double.tryParse((v ?? '').replaceAll(',', '.'));
                if (n == null || n <= 0) return 'Ingresa un monto valido mayor a cero.';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // --- Fecha ---
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Fecha de liquidacion',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today_outlined),
                ),
                child: Text(_formatDate(_date)),
              ),
            ),
            const SizedBox(height: 16),

            // --- Checkbox para registrar en cuenta personal ---
            Card(
              margin: EdgeInsets.zero,
              child: Column(
                children: [
                  CheckboxListTile(
                    value: _recordPersonal,
                    title: const Text('Registrar en mi cuenta'),
                    subtitle: const Text('Crea un movimiento en tu presupuesto personal'),
                    onChanged: (v) => setState(() {
                      _recordPersonal = v ?? false;
                      if (!_recordPersonal) {
                        _recordAccountId = null;
                        _recordCategoryId = null;
                      }
                    }),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  if (_recordPersonal) ...[
                    const Divider(height: 1),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildAccountDropdown(),
                          const SizedBox(height: 12),
                          _buildCategoryDropdown(),
                          const SizedBox(height: 8),
                          Text(
                            'Nota: si pagas la deuda, usa una categoria de egreso; si la recibes, usa una de ingreso.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // --- Boton guardar ---
            FilledButton(
              onPressed: _submitting
                  ? null
                  : () => _submit(members),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              child: _submitting
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5),
                    )
                  : const Text('Registrar liquidacion'),
            ),
          ],
        ),
      ),
    );
  }

  /// Dropdown de cuentas del presupuesto personal.
  Widget _buildAccountDropdown() {
    final accountsAsync = ref.watch(accountsListProvider);
    return accountsAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (e, _) => Text('Error al cargar cuentas: $e'),
      data: (accounts) => DropdownButtonFormField<String>(
        value: accounts.any((a) => a.id == _recordAccountId) ? _recordAccountId : null,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Cuenta',
          border: OutlineInputBorder(),
          isDense: true,
        ),
        items: accounts
            .map((a) => DropdownMenuItem(
                  value: a.id,
                  child: Row(
                    children: [
                      CircleAvatar(radius: 6, backgroundColor: hexToColor(a.color)),
                      const SizedBox(width: 10),
                      Text(a.name),
                    ],
                  ),
                ))
            .toList(),
        onChanged: (v) => setState(() => _recordAccountId = v),
        validator: _recordPersonal
            ? (v) => v == null ? 'Selecciona una cuenta.' : null
            : null,
      ),
    );
  }

  /// Dropdown de categorias del presupuesto personal (hojas solamente).
  Widget _buildCategoryDropdown() {
    final categoriesAsync = ref.watch(categoriesListProvider);
    return categoriesAsync.when(
      loading: () => const LinearProgressIndicator(),
      error: (e, _) => Text('Error al cargar categorias: $e'),
      data: (categories) {
        final byId = {for (final c in categories) c.id: c};
        final leaves = categories.where((c) => !c.hasChildren).toList();
        return DropdownButtonFormField<String>(
          value: leaves.any((c) => c.id == _recordCategoryId) ? _recordCategoryId : null,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Categoria',
            border: OutlineInputBorder(),
            isDense: true,
          ),
          items: leaves.map((c) {
            final parentName = c.parentId != null ? byId[c.parentId]?.name : null;
            final label = parentName != null ? '$parentName › ${c.name}' : c.name;
            return DropdownMenuItem(
              value: c.id,
              child: Row(
                children: [
                  CircleAvatar(radius: 6, backgroundColor: hexToColor(c.color)),
                  const SizedBox(width: 10),
                  Flexible(
                    child: Text(
                      '$label  ·  ${c.isIncome ? 'Ingreso' : 'Egreso'}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (v) => setState(() => _recordCategoryId = v),
          validator: _recordPersonal
              ? (v) => v == null ? 'Selecciona una categoria.' : null
              : null,
        );
      },
    );
  }
}
