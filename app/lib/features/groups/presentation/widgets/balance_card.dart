import 'package:flutter/material.dart';

import '../../../../shared/money_format.dart';
import '../../domain/entities/group_balance.dart';

/// Tarjeta de saldo neto de un miembro dentro del grupo.
/// Muestra el nombre del miembro y su balance:
/// verde si le deben, rojo si debe.
/// @param member - Saldo neto del miembro.
class BalanceCard extends StatelessWidget {
  const BalanceCard({super.key, required this.member});

  final MemberBalance member;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPositive = member.net >= 0;
    final amountColor =
        isPositive ? const Color(0xFF2E7D32) : theme.colorScheme.error;
    final label = isPositive ? 'le deben' : 'debe';

    return ListTile(
      leading: CircleAvatar(
        backgroundColor: theme.colorScheme.primaryContainer,
        child: Text(
          member.displayName.isNotEmpty
              ? member.displayName[0].toUpperCase()
              : '?',
          style: TextStyle(
            color: theme.colorScheme.onPrimaryContainer,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      title: Text(member.displayName),
      subtitle: Text(label),
      trailing: Text(
        formatCop(member.net.abs()),
        style: theme.textTheme.titleSmall?.copyWith(
          color: amountColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
