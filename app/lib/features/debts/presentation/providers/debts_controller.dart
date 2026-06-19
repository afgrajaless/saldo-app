import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/create_debt_params.dart';
import '../../domain/entities/debt.dart';
import '../../domain/repositories/debts_repository.dart';

part 'debts_controller.g.dart';

/// Controlador de la lista de obligaciones del usuario.
@riverpod
class DebtsController extends _$DebtsController {
  @override
  Future<List<Debt>> build() => getIt<DebtsRepository>().getDebts();

  /// Recarga la lista de deudas desde el backend.
  Future<void> refresh() async {
    state = await AsyncValue.guard(() => getIt<DebtsRepository>().getDebts());
  }

  /// Crea una deuda y recarga la lista.
  /// @param params - Datos de la nueva deuda.
  /// @return La deuda creada.
  Future<Debt> createDebt(CreateDebtParams params) async {
    final debt = await getIt<DebtsRepository>().createDebt(params);
    await refresh();
    return debt;
  }

  /// Elimina una deuda y recarga la lista.
  /// @param id - UUID de la deuda.
  Future<void> deleteDebt(String id) async {
    await getIt<DebtsRepository>().deleteDebt(id);
    await refresh();
  }
}
