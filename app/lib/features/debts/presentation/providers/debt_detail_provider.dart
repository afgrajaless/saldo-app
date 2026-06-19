import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../domain/entities/debt_detail.dart';
import '../../domain/repositories/debts_repository.dart';

part 'debt_detail_provider.g.dart';

/// Provee el detalle (con cronograma) de una deuda por su id.
/// @param ref - Referencia del provider.
/// @param id - UUID de la deuda.
/// @return El detalle de la deuda.
@riverpod
Future<DebtDetail> debtDetail(Ref ref, String id) {
  return getIt<DebtsRepository>().getDebt(id);
}
