import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../../../shared/hex_color.dart';
import '../../domain/entities/budget_params.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';
import 'categories_screen.dart';

/// Pantalla para registrar un movimiento (ingreso o egreso).
class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key, required this.month});

  /// Mes vigente, para refrescar sus datos al guardar.
  final String month;

  @override
  ConsumerState<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _categoryId;
  String? _accountId;

  /// Cuotas de diferido: null = una sola cuota (sin diferir).
  int? _installments;

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

  /// Valida y guarda el movimiento; refresca el resumen y la lista del mes.
  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _categoryId == null) {
      if (_categoryId == null) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Elige una categoría.')));
      }
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);

    final params = CreateTransactionParams(
      categoryId: _categoryId!,
      amount: double.parse(_amountController.text.replaceAll(',', '.')),
      occurredOn: _formatDate(_date),
      description: _descriptionController.text.trim(),
      accountId: _accountId,
      installments: _installments,
    );

    try {
      await getIt<BudgetRepository>().createTransaction(params);
      ref.invalidate(budgetSummaryProvider(widget.month));
      ref.invalidate(monthTransactionsProvider(widget.month));

      // Si la cuenta seleccionada es una tarjeta, refrescar tambien su estado.
      if (_accountId != null) {
        final accountsData = ref.read(accountsListProvider).valueOrNull;
        final selected =
            accountsData?.where((a) => a.id == _accountId).firstOrNull;
        if (selected != null && selected.isCard) {
          ref.invalidate(cardsListProvider);
          ref.invalidate(cardStatementProvider(_accountId!));
          ref.invalidate(cardInstallmentsProvider(_accountId!));
          ref.invalidate(upcomingCardPaymentsProvider);
        }
      }

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
    final categoriesAsync = ref.watch(categoriesListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo movimiento')),
      body: SafeArea(
        child: categoriesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(child: Text('$e')),
          data: (categories) =>
              categories.isEmpty ? const _NoCategories() : _form(context, categories),
        ),
      ),
    );
  }

  /// Dropdown opcional de cuenta; vacio si el usuario no tiene cuentas.
  /// Cuando la cuenta seleccionada es una tarjeta, muestra el selector de cuotas.
  Widget _accountField() {
    final accountsAsync = ref.watch(accountsListProvider);
    return accountsAsync.maybeWhen(
      data: (accounts) {
        if (accounts.isEmpty) return const SizedBox.shrink();

        // Cuenta seleccionada actualmente (puede ser null = "Sin cuenta").
        final selected = accounts.where((a) => a.id == _accountId).firstOrNull;
        final isCard = selected?.isCard ?? false;

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: DropdownButtonFormField<String?>(
                value: _accountId,
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Cuenta (opcional)',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem<String?>(value: null, child: Text('Sin cuenta')),
                  ...accounts.map((a) => DropdownMenuItem<String?>(
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
                      )),
                ],
                onChanged: (v) => setState(() {
                  _accountId = v;
                  // Al cambiar de cuenta, resetea el diferido si la nueva no es tarjeta.
                  final newSelected = accounts.where((a) => a.id == v).firstOrNull;
                  if (newSelected == null || !newSelected.isCard) _installments = null;
                }),
              ),
            ),
            // Selector de cuotas: solo visible cuando la cuenta es una tarjeta.
            if (isCard) _installmentsField(),
          ],
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  /// Dropdown para diferir una compra de tarjeta a N cuotas.
  /// Opciones: una sola cuota (sin diferir) o 2, 3, 6, 12, 24, 36.
  Widget _installmentsField() {
    const options = [2, 3, 6, 12, 24, 36];
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: DropdownButtonFormField<int?>(
        value: _installments,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Diferir a N cuotas',
          border: OutlineInputBorder(),
          prefixIcon: Icon(Icons.calendar_view_month_outlined),
        ),
        items: [
          const DropdownMenuItem<int?>(value: null, child: Text('Una sola cuota (sin diferir)')),
          ...options.map(
            (n) => DropdownMenuItem<int?>(value: n, child: Text('$n cuotas')),
          ),
        ],
        onChanged: (v) => setState(() => _installments = v),
      ),
    );
  }

  /// Construye el formulario con la lista de categorias.
  Widget _form(BuildContext context, List<Category> categories) {
    // Solo las hojas reciben movimientos: una categoria con subcategorias agrupa.
    final byId = {for (final c in categories) c.id: c};
    final leaves = categories.where((c) => !c.hasChildren).toList();
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DropdownButtonFormField<String>(
              value: leaves.any((c) => c.id == _categoryId) ? _categoryId : null,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Categoría',
                border: OutlineInputBorder(),
              ),
              items: leaves.map((c) {
                final parentName =
                    c.parentId != null ? byId[c.parentId]?.name : null;
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
              onChanged: (v) => setState(() => _categoryId = v),
              validator: (v) => v == null ? 'Elige una categoría.' : null,
            ),
            const SizedBox(height: 16),
            _accountField(),
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
                if (n == null || n <= 0) return 'Ingresa un monto válido.';
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
                labelText: 'Descripción (opcional)',
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
                  : const Text('Guardar movimiento'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Aviso cuando no hay categorias creadas.
class _NoCategories extends StatelessWidget {
  const _NoCategories();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.category_outlined, size: 56),
            const SizedBox(height: 12),
            const Text('Primero crea una categoría',
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => Navigator.of(context).pushReplacement(
                MaterialPageRoute<void>(builder: (_) => const CategoriesScreen()),
              ),
              child: const Text('Ir a categorías'),
            ),
          ],
        ),
      ),
    );
  }
}
