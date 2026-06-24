import { ForbiddenException } from '@nestjs/common';
import { GroupsRepository } from './groups.repository';
import { BalanceRepository } from './balance.repository';
import { BalanceService } from './balance.service';

type GroupsRepo = jest.Mocked<GroupsRepository>;
type BalanceRepo = jest.Mocked<BalanceRepository>;

function makeGroupsRepo(): GroupsRepo {
  return {
    findActiveMember: jest.fn().mockResolvedValue(undefined),
    listMembers: jest.fn().mockResolvedValue([]),
    createGroup: jest.fn(),
    findGroupsForUser: jest.fn().mockResolvedValue([]),
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
  } as unknown as BalanceRepo;
}

/**
 * Construye un BalanceService con los repos mockeados.
 * Ya no depende de GroupsService: inyecta BalanceRepository y GroupsRepository directamente.
 */
function makeService(
  balanceRepo: BalanceRepo,
  groupsRepo: GroupsRepo,
): BalanceService {
  return new BalanceService(balanceRepo, groupsRepo);
}

/**
 * Escenario de referencia: 90 000 pagado por mA, dividido entre 3 (mA, mB, mC).
 * Cada uno debe 30 000. mA pagó 90 000 → neto mA = +60 000.
 * mB neto = -30 000, mC neto = -30 000.
 * Deudas: mB→mA 30 000, mC→mA 30 000.
 */
describe('BalanceService.getBalance', () => {
  const GROUP_ID = 'group-1';
  const USER_ID = 'user-1';
  const mA = 'member-a';
  const mB = 'member-b';
  const mC = 'member-c';

  const members = [
    { id: mA, groupId: GROUP_ID, userId: USER_ID, displayName: 'Ana', removedAt: null },
    { id: mB, groupId: GROUP_ID, userId: 'u2', displayName: 'Bruno', removedAt: null },
    { id: mC, groupId: GROUP_ID, userId: null, displayName: 'Carlos', removedAt: null },
  ];

  it('calcula netos y deudas para el caso 90000 entre 3', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    // El usuario es miembro activo
    groupsRepo.findActiveMember.mockResolvedValue({ id: mA, groupId: GROUP_ID, userId: USER_ID } as never);
    // listMembers devuelve los 3 miembros
    groupsRepo.listMembers.mockResolvedValue(members as never);

    // Un gasto de 90 000 pagado por mA, partes iguales de 30 000
    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: mA,
        shares: [
          { memberId: mA, shareAmount: '30000.00' },
          { memberId: mB, shareAmount: '30000.00' },
          { memberId: mC, shareAmount: '30000.00' },
        ],
      },
    ]);

    // Sin settlements
    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = makeService(balanceRepo, groupsRepo);
    const result = await service.getBalance(GROUP_ID, USER_ID);

    // Verifica los netos
    const netA = result.members.find((m) => m.memberId === mA);
    const netB = result.members.find((m) => m.memberId === mB);
    const netC = result.members.find((m) => m.memberId === mC);

    expect(netA?.net).toBeCloseTo(60000, 1);
    expect(netB?.net).toBeCloseTo(-30000, 1);
    expect(netC?.net).toBeCloseTo(-30000, 1);

    // Verifica los displayNames
    expect(netA?.displayName).toBe('Ana');
    expect(netB?.displayName).toBe('Bruno');
    expect(netC?.displayName).toBe('Carlos');

    // Verifica las deudas
    expect(result.debts).toHaveLength(2);
    const debtB = result.debts.find((d) => d.fromMemberId === mB);
    const debtC = result.debts.find((d) => d.fromMemberId === mC);
    expect(debtB?.toMemberId).toBe(mA);
    expect(debtB?.amount).toBeCloseTo(30000, 1);
    expect(debtC?.toMemberId).toBe(mA);
    expect(debtC?.amount).toBeCloseTo(30000, 1);

    // Verifica fromName / toName
    expect(debtB?.fromName).toBe('Bruno');
    expect(debtB?.toName).toBe('Ana');
  });

  it('con un settlement, reduce la deuda pendiente', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    groupsRepo.findActiveMember.mockResolvedValue({ id: mA } as never);
    groupsRepo.listMembers.mockResolvedValue(members as never);

    // Mismo gasto de 90 000
    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: mA,
        shares: [
          { memberId: mA, shareAmount: '30000.00' },
          { memberId: mB, shareAmount: '30000.00' },
          { memberId: mC, shareAmount: '30000.00' },
        ],
      },
    ]);

    // mB ya le pagó 30 000 a mA
    balanceRepo.findSettlements.mockResolvedValue([
      { fromMemberId: mB, toMemberId: mA, amount: '30000.00' },
    ]);

    const service = makeService(balanceRepo, groupsRepo);
    const result = await service.getBalance(GROUP_ID, USER_ID);

    // mB ya está saldado → neto 0, solo mC debe
    const netB = result.members.find((m) => m.memberId === mB);
    expect(netB?.net).toBeCloseTo(0, 1);

    const debtB = result.debts.find((d) => d.fromMemberId === mB);
    expect(debtB).toBeUndefined();

    const debtC = result.debts.find((d) => d.fromMemberId === mC);
    expect(debtC?.amount).toBeCloseTo(30000, 1);
  });

  it('lanza 403 si el usuario no es miembro activo', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();
    // findActiveMember devuelve undefined → no es miembro
    groupsRepo.findActiveMember.mockResolvedValue(undefined);

    const service = makeService(balanceRepo, groupsRepo);

    await expect(service.getBalance(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('BalanceService.getMemberNet (usado por removeMember guard)', () => {
  const GROUP_ID = 'group-1';
  const mA = 'member-a';
  const mB = 'member-b';

  it('devuelve el neto negativo de un miembro que debe dinero', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    const members = [
      { id: mA, displayName: 'Ana', removedAt: null },
      { id: mB, displayName: 'Bruno', removedAt: null },
    ];
    groupsRepo.listMembers.mockResolvedValue(members as never);

    balanceRepo.findExpensesWithShares.mockResolvedValue([
      {
        paidByMemberId: mA,
        shares: [
          { memberId: mA, shareAmount: '15000.00' },
          { memberId: mB, shareAmount: '15000.00' },
        ],
      },
    ]);
    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = makeService(balanceRepo, groupsRepo);

    const net = await service.getMemberNet(GROUP_ID, mB);
    // mB debe 15 000 → neto -15 000
    expect(net).toBeCloseTo(-15000, 1);
  });

  it('devuelve 0 para un miembro sin actividad', async () => {
    const groupsRepo = makeGroupsRepo();
    const balanceRepo = makeBalanceRepo();

    const mD = 'member-d';
    groupsRepo.listMembers.mockResolvedValue([
      { id: mA, displayName: 'Ana', removedAt: null },
      { id: mD, displayName: 'David', removedAt: null },
    ] as never);
    balanceRepo.findExpensesWithShares.mockResolvedValue([]);
    balanceRepo.findSettlements.mockResolvedValue([]);

    const service = makeService(balanceRepo, groupsRepo);
    const net = await service.getMemberNet(GROUP_ID, mD);
    expect(net).toBe(0);
  });
});
