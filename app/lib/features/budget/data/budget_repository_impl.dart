import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

import '../../../core/error/api_exception.dart';
import '../domain/entities/budget_params.dart';
import '../domain/entities/budget_summary.dart';
import '../domain/entities/category.dart';
import '../domain/entities/transaction.dart';
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
