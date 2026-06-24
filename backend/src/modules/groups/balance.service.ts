import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  computeBalances,
  deriveDebts,
  ExpenseInput,
  SettlementInput,
} from '../../domain/split/group-balance';
import { BalanceRepository } from './balance.repository';
import { BalanceResponseDto, DebtDto, MemberBalanceDto } from './dto/balance-response.dto';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';

/**
 * Servicio de saldo del grupo.
 * Obtiene los datos crudos del repositorio, los mapea a los inputs del dominio
 * y delega el calculo a `computeBalances` / `deriveDebts`.
 * Se inyecta con forwardRef en GroupsService para evitar dependencia circular.
 */
@Injectable()
export class BalanceService {
  constructor(
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,
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
    // Valida que el usuario sea miembro real activo.
    await this.groupsService.assertActiveMember(groupId, userId);

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
   * Calculo interno del saldo del grupo. Lee gastos+shares, settlements y miembros activos;
   * delega el calculo al dominio y construye el DTO completo con displayNames.
   * @param groupId - UUID del grupo.
   * @returns DTO completo con netos y deudas.
   */
  private async computeGroupBalance(groupId: string): Promise<BalanceResponseDto> {
    // Carga los miembros activos para obtener IDs y displayNames.
    const members = await this.groupsRepository.listMembers(groupId);
    const memberIds = members.map((m) => m.id);

    // Construye un mapa id→displayName para adjuntarlo a la respuesta.
    const nameByMember = new Map<string, string>(
      members.map((m) => [m.id, m.displayName]),
    );

    // Carga los datos crudos del repositorio de balance en paralelo.
    const [rawExpenses, rawSettlements] = await Promise.all([
      this.balanceRepository.findExpensesWithShares(groupId),
      this.balanceRepository.findSettlements(groupId),
    ]);

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
