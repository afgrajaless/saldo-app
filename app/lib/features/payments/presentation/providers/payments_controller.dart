import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/di/injection.dart';
import '../../../debts/presentation/providers/debt_detail_provider.dart';
import '../../../debts/presentation/providers/debts_controller.dart';
import '../../domain/entities/payment_result.dart';
import '../../domain/entities/register_payment_params.dart';
import '../../domain/repositories/payments_repository.dart';

part 'payments_controller.g.dart';

/// Controlador de pagos. Registra pagos/abonos y refresca el detalle y la lista
/// de deudas afectadas (el abono reescribe el cronograma).
@riverpod
class PaymentsController extends _$PaymentsController {
  @override
  void build() {}

  /// Registra un pago sobre una deuda y refresca los datos derivados.
  /// @param debtId - UUID de la deuda.
  /// @param params - Datos del pago.
  /// @return El resultado del pago (incluye el resumen si es abono).
  Future<PaymentResult> register(
    String debtId,
    RegisterPaymentParams params,
  ) async {
    final result = await getIt<PaymentsRepository>().registerPayment(debtId, params);
    ref.invalidate(debtDetailProvider(debtId));
    ref.invalidate(debtsControllerProvider);
    return result;
  }
}
