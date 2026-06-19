import 'package:injectable/injectable.dart';

import '../../domain/entities/payment.dart';
import '../../domain/entities/payment_result.dart';
import '../../domain/entities/register_payment_params.dart';
import '../../domain/repositories/payments_repository.dart';
import '../datasources/payments_remote_datasource.dart';

/// Implementacion del repositorio de pagos sobre la fuente remota.
@LazySingleton(as: PaymentsRepository)
class PaymentsRepositoryImpl implements PaymentsRepository {
  /// @param remote - Fuente de datos remota.
  PaymentsRepositoryImpl(this._remote);

  final PaymentsRemoteDataSource _remote;

  @override
  Future<PaymentResult> registerPayment(
    String debtId,
    RegisterPaymentParams params,
  ) =>
      _remote.registerPayment(debtId, params);

  @override
  Future<List<Payment>> getPayments(String debtId) => _remote.getPayments(debtId);
}
