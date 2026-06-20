import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../core/error/api_exception.dart';
import '../domain/entities/account.dart';
import '../domain/entities/account_yield.dart';
import '../domain/entities/budget_params.dart';
import '../domain/entities/budget_summary.dart';
import '../domain/entities/category.dart';
import '../domain/entities/import_result.dart';
import '../domain/entities/transaction.dart';
import '../domain/entities/transfer.dart';
import '../domain/repositories/budget_repository.dart';
import 'budget_mappers.dart';

/// Implementacion del repositorio de presupuesto sobre la API NestJS (Dio).
@LazySingleton(as: BudgetRepository)
class BudgetRepositoryImpl implements BudgetRepository {
  /// @param dio - Cliente HTTP configurado (con el interceptor de auth).
  BudgetRepositoryImpl(this._dio);

  final Dio _dio;

  @override
  Future<List<Category>> getCategories() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/categories');
      return res.data!.map((e) => categoryFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Category> createCategory(CreateCategoryParams params) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/categories', data: params.toJson());
      return categoryFromJson(res.data!);
    });
  }

  @override
  Future<Category> updateCategory(String id, UpdateCategoryParams params) {
    return _send(() async {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/categories/$id',
        data: params.toJson(),
      );
      return categoryFromJson(res.data!);
    });
  }

  @override
  Future<void> deleteCategory(String id) {
    return _send(() => _dio.delete<void>('/categories/$id'));
  }

  @override
  Future<List<Transaction>> getTransactions(String month) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>(
        '/transactions',
        queryParameters: {'month': month},
      );
      return res.data!.map((e) => transactionFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Transaction> createTransaction(CreateTransactionParams params) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/transactions', data: params.toJson());
      return transactionFromJson(res.data!);
    });
  }

  @override
  Future<void> deleteTransaction(String id) {
    return _send(() => _dio.delete<void>('/transactions/$id'));
  }

  @override
  Future<BudgetSummary> getSummary(String month) {
    return _send(() async {
      final res = await _dio.get<Map<String, dynamic>>(
        '/budget/summary',
        queryParameters: {'month': month},
      );
      return budgetSummaryFromJson(res.data!);
    });
  }

  @override
  Future<List<Account>> getAccounts() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/accounts');
      return res.data!.map((e) => accountFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Account> createAccount(CreateAccountParams params) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/accounts', data: params.toJson());
      return accountFromJson(res.data!);
    });
  }

  @override
  Future<Account> updateAccount(String id, UpdateAccountParams params) {
    return _send(() async {
      final res = await _dio.patch<Map<String, dynamic>>('/accounts/$id', data: params.toJson());
      return accountFromJson(res.data!);
    });
  }

  @override
  Future<void> deleteAccount(String id) {
    return _send(() => _dio.delete<void>('/accounts/$id'));
  }

  @override
  Future<List<Transfer>> getTransfers(String month) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>(
        '/transfers',
        queryParameters: {'month': month},
      );
      return res.data!.map((e) => transferFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<Transfer> createTransfer(CreateTransferParams params) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>('/transfers', data: params.toJson());
      return transferFromJson(res.data!);
    });
  }

  @override
  Future<void> deleteTransfer(String id) {
    return _send(() => _dio.delete<void>('/transfers/$id'));
  }

  @override
  Future<ImportResult> importTransactions(Uint8List bytes, String filename) {
    return _send(() async {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final res = await _dio.post<Map<String, dynamic>>(
        '/transactions/import',
        data: form,
        options: Options(
          contentType: Headers.multipartFormDataContentType,
          // El procesamiento del archivo puede tardar mas que una peticion normal.
          receiveTimeout: const Duration(seconds: 60),
          sendTimeout: const Duration(seconds: 60),
        ),
      );
      return importResultFromJson(res.data!);
    });
  }

  @override
  Future<Account> setAccountYield(String accountId, SetYieldParams params) {
    return _send(() async {
      final res = await _dio.put<Map<String, dynamic>>(
        '/accounts/$accountId/yield',
        data: params.toJson(),
      );
      return accountFromJson(res.data!);
    });
  }

  @override
  Future<AccountSnapshot> addSnapshot(String accountId, CreateSnapshotParams params) {
    return _send(() async {
      final res = await _dio.post<Map<String, dynamic>>(
        '/accounts/$accountId/snapshots',
        data: params.toJson(),
      );
      return snapshotFromJson(res.data!);
    });
  }

  @override
  Future<List<AccountSnapshot>> getSnapshots(String accountId) {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/accounts/$accountId/snapshots');
      return res.data!.map((e) => snapshotFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  @override
  Future<void> deleteSnapshot(String snapshotId) {
    return _send(() => _dio.delete<void>('/accounts/snapshots/$snapshotId'));
  }

  @override
  Future<AccountProjection> getProjection(String accountId) {
    return _send(() async {
      final res = await _dio.get<Map<String, dynamic>>('/accounts/$accountId/projection');
      return projectionFromJson(res.data!);
    });
  }

  @override
  Future<List<NetWorthPoint>> getNetWorth() {
    return _send(() async {
      final res = await _dio.get<List<dynamic>>('/accounts/net-worth');
      return res.data!.map((e) => netWorthPointFromJson(e as Map<String, dynamic>)).toList();
    });
  }

  /// Ejecuta una llamada traduciendo los DioException a ApiException.
  /// @param request - Operacion HTTP a ejecutar.
  /// @return El resultado de la operacion.
  Future<T> _send<T>(Future<T> Function() request) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}
