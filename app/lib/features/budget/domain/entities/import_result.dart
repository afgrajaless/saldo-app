/// Resumen del resultado de una importacion de movimientos.
class ImportResult {
  const ImportResult({
    required this.transactions,
    required this.transfers,
    required this.accountsCreated,
    required this.categoriesCreated,
    required this.skippedSummary,
    required this.skippedTransferCounterpart,
    required this.skippedSameAccountTransfer,
    required this.skippedInvalid,
  });

  final int transactions;
  final int transfers;
  final int accountsCreated;
  final int categoriesCreated;
  final int skippedSummary;
  final int skippedTransferCounterpart;
  final int skippedSameAccountTransfer;
  final int skippedInvalid;

  /// Total de filas omitidas.
  int get totalSkipped =>
      skippedSummary + skippedTransferCounterpart + skippedSameAccountTransfer + skippedInvalid;
}
