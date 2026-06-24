import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  computeBalances,
  deriveDebts,
  ExpenseInput,
  SettlementInput,
} from '../../domain/split/group-balance';
import { BalanceRepository } from './balance.repository';
import { BalanceResponseDto, DebtDto, MemberBalanceDto } from './dto/balance-response.dto';
import { GroupsRepository } from './groups.repository';

/**
 * Servicio de saldo del grupo.
 * Obtiene los datos crudos del repositorio, los mapea a los inputs del dominio
 * y delega el calculo a `computeBalances` / `deriveDebts`.
 */
@Injectable()
export class BalanceService {
  constructor(
    private readonly balanceRepository: BalanceRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  /**
   * Calcula el saldo neto de cada miembro activo y la lista de deudas pairwise del grupo.
   * Solo miembros reales activos pueden consultar el saldo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns DTO con netos por miembro y deudas derivadas.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   */
  async getBalance(groupId: string, userId: string): Promise<BalanceResponseDto> {
    // Valida que el usuario sea miembro real activo directamente en el repositorio.
    const member = await this.groupsRepository.findActiveMember(groupId, userId);
    if (!member) {
      throw new ForbiddenException('No eres miembro activo del grupo.');
    }

    return this.computeGroupBalance(groupId);
  }

  /**
   * Devuelve el neto de un miembro especifico dentro del grupo.
   * Uso interno: el guard de `removeMember` llama esto para bloquear la operacion
   * si el miembro tiene saldo pendiente distinto de 0.
   * @param groupId - UUID del grupo.
   * @param memberId - UUID del miembro cuyo neto se quiere calcular.
   * @returns El neto del miembro (positivo = le deben, negativo = debe, 0 = saldado).
   */
  async getMemberNet(groupId: string, memberId: string): Promise<number> {
    const result = await this.computeGroupBalance(groupId);
    const found = result.members.find((m) => m.memberId === memberId);
    return found?.net ?? 0;
  }

  /**
   * Calculo interno del saldo del grupo. Lee gastos+shares, settlements y miembros activos
   * en paralelo; delega el calculo al dominio y construye el DTO completo con displayNames.
   * @param groupId - UUID del grupo.
   * @returns DTO completo con netos y deudas.
   */
  private async computeGroupBalance(groupId: string): Promise<BalanceResponseDto> {
    // Carga miembros, gastos y settlements en paralelo (lecturas independientes).
    const [members, rawExpenses, rawSettlements] = await Promise.all([
      this.groupsRepository.listMembers(groupId),
      this.balanceRepository.findExpensesWithShares(groupId),
      this.balanceRepository.findSettlements(groupId),
    ]);

    const memberIds = members.map((m) => m.id);

    // Construye un mapa id→displayName para adjuntarlo a la respuesta.
    const nameByMember = new Map<string, string>(
      members.map((m) => [m.id, m.displayName]),
    );

    // Convierte los datos crudos a los inputs del dominio (string→number).
    const expenses: ExpenseInput[] = rawExpenses.map((e) => ({
      paidByMemberId: e.paidByMemberId,
      shares: e.shares.map((s) => ({
        memberId: s.memberId,
        shareAmount: Number(s.shareAmount),
      })),
    }));

    const settlementsInput: SettlementInput[] = rawSettlements.map((s) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amount: Number(s.amount),
    }));

    // Delega el calculo al dominio puro.
    const balances = computeBalances(expenses, settlementsInput, memberIds);
    const debts = deriveDebts(balances);

    // Construye el DTO de respuesta adjuntando displayNames.
    const memberDtos: MemberBalanceDto[] = balances.map((b) => ({
      memberId: b.memberId,
      displayName: nameByMember.get(b.memberId) ?? b.memberId,
      net: b.net,
    }));

    const debtDtos: DebtDto[] = debts.map((d) => ({
      fromMemberId: d.fromMemberId,
      fromName: nameByMember.get(d.fromMemberId) ?? d.fromMemberId,
      toMemberId: d.toMemberId,
      toName: nameByMember.get(d.toMemberId) ?? d.toMemberId,
      amount: d.amount,
    }));

    return { members: memberDtos, debts: debtDtos };
  }
}
