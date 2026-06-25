import 'dart:typed_data';

import '../entities/account.dart';
import '../entities/account_yield.dart';
import '../entities/budget_params.dart';
import '../entities/budget_summary.dart';
import '../entities/card_installment.dart';
import '../entities/card_statement.dart';
import '../entities/category.dart';
import '../entities/credit_card.dart';
import '../entities/import_result.dart';
import '../entities/transaction.dart';
import '../entities/transfer.dart';
import '../entities/upcoming_card_payment.dart';

/// Contrato del repositorio de presupuesto (categorias, movimientos, resumen).
abstract class BudgetRepository {
  /// Lista las categorias del usuario.
  Future<List<Category>> getCategories();

  /// Crea una categoria.
  /// @param params - Datos de la categoria.
  /// @return La categoria creada.
  Future<Category> createCategory(CreateCategoryParams params);

  /// Actualiza una categoria existente.
  /// @param id - UUID de la categoria.
  /// @param params - Campos a actualizar.
  /// @return La categoria actualizada.
  Future<Category> updateCategory(String id, UpdateCategoryParams params);

  /// Elimina (soft delete) una categoria.
  /// @param id - UUID de la categoria.
  Future<void> deleteCategory(String id);

  /// Lista los movimientos de un mes.
  /// @param month - Mes YYYY-MM.
  Future<List<Transaction>> getTransactions(String month);

  /// Registra un movimiento.
  /// @param params - Datos del movimiento.
  /// @return El movimiento creado.
  Future<Transaction> createTransaction(CreateTransactionParams params);

  /// Elimina un movimiento.
  /// @param id - UUID del movimiento.
  Future<void> deleteTransaction(String id);

  /// Obtiene el resumen del presupuesto de un mes.
  /// @param month - Mes YYYY-MM.
  Future<BudgetSummary> getSummary(String month);

  /// Lista las cuentas del usuario.
  Future<List<Account>> getAccounts();

  /// Crea una cuenta.
  Future<Account> createAccount(CreateAccountParams params);

  /// Actualiza una cuenta.
  Future<Account> updateAccount(String id, UpdateAccountParams params);

  /// Elimina (soft delete) una cuenta.
  Future<void> deleteAccount(String id);

  /// Lista las transferencias de un mes.
  /// @param month - Mes YYYY-MM.
  Future<List<Transfer>> getTransfers(String month);

  /// Registra una transferencia entre cuentas.
  Future<Transfer> createTransfer(CreateTransferParams params);

  /// Elimina una transferencia.
  Future<void> deleteTransfer(String id);

  /// Importa movimientos desde un archivo XLSX/CSV.
  /// @param bytes - Contenido del archivo.
  /// @param filename - Nombre del archivo (para el envio multipart).
  /// @return El resumen de la importacion.
  Future<ImportResult> importTransactions(Uint8List bytes, String filename);

  /// Configura el rendimiento de una cuenta (remunerada o CDT).
  Future<Account> setAccountYield(String accountId, SetYieldParams params);

  /// Registra el saldo real de una cuenta en una fecha.
  Future<AccountSnapshot> addSnapshot(String accountId, CreateSnapshotParams params);

  /// Lista los snapshots de saldo de una cuenta.
  Future<List<AccountSnapshot>> getSnapshots(String accountId);

  /// Elimina un snapshot de saldo.
  Future<void> deleteSnapshot(String snapshotId);

  /// Obtiene la proyeccion de crecimiento de una cuenta con rendimiento.
  Future<AccountProjection> getProjection(String accountId);

  /// Obtiene la serie de patrimonio total por fecha.
  Future<List<NetWorthPoint>> getNetWorth();

  // --- Tarjetas de credito ---

  /// Lista las tarjetas de credito del usuario.
  Future<List<CreditCard>> getCards();

  /// Crea una tarjeta de credito.
  /// @param params - Datos de la tarjeta.
  /// @return La tarjeta creada.
  Future<CreditCard> createCard(CreateCardParams params);

  /// Actualiza una tarjeta de credito.
  /// @param id - UUID de la tarjeta.
  /// @param params - Campos a actualizar.
  /// @return La tarjeta actualizada.
  Future<CreditCard> updateCard(String id, UpdateCardParams params);

  /// Obtiene el extracto estimado/reconciliado del ciclo actual de una tarjeta.
  /// @param id - UUID de la tarjeta.
  Future<CardStatement> getCardStatement(String id);

  /// Reconcilia el extracto de una tarjeta con los valores reales del banco.
  /// @param id - UUID de la tarjeta.
  /// @param params - Datos del extracto real.
  /// @return El extracto actualizado.
  Future<CardStatement> reconcileStatement(String id, ReconcileStatementParams params);

  /// Lista los planes diferidos activos de una tarjeta.
  /// @param id - UUID de la tarjeta.
  Future<List<CardInstallmentPlan>> getCardInstallments(String id);

  /// Obtiene los proximos pagos estimados de todas las tarjetas del usuario.
  Future<List<UpcomingCardPayment>> getUpcomingCardPayments();
}
