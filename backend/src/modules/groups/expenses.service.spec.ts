import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { BalanceService } from './balance.service';
import { UpdateExpenseDto } from './dto/update-expense.dto';

type ExpensesRepo = jest.Mocked<ExpensesRepository>;
type GroupsRepo = jest.Mocked<GroupsRepository>;

/** Mock minimo de BalanceService con neto 0 (miembro saldado). */
function makeBalanceSvc(): jest.Mocked<BalanceService> {
  return {
    getMemberNet: jest.fn().mockResolvedValue(0),
    getBalance: jest.fn(),
  } as unknown as jest.Mocked<BalanceService>;
}

/** Crea un mock del repositorio de gastos. */
function makeExpensesRepo(): ExpensesRepo {
  return {
    insertExpenseWithShares: jest.fn().mockResolvedValue({
      id: 'exp1',
      groupId: 'grp',
      paidByMemberId: 'a',
      description: null,
      amount: '90000.00',
      occurredOn: '2026-06-10',
      splitMethod: 'equal',
      createdByUserId: 'u1',
      createdAt: new Date(),
      deletedAt: null,
    }),
    listExpenses: jest.fn().mockResolvedValue([]),
    findExpense: jest.fn().mockResolvedValue(undefined),
    softDeleteExpense: jest.fn().mockResolvedValue(undefined),
    updateExpense: jest.fn().mockResolvedValue(undefined),
    findExpenseShares: jest.fn().mockResolvedValue([]),
    findSharesForExpenses: jest.fn().mockResolvedValue([]),
  } as unknown as ExpensesRepo;
}

/** Crea un mock del repositorio de grupos. */
function makeGroupsRepo(): GroupsRepo {
  return {
    createGroup: jest.fn(),
    findGroupsForUser: jest.fn().mockResolvedValue([]),
    findGroupForMember: jest.fn().mockResolvedValue(undefined),
    findActiveMember: jest.fn().mockResolvedValue(undefined),
    renameOrArchive: jest.fn(),
    leaveGroup: jest.fn(),
    addGhostMember: jest.fn(),
    removeMember: jest.fn(),
    listMembers: jest.fn().mockResolvedValue([
      { id: 'a', groupId: 'grp', userId: 'u1', displayName: 'Ana', removedAt: null },
      { id: 'b', groupId: 'grp', userId: 'u2', displayName: 'Beto', removedAt: null },
      { id: 'c', groupId: 'grp', userId: 'u3', displayName: 'Carlos', removedAt: null },
    ]),
    createInvite: jest.fn(),
    findInviteByCode: jest.fn().mockResolvedValue(undefined),
    joinGroupAtomically: jest.fn().mockResolvedValue(undefined),
    findGroupById: jest.fn().mockResolvedValue(undefined),
    resolveDisplayName: jest.fn().mockResolvedValue('Usuario'),
  } as unknown as GroupsRepo;
}

