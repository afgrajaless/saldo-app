import { MyDebtsService } from './my-debts.service';
import { GroupsRepository } from './groups.repository';
import { BalanceRepository } from './balance.repository';

type GroupsRepo = jest.Mocked<GroupsRepository>;
type BalanceRepo = jest.Mocked<BalanceRepository>;

function makeGroupsRepo(): GroupsRepo {
  return {
    findGroupsForUser: jest.fn().mockResolvedValue([]),
    findActiveMember: jest.fn().mockResolvedValue(undefined),
    listMembers: jest.fn().mockResolvedValue([]),
    createGroup: jest.fn(),
    findGroupForMember: jest.fn().mockResolvedValue(undefined),
    renameOrArchive: jest.fn(),
    leaveGroup: jest.fn(),
    addGhostMember: jest.fn(),
    removeMember: jest.fn(),
    createInvite: jest.fn(),
    findInviteByCode: jest.fn().mockResolvedValue(undefined),
    joinGroupAtomically: jest.fn().mockResolvedValue(undefined),
    findGroupById: jest.fn().mockResolvedValue(undefined),
    resolveDisplayName: jest.fn().mockResolvedValue('Usuario'),
  } as unknown as GroupsRepo;
}

function makeBalanceRepo(): BalanceRepo {
  return {
    findExpensesWithShares: jest.fn().mockResolvedValue([]),
    findSettlements: jest.fn().mockResolvedValue([]),
    countMyPendingShares: jest.fn().mockResolvedValue(0),
  } as unknown as BalanceRepo;
}

/**
 * Suite de tests para MyDebtsService.getMyGroupDebts.
 * Verifica que el agregado de deudas del usuario en todos sus grupos
 * devuelva los datos correctos con el calculo del dominio.
 */
