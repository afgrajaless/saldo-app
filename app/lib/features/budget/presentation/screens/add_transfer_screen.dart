import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/hex_color.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import 'add_account_screen.dart';

/// Pantalla para registrar una transferencia entre cuentas.
class AddTransferScreen extends ConsumerStatefulWidget {
  const AddTransferScreen({super.key, required this.month});

  /// Mes vigente, para refrescar sus transferencias al guardar.
  final String month;

  @override
  ConsumerState<AddTransferScreen> createState() => _AddTransferScreenState();
}

class _AddTransferScreenState extends ConsumerState<AddTransferScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _fromId;
  String? _toId;
  late DateTime _date;
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
    super.dispose();
  }

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Abre el selector de fecha.
  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _date = picked);
  }

  /// Valida y guarda la transferencia; refresca las del mes.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_fromId == null || _toId == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Elige las cuentas de origen y destino.')));
      return;
    }
    if (_fromId == _toId) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Las cuentas deben ser distintas.')));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final params = CreateTransferParams(
      fromAccountId: _fromId!,
      toAccountId: _toId!,
      amount: double.parse(_amountController.text.replaceAll(',', '.')),
      occurredOn: _formatDate(_date),
      description: _descriptionController.text.trim(),
    );

    try {
      await getIt<BudgetRepository>().createTransfer(params);
      ref.invalidate(monthTransfersProvider(widget.month));
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
    final accountsAsync = ref.watch(accountsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Nueva transferencia')),
      body: SafeArea(
        child: accountsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('$e')),
          data: (accounts) {
            // Para "pagar tarjeta" el destino puede ser una tarjeta de credito
            // (cuenta con kind='credit_card'). El origen siempre debe ser una
            // cuenta de activo (efectivo, banco, etc.), no otra tarjeta.
            final assetAccounts = accounts.where((a) => !a.isCard).toList();
            // Si no hay al menos una cuenta de activo y una cuenta de destino, pedir cuentas.
            if (assetAccounts.isEmpty || accounts.length < 2) {
              return const _NeedAccounts();
            }
            return _form(assetAccounts: assetAccounts, allAccounts: accounts);
          },
        ),
      ),
    );
  }

  /// Construye el formulario con las cuentas disponibles.
  /// [assetAccounts] = cuentas de activo (origen); [allAccounts] = todas (destino).
  Widget _form({
    required List<Account> assetAccounts,
    required List<Account> allAccounts,
  }) {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _accountDropdown(
              // Origen: solo cuentas de activo (no tarjetas).
              label: 'Desde',
              value: _fromId,
              accounts: assetAccounts,
              onChanged: (v) => setState(() => _fromId = v),
            ),
            const SizedBox(height: 16),
            _accountDropdown(
              // Destino: todas las cuentas, incluidas tarjetas (pago de tarjeta).
              label: 'Hacia',
              value: _toId,
              accounts: allAccounts,
              onChanged: (v) => setState(() => _toId = v),
            ),
            const SizedBox(height: 16),
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
                if (n == null || n <= 0) return 'Ingresa un monto valido.';
                return null;
              },
            ),
            const SizedBox(height: 16),
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
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Descripcion (opcional)',
                border: OutlineInputBorder(),
              ),
              maxLength: 200,
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              child: _submitting
                  ? const SizedBox(
                      height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                  : const Text('Guardar transferencia'),
            ),
          ],
        ),
      ),
    );
  }

  /// Dropdown de seleccion de cuenta.
  Widget _accountDropdown({
    required String label,
    required String? value,
    required List<Account> accounts,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      items: accounts
          .map((a) => DropdownMenuItem(
                value: a.id,
                child: Row(
                  children: [
                    CircleAvatar(radius: 6, backgroundColor: hexToColor(a.color)),
                    const SizedBox(width: 10),
                    Flexible(child: Text(a.name, overflow: TextOverflow.ellipsis)),
                    if (a.isCard) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.credit_card_outlined, size: 14),
                    ],
                  ],
                ),
              ))
          .toList(),
      onChanged: onChanged,
      validator: (v) => v == null ? 'Elige una cuenta.' : null,
    );
  }
}

/// Aviso cuando hay menos de dos cuentas para transferir.
class _NeedAccounts extends StatelessWidget {
  const _NeedAccounts();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.account_balance_wallet_outlined, size: 56),
            const SizedBox(height: 12),
            const Text('Necesitas al menos dos cuentas para transferir.',
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => Navigator.of(context).pushReplacement(
                MaterialPageRoute<void>(builder: (_) => const AddAccountScreen()),
              ),
              child: const Text('Crear cuenta'),
            ),
          ],
        ),
      ),
    );
  }
}