describe('ExpensesService.createExpense', () => {
  it('crea un gasto y reparte iguales entre participantes', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // El usuario u1 es miembro activo (findActiveMember devuelve algo)
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 90000,
      occurredOn: '2026-06-10',
      splitMethod: 'equal' as const,
      participantMemberIds: ['a', 'b', 'c'],
    };

    await service.createExpense('grp', 'u1', dto);

    // El pagador (a) queda confirmed; b y c son miembros reales no pagadores -> pending.
    const expectedShares = [
      { memberId: 'a', shareAmount: 30000, status: 'confirmed' },
      { memberId: 'b', shareAmount: 30000, status: 'pending' },
      { memberId: 'c', shareAmount: 30000, status: 'pending' },
    ];

    expect(expensesRepo.insertExpenseWithShares).toHaveBeenCalledWith(
      'grp',
      'u1',
      expect.objectContaining({ amount: 90000 }),
      expectedShares,
    );
  });

  it('rechaza exact cuando la suma no cuadra (400)', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 100,
      occurredOn: '2026-06-10',
      splitMethod: 'exact' as const,
      exactShares: [
        { memberId: 'a', shareAmount: 60 },
        { memberId: 'b', shareAmount: 30 },
      ],
    };

    await expect(service.createExpense('grp', 'u1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lanza 403 si el usuario no es miembro activo del grupo', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue(undefined);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 90000,
      occurredOn: '2026-06-10',
      splitMethod: 'equal' as const,
      participantMemberIds: ['a', 'b'],
    };

    await expect(service.createExpense('grp', 'u1', dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza exact cuando un memberId no pertenece al grupo (400)', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // El usuario u1 es miembro activo
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 100,
      occurredOn: '2026-06-10',
      splitMethod: 'exact' as const,
      // 'z' no existe en los miembros del grupo (a, b, c)
      exactShares: [
        { memberId: 'a', shareAmount: 60 },
        { memberId: 'z', shareAmount: 40 },
      ],
    };

    await expect(service.createExpense('grp', 'u1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('ExpensesService.createExpense — asignacion de status por share', () => {
  it('asigna confirmed al pagador y al fantasma, pending al resto', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // a = miembro real (pagador), b = miembro real, g = fantasma (userId null)
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });
    groupsRepo.listMembers = jest.fn().mockResolvedValue([
      { id: 'a', groupId: 'grp', userId: 'u1', displayName: 'Ana', isGhost: false, joinedAt: new Date() },
      { id: 'b', groupId: 'grp', userId: 'u2', displayName: 'Beto', isGhost: false, joinedAt: new Date() },
      { id: 'g', groupId: 'grp', userId: null, displayName: 'Fantasma', isGhost: true, joinedAt: new Date() },
    ]);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 90,
      occurredOn: '2026-06-24',
      splitMethod: 'equal' as const,
      participantMemberIds: ['a', 'b', 'g'],
    };

    await service.createExpense('grp', 'u1', dto);

    const callArgs = (expensesRepo.insertExpenseWithShares as jest.Mock).mock.calls[0];
    // 4to argumento: las shares con status
    const sharesArg = callArgs[3] as Array<{ memberId: string; shareAmount: number; status: string }>;

    const byMember = Object.fromEntries(sharesArg.map((s) => [s.memberId, s.status]));
    expect(byMember['a']).toBe('confirmed'); // pagador
    expect(byMember['b']).toBe('pending');   // miembro real no pagador
    expect(byMember['g']).toBe('confirmed'); // fantasma
  });
});

describe('ExpensesService.updateExpense', () => {
  /** Construye un gasto existente base para los tests de update. */
  function makeExistingExpense() {
    return {
      id: 'exp1',
      groupId: 'grp',
      paidByMemberId: 'a',
      description: null,
      amount: '90000.00',
      occurredOn: '2026-06-10',
      splitMethod: 'equal',
      createdByUserId: 'u1',
      createdAt: new Date(),
      deletedAt: null,
    };
  }

  it('lanza 400 si paidByMemberId en update no pertenece al grupo', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // u1 es miembro activo del grupo
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    // El gasto existe en el grupo
    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeExistingExpense());

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    // 'extranjero' no es miembro del grupo (a, b, c)
    const dto: UpdateExpenseDto = { paidByMemberId: 'extranjero' };

    await expect(service.updateExpense('grp', 'u1', 'exp1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lanza 400 si participantMemberIds en update contiene un miembro ajeno', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeExistingExpense());

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    // 'externo' no existe en los miembros del grupo (a, b, c)
    const dto: UpdateExpenseDto = {
      splitMethod: 'equal',
      participantMemberIds: ['a', 'externo'],
    };

    await expect(service.updateExpense('grp', 'u1', 'exp1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('actualiza correctamente cuando paidByMemberId es valido', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    const updatedExpense = { ...makeExistingExpense(), paidByMemberId: 'b' };
    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeExistingExpense());
    expensesRepo.updateExpense = jest.fn().mockResolvedValue(updatedExpense);
    expensesRepo.findExpenseShares = jest.fn().mockResolvedValue([]);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    // 'b' si es miembro del grupo
    const dto: UpdateExpenseDto = { paidByMemberId: 'b' };

    await expect(service.updateExpense('grp', 'u1', 'exp1', dto)).resolves.toBeDefined();
  });
});
