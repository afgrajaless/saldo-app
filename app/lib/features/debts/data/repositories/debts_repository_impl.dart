import 'package:injectable/injectable.dart';

import '../../domain/entities/create_debt_params.dart';
import '../../domain/entities/debt.dart';
import '../../domain/entities/debt_detail.dart';
import '../../domain/repositories/debts_repository.dart';
import '../datasources/debts_remote_datasource.dart';

/// Implementacion del repositorio de obligaciones sobre la fuente remota.
@LazySingleton(as: DebtsRepository)
class DebtsRepositoryImpl implements DebtsRepository {
  /// @param remote - Fuente de datos remota.
  DebtsRepositoryImpl(this._remote);

  final DebtsRemoteDataSource _remote;

  @override
  Future<List<Debt>> getDebts() => _remote.getDebts();

  @override
  Future<DebtDetail> getDebt(String id) => _remote.getDebt(id);

  @override
  Future<Debt> createDebt(CreateDebtParams params) => _remote.createDebt(params);

  @override
  Future<void> deleteDebt(String id) => _remote.deleteDebt(id);
}
