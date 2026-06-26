import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/di/injection.dart';
import '../../../../core/error/api_exception.dart';
import '../../domain/entities/import_result.dart';
import '../../domain/repositories/budget_repository.dart';
import '../providers/budget_providers.dart';

/// Pantalla para importar movimientos desde un archivo XLSX o CSV.
class ImportScreen extends ConsumerStatefulWidget {
  const ImportScreen({super.key});

  @override
  ConsumerState<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends ConsumerState<ImportScreen> {
  bool _loading = false;
  ImportResult? _result;
  String? _error;

  /// Permite elegir un archivo y lo importa, mostrando el resumen.
  Future<void> _pickAndImport() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['xlsx', 'csv'],
      withData: true,
    );
    if (picked == null) return;
    final file = picked.files.single;
    final bytes = file.bytes;
    if (bytes == null) {
      setState(() => _error = 'No se pudo leer el archivo.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _result = null;
    });
    try {
      final result =
          await getIt<BudgetRepository>().importTransactions(bytes, file.name);
      // El import afecta varios meses: refrescar todo lo derivado.
      ref.invalidate(categoriesListProvider);
      ref.invalidate(accountsListProvider);
      ref.invalidate(budgetSummaryProvider);
      ref.invalidate(monthTransactionsProvider);
      ref.invalidate(monthTransfersProvider);
      if (!mounted) return;
      setState(() => _result = result);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Importar movimientos')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Icon(Icons.upload_file_outlined, size: 64, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('Importa desde un archivo',
                textAlign: TextAlign.center, style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'Sube un archivo XLSX o CSV con tus movimientos. Se crean las '
              'cuentas y categorías que falten, y las transferencias entre cuentas.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _loading ? null : _pickAndImport,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              icon: _loading
                  ? const SizedBox(
                      height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.5))
                  : const Icon(Icons.folder_open),
              label: Text(_loading ? 'Importando...' : 'Elegir archivo'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 20),
              _ErrorCard(message: _error!),
            ],
            if (_result != null) ...[
              const SizedBox(height: 20),
              _ResultCard(result: _result!),
            ],
          ],
        ),
      ),
    );
  }
}

/// Tarjeta con el resumen de la importacion.
class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});

  final ImportResult result;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.check_circle, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                Text('Importación completa', style: theme.textTheme.titleMedium),
              ],
            ),
            const Divider(height: 24),
            _row('Movimientos', '${result.transactions}'),
            _row('Transferencias', '${result.transfers}'),
            _row('Cuentas creadas', '${result.accountsCreated}'),
            _row('Categorías creadas', '${result.categoriesCreated}'),
            if (result.totalSkipped > 0) ...[
              const Divider(height: 24),
              Text('Omitidos', style: theme.textTheme.titleSmall),
              const SizedBox(height: 4),
              if (result.skippedSummary > 0)
                _row('Filas de resumen', '${result.skippedSummary}'),
              if (result.skippedTransferCounterpart > 0)
                _row('Contrapartes de transferencia', '${result.skippedTransferCounterpart}'),
              if (result.skippedSameAccountTransfer > 0)
                _row('Transferencias a la misma cuenta', '${result.skippedSameAccountTransfer}'),
              if (result.skippedInvalid > 0)
                _row('Filas inválidas', '${result.skippedInvalid}'),
            ],
          ],
        ),
      ),
    );
  }

  /// Fila etiqueta/valor del resumen.
  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Tarjeta de error de importacion.
class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: scheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: scheme.onErrorContainer),
            const SizedBox(width: 8),
            Expanded(
              child: Text(message, style: TextStyle(color: scheme.onErrorContainer)),
            ),
          ],
        ),
      ),
    );
  }
}
