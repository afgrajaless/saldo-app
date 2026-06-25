/// Resumen del resultado de una sincronización.
class SyncSummary {
  const SyncSummary({
    required this.accountsCreated,
    required this.accountsUpdated,
    required this.cardsCreated,
    required this.cardsUpdated,
    required this.debtsCreated,
    required this.debtsUpdated,
    required this.skipped,
  });

  final int accountsCreated;
  final int accountsUpdated;
  final int cardsCreated;
  final int cardsUpdated;
  final int debtsCreated;
  final int debtsUpdated;
  final int skipped;

  /// Total de productos integrados (creados + actualizados).
  int get totalIntegrated =>
      accountsCreated + accountsUpdated + cardsCreated + cardsUpdated + debtsCreated + debtsUpdated;
}
