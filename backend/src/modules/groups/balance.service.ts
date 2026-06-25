import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  computeBalances,
  computeDirectDebts,
  ExpenseInput,
  SettlementInput,
} from '../../domain/split/group-balance';
import { BalanceRepository } from './balance.repository';
import { BalanceResponseDto, DebtDto, MemberBalanceDto } from './dto/balance-response.dto';
import { GroupsRepository } from './groups.repository';

/**
 * Servicio de saldo del grupo.
 * Obtiene los datos crudos del repositorio, los mapea a los inputs del dominio
 * y delega el calculo a `computeBalances` / `computeDirectDebts`.
 */
@Injectable()
export class BalanceService {
  constructor(
    private readonly balanceRepository: BalanceRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  /**
   * Calcula el saldo neto de cada miembro activo, la lista de deudas directas del grupo
   * y cuántas partes pendientes tiene el usuario autenticado.
   * Solo miembros reales activos pueden consultar el saldo.
   * @param groupId - UUID del grupo.
   * @param userId - UUID del usuario autenticado.
   * @returns DTO con netos por miembro, deudas directas enriquecidas y conteo de pendientes propios.
   * @throws ForbiddenException si el usuario no es miembro activo del grupo.
   */
  async getBalance(groupId: string, userId: string): Promise<BalanceResponseDto> {
    // Valida que el usuario sea miembro real activo directamente en el repositorio.
    const member = await this.groupsRepository.findActiveMember(groupId, userId);
    if (!member) {
      throw new ForbiddenException('No eres miembro activo del grupo.');
    }

    return this.computeGroupBalance(groupId, member.id);
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
    // Para uso interno no necesitamos myPendingCount; usamos un memberId vacío.
    const result = await this.computeGroupBalance(groupId, memberId);
    const found = result.members.find((m) => m.memberId === memberId);
    return found?.net ?? 0;
  }

  /**
   * Calculo interno del saldo del grupo. Lee gastos+shares, settlements, miembros activos
   * y el conteo de shares pendientes del miembro del usuario en paralelo;
   * delega el calculo al dominio y construye el DTO completo con displayNames.
   * @param groupId - UUID del grupo.
   * @param currentMemberId - UUID del miembro correspondiente al usuario autenticado.
   * @returns DTO completo con netos, deudas directas enriquecidas y myPendingCount.
   */
  private async computeGroupBalance(
    groupId: string,
    currentMemberId: string,
  ): Promise<BalanceResponseDto> {
    // Carga miembros, gastos, settlements y pendientes del usuario en paralelo.
    const [members, rawExpenses, rawSettlements, myPendingCount] = await Promise.all([
      this.groupsRepository.listMembers(groupId),
      this.balanceRepository.findExpensesWithShares(groupId),
      this.balanceRepository.findSettlements(groupId),
      this.balanceRepository.countMyPendingShares(groupId, currentMemberId),
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
        status: s.status,
      })),
    }));

    const settlementsInput: SettlementInput[] = rawSettlements.map((s) => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amount: Number(s.amount),
    }));

    // Delega el calculo al dominio puro.
    const balances = computeBalances(expenses, settlementsInput, memberIds);
    const directDebts = computeDirectDebts(expenses, settlementsInput);

    // Construye el DTO de respuesta adjuntando displayNames.
    const memberDtos: MemberBalanceDto[] = balances.map((b) => ({
      memberId: b.memberId,
      displayName: nameByMember.get(b.memberId) ?? b.memberId,
      net: b.net,
    }));

    const debtDtos: DebtDto[] = directDebts.map((d) => ({
      fromMemberId: d.fromMemberId,
      fromName: nameByMember.get(d.fromMemberId) ?? d.fromMemberId,
      toMemberId: d.toMemberId,
      toName: nameByMember.get(d.toMemberId) ?? d.toMemberId,
      owed: d.owed,
      pendingOwed: d.pendingOwed,
      hasPending: d.hasPending,
    }));

    return { members: memberDtos, debts: debtDtos, myPendingCount };
  }
}
