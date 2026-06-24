import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesRepository } from './expenses.repository';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { MemberShare } from '../../domain/split/split-expense';

type ExpensesRepo = jest.Mocked<ExpensesRepository>;
type GroupsRepo = jest.Mocked<GroupsRepository>;

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

    const groupsService = new GroupsService(groupsRepo);
    const service = new ExpensesService(expensesRepo, groupsService);

    const dto = {
      paidByMemberId: 'a',
      amount: 90000,
      occurredOn: '2026-06-10',
      splitMethod: 'equal' as const,
      participantMemberIds: ['a', 'b', 'c'],
    };

    await service.createExpense('grp', 'u1', dto);

    const expectedShares: MemberShare[] = [
      { memberId: 'a', shareAmount: 30000 },
      { memberId: 'b', shareAmount: 30000 },
      { memberId: 'c', shareAmount: 30000 },
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

    const groupsService = new GroupsService(groupsRepo);
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

    const groupsService = new GroupsService(groupsRepo);
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

    const groupsService = new GroupsService(groupsRepo);
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
