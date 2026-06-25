import { Injectable } from '@nestjs/common';
import {
  computeDirectDebts,
  ExpenseInput,
  SettlementInput,
} from '../../domain/split/group-balance';
import { BalanceRepository } from './balance.repository';
import { GroupsRepository } from './groups.repository';
import { MyGroupDebtDto } from './dto/my-debts-response.dto';

/**
 * Servicio que agrega las deudas propias del usuario en todos sus grupos activos.
 * Itera cada grupo, calcula las deudas directas usando el dominio y filtra
 * solo las entradas donde el usuario es el deudor con monto mayor a 0.
 */
@Injectable()
export class MyDebtsService {
  constructor(
    private readonly balanceRepository: BalanceRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  /**
   * Calcula todo lo que el usuario debe en cada uno de sus grupos activos.
   * Para cada grupo: obtiene el memberId del usuario, carga gastos/shares/settlements,
   * delega el calculo al dominio y filtra las deudas donde fromMemberId === miMemberId.
   * El resultado se ordena de mayor a menor por amountOwed.
   * @param userId - UUID del usuario autenticado.
   * @returns Lista plana de deudas del usuario en todos sus grupos, ordenada por monto desc.
   */
  async getMyGroupDebts(userId: string): Promise<MyGroupDebtDto[]> {
    const groups = await this.groupsRepository.findGroupsForUser(userId);
    if (groups.length === 0) return [];

    const allDebts: MyGroupDebtDto[] = [];

    // Procesamos cada grupo secuencialmente para evitar sobrecarga de conexiones.
    // En un volumen bajo de grupos (limite 200) esto es aceptable y correcto.
    for (const group of groups) {
      const groupDebts = await this.computeDebtsInGroup(userId, group.id, group.name);
      allDebts.push(...groupDebts);
    }

    // Ordena de mayor a menor por monto adeudado.
    allDebts.sort((a, b) => b.amountOwed - a.amountOwed);

    return allDebts;
  }

  /**
   * Calcula las deudas propias del usuario en un grupo especifico.
   * Resuelve el memberId del usuario en el grupo, luego carga datos y delega al dominio.
   * @param userId - UUID del usuario.
   * @param groupId - UUID del grupo.
   * @param groupName - Nombre del grupo (para incluir en el DTO).
   * @returns Lista de deudas del usuario en el grupo (puede estar vacia si no debe nada).
   */
  private async computeDebtsInGroup(
    userId: string,
    groupId: string,
    groupName: string,
  ): Promise<MyGroupDebtDto[]> {
    // Obtiene el miembro real activo del usuario en este grupo.
    const myMember = await this.groupsRepository.findActiveMember(groupId, userId);
    if (!myMember) return [];

    // Carga miembros, gastos y settlements en paralelo.
    const [members, rawExpenses, rawSettlements] = await Promise.all([
      this.groupsRepository.listMembers(groupId),
      this.balanceRepository.findExpensesWithShares(groupId),
      this.balanceRepository.findSettlements(groupId),
    ]);

    // Construye mapa id→displayName para resolver el creditorName.
    const nameByMember = new Map<string, string>(
      members.map((m) => [m.id, m.displayName]),
    );

    // Convierte datos crudos a los inputs del dominio (string→number).
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

    // Calcula las deudas directas del grupo usando el dominio puro.
    const directDebts = computeDirectDebts(expenses, settlementsInput);

    // Filtra solo las deudas donde el usuario autenticado es el deudor.
    return directDebts
      .filter((d) => d.fromMemberId === myMember.id && d.owed > 0)
      .map((d) => ({
        groupId,
        groupName,
        creditorMemberId: d.toMemberId,
        creditorName: nameByMember.get(d.toMemberId) ?? d.toMemberId,
        amountOwed: d.owed,
        pendingAmount: d.pendingOwed,
        hasPending: d.hasPending,
      }));
  }
}