describe('MyDebtsService.getMyGroupDebts', () => {
  const USER_ID = 'user-1';
  const GROUP_ID = 'group-abc';
  const MY_MEMBER_ID = 'member-me';
  const CREDITOR_ID = 'member-ana';

  it('usuario en 1 grupo donde debe 30000 (pendiente) → devuelve 1 entrada correcta', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    // El usuario pertenece a un grupo activo
    groupsRepo.findGroupsForUser.mockResolvedValue([
      {
        id: GROUP_ID,
        name: 'Viaje a Cartagena',
        createdBy: 'user-otra',
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    // El usuario es el miembro MY_MEMBER_ID en ese grupo
    groupsRepo.findActiveMember.mockResolvedValue({
      id: MY_MEMBER_ID,
      groupId: GROUP_ID,
      userId: USER_ID,
      displayName: 'Yo',
      removedAt: null,
    } as never);

    // Miembros del grupo: el usuario (MY_MEMBER_ID) y Ana (CREDITOR_ID)
    groupsRepo.listMembers.mockResolvedValue([
      { id: MY_MEMBER_ID, groupId: GROUP_ID, userId: USER_ID, displayName: 'Yo', removedAt: null },
      { id: CREDITOR_ID, groupId: GROUP_ID, userId: 'user-ana', displayName: 'Ana García', removedAt: null },
    ] as never);

    // Un gasto de 60000 pagado por Ana, dividido: Ana 30000, Yo 30000 (pendiente)
    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: CREDITOR_ID,
        shares: [
          { memberId: CREDITOR_ID, shareAmount: '30000.00', status: 'confirmed' },
          { memberId: MY_MEMBER_ID, shareAmount: '30000.00', status: 'pending' },
        ],
      },
    ]);
    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = new MyDebtsService(balanceRepo, groupsRepo);
    const result = await service.getMyGroupDebts(USER_ID);

    expect(result).toHaveLength(1);

    const [debt] = result;
    expect(debt.groupId).toBe(GROUP_ID);
    expect(debt.groupName).toBe('Viaje a Cartagena');
    expect(debt.creditorMemberId).toBe(CREDITOR_ID);
    expect(debt.creditorName).toBe('Ana García');
    expect(debt.amountOwed).toBeCloseTo(30000, 1);
    expect(debt.pendingAmount).toBeCloseTo(30000, 1);
    expect(debt.hasPending).toBe(true);
  });

  it('usuario sin deudas (ya liquido todo) → lista vacia', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    groupsRepo.findGroupsForUser.mockResolvedValue([
      { id: GROUP_ID, name: 'Grupo test', createdBy: 'u2', archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ] as never);
    groupsRepo.findActiveMember.mockResolvedValue({ id: MY_MEMBER_ID, groupId: GROUP_ID, userId: USER_ID } as never);
    groupsRepo.listMembers.mockResolvedValue([
      { id: MY_MEMBER_ID, displayName: 'Yo', removedAt: null },
      { id: CREDITOR_ID, displayName: 'Ana García', removedAt: null },
    ] as never);

    // El mismo gasto pero ya hay settlement que cancela la deuda
    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: CREDITOR_ID,
        shares: [
          { memberId: CREDITOR_ID, shareAmount: '30000.00', status: 'confirmed' },
          { memberId: MY_MEMBER_ID, shareAmount: '30000.00', status: 'confirmed' },
        ],
      },
    ]);
    balanceRepo.findSettlements.mockResolvedValue([
      { fromMemberId: MY_MEMBER_ID, toMemberId: CREDITOR_ID, amount: '30000.00' },
    ]);

    const service = new MyDebtsService(balanceRepo, groupsRepo);
    const result = await service.getMyGroupDebts(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('usuario en 2 grupos con deudas → devuelve 2 entradas ordenadas por monto desc', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    const GROUP_2 = 'group-xyz';
    const MY_MEMBER_2 = 'member-me-2';
    const CREDITOR_2 = 'member-bob';

    groupsRepo.findGroupsForUser.mockResolvedValue([
      { id: GROUP_ID, name: 'Viaje', createdBy: 'u2', archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: GROUP_2, name: 'Piso compartido', createdBy: 'u3', archivedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ] as never);

    groupsRepo.findActiveMember
      .mockResolvedValueOnce({ id: MY_MEMBER_ID, groupId: GROUP_ID, userId: USER_ID } as never)
      .mockResolvedValueOnce({ id: MY_MEMBER_2, groupId: GROUP_2, userId: USER_ID } as never);

    groupsRepo.listMembers
      .mockResolvedValueOnce([
        { id: MY_MEMBER_ID, displayName: 'Yo', removedAt: null },
        { id: CREDITOR_ID, displayName: 'Ana García', removedAt: null },
      ] as never)
      .mockResolvedValueOnce([
        { id: MY_MEMBER_2, displayName: 'Yo', removedAt: null },
        { id: CREDITOR_2, displayName: 'Bob', removedAt: null },
      ] as never);

    balanceRepo.findExpensesWithShares
      .mockResolvedValueOnce([
        {
          paidByMemberId: CREDITOR_ID,
          shares: [
            { memberId: CREDITOR_ID, shareAmount: '20000.00', status: 'confirmed' },
            { memberId: MY_MEMBER_ID, shareAmount: '20000.00', status: 'confirmed' },
          ],
        },
      ])
      .mockResolvedValueOnce([
        {
          paidByMemberId: CREDITOR_2,
          shares: [
            { memberId: CREDITOR_2, shareAmount: '50000.00', status: 'confirmed' },
            { memberId: MY_MEMBER_2, shareAmount: '50000.00', status: 'pending' },
          ],
        },
      ]);

    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = new MyDebtsService(balanceRepo, groupsRepo);
    const result = await service.getMyGroupDebts(USER_ID);

    expect(result).toHaveLength(2);
    // Ordenado por amountOwed desc: 50000 primero, 20000 segundo
    expect(result[0].amountOwed).toBeCloseTo(50000, 1);
    expect(result[0].groupName).toBe('Piso compartido');
    expect(result[1].amountOwed).toBeCloseTo(20000, 1);
    expect(result[1].groupName).toBe('Viaje');
  });

  it('usuario sin grupos → lista vacia', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    groupsRepo.findGroupsForUser.mockResolvedValue([]);

    const service = new MyDebtsService(balanceRepo, groupsRepo);
    const result = await service.getMyGroupDebts(USER_ID);

    expect(result).toHaveLength(0);
  });

  it('grupo archivado con deuda → NO aparece en resultado', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    const ACTIVE_GROUP_ID = 'group-active';

    // El usuario pertenece a un grupo archivado (con deuda) y uno activo
    groupsRepo.findGroupsForUser.mockResolvedValue([
      {
        id: 'group-archived',
        name: 'Viaje Pasado',
        createdBy: 'user-otra',
        archivedAt: new Date('2025-01-01'), // Archivado
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ACTIVE_GROUP_ID,
        name: 'Viaje Actual',
        createdBy: 'user-otra',
        archivedAt: null, // Activo
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    // Solo el grupo activo es procesado (findActiveMember llamado una vez)
    groupsRepo.findActiveMember.mockResolvedValue({
      id: MY_MEMBER_ID,
      groupId: ACTIVE_GROUP_ID,
      userId: USER_ID,
      displayName: 'Yo',
      removedAt: null,
    } as never);

    // Solo miembros del grupo activo
    groupsRepo.listMembers.mockResolvedValue([
      { id: MY_MEMBER_ID, displayName: 'Yo', removedAt: null },
      { id: CREDITOR_ID, displayName: 'Ana García', removedAt: null },
    ] as never);

    // Gasto en el grupo activo
    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: CREDITOR_ID,
        shares: [
          { memberId: CREDITOR_ID, shareAmount: '10000.00', status: 'confirmed' },
          { memberId: MY_MEMBER_ID, shareAmount: '10000.00', status: 'confirmed' },
        ],
      },
    ]);

    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = new MyDebtsService(balanceRepo, groupsRepo);
    const result = await service.getMyGroupDebts(USER_ID);

    // Solo debería devolver la deuda del grupo activo, no la del archivado
    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe(ACTIVE_GROUP_ID);
    expect(result[0].groupName).toBe('Viaje Actual');
    expect(result[0].amountOwed).toBeCloseTo(10000, 1);

    // Verifica que computeDebtsInGroup fue llamado solo UNA VEZ (para el grupo activo)
    expect(groupsRepo.findActiveMember).toHaveBeenCalledTimes(1);
    expect(groupsRepo.listMembers).toHaveBeenCalledTimes(1);
  });
});
