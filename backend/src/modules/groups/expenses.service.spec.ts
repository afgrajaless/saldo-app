import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

/** Gasto base reutilizable en los tests. */
function makeBaseExpense() {
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

/** Crea un mock del repositorio de gastos. */
function makeExpensesRepo(): ExpensesRepo {
  return {
    insertExpenseWithShares: jest.fn().mockResolvedValue(makeBaseExpense()),
    listExpenses: jest.fn().mockResolvedValue([]),
    findExpense: jest.fn().mockResolvedValue(undefined),
    softDeleteExpense: jest.fn().mockResolvedValue(undefined),
    updateExpense: jest.fn().mockResolvedValue(undefined),
    findExpenseShares: jest.fn().mockResolvedValue([]),
    findSharesForExpenses: jest.fn().mockResolvedValue([]),
    setShareStatus: jest.fn().mockResolvedValue(undefined),
    findShare: jest.fn().mockResolvedValue(undefined),
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

  it('al editar un gasto, re-asigna status pending a los participantes reales no pagadores', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // u1 es miembro activo 'a' (pagador original)
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    // Miembros: 'a' (real), 'b' (real), 'c' (real)
    groupsRepo.listMembers = jest.fn().mockResolvedValue([
      { id: 'a', groupId: 'grp', userId: 'u1', displayName: 'Ana', isGhost: false, joinedAt: new Date() },
      { id: 'b', groupId: 'grp', userId: 'u2', displayName: 'Beto', isGhost: false, joinedAt: new Date() },
      { id: 'c', groupId: 'grp', userId: 'u3', displayName: 'Carlos', isGhost: false, joinedAt: new Date() },
    ]);

    // Gasto existente: pagado por 'a', participantes a/b/c, monto 90000
    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeExistingExpense());

    const updatedExpense = { ...makeExistingExpense(), amount: '120000.00' };
    expensesRepo.updateExpense = jest.fn().mockResolvedValue(updatedExpense);
    expensesRepo.findExpenseShares = jest.fn().mockResolvedValue([]);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    // Editar: cambiar el monto (esto recalcula shares)
    const dto: UpdateExpenseDto = {
      amount: 120000,
      participantMemberIds: ['a', 'b', 'c'], // mismo reparto
    };

    await service.updateExpense('grp', 'u1', 'exp1', dto);

    // Verificar que updateExpense fue llamado con newShares que asignen:
    // - 'a' (pagador) -> confirmed
    // - 'b' (miembro real no pagador) -> pending
    // - 'c' (miembro real no pagador) -> pending
    const updateCall = (expensesRepo.updateExpense as jest.Mock).mock.calls[0];
    const newShares = updateCall[3] as Array<{ memberId: string; shareAmount: number; status: string }>;

    expect(newShares).toBeDefined();
    const byMember = Object.fromEntries(newShares.map((s) => [s.memberId, s.status]));
    expect(byMember['a']).toBe('confirmed'); // pagador
    expect(byMember['b']).toBe('pending');   // miembro real no pagador
    expect(byMember['c']).toBe('pending');   // miembro real no pagador
  });
});

// ──────────────────────── confirmShare / disputeShare ────────────────────────

describe('ExpensesService.confirmShare', () => {
  /** Configura el escenario base: u2 (miembro b) confirma la parte del gasto exp1 pagado por a. */
  function makeSetup() {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // u2 es miembro activo b (NO el pagador del gasto)
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'b',
      groupId: 'grp',
      userId: 'u2',
      displayName: 'Beto',
      removedAt: null,
    });

    // El gasto existe y fue pagado por 'a'
    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeBaseExpense());

    // b tiene una share en el gasto
    expensesRepo.findShare = jest.fn().mockResolvedValue({
      id: 'sh1',
      expenseId: 'exp1',
      memberId: 'b',
      shareAmount: '30000.00',
      status: 'pending',
      disputedNote: null,
      statusChangedAt: null,
    });

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);
    return { service, expensesRepo };
  }

  it('(a) pone la share del usuario en confirmed', async () => {
    const { service, expensesRepo } = makeSetup();
    await service.confirmShare('grp', 'u2', 'exp1');
    expect(expensesRepo.setShareStatus).toHaveBeenCalledWith('exp1', 'b', 'confirmed', undefined);
  });

  it('(c) lanza BadRequestException si el usuario es el pagador del gasto', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // u1 es miembro 'a', que es el pagador del gasto
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'a',
      groupId: 'grp',
      userId: 'u1',
      displayName: 'Ana',
      removedAt: null,
    });

    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeBaseExpense()); // paidByMemberId: 'a'

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    await expect(service.confirmShare('grp', 'u1', 'exp1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('(d) lanza NotFoundException si el usuario no participa en el gasto', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'b',
      groupId: 'grp',
      userId: 'u2',
      displayName: 'Beto',
      removedAt: null,
    });

    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeBaseExpense());
    // b NO tiene share en el gasto
    expensesRepo.findShare = jest.fn().mockResolvedValue(undefined);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    await expect(service.confirmShare('grp', 'u2', 'exp1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('(e) lanza ForbiddenException si el usuario no es miembro activo del grupo', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    // assertActiveMember lanza ForbiddenException cuando findActiveMember devuelve undefined
    groupsRepo.findActiveMember = jest.fn().mockResolvedValue(undefined);

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    await expect(service.confirmShare('grp', 'u99', 'exp1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('ExpensesService.disputeShare', () => {
  it('(b) pone la share del usuario en disputed con nota', async () => {
    const expensesRepo = makeExpensesRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember = jest.fn().mockResolvedValue({
      id: 'b',
      groupId: 'grp',
      userId: 'u2',
      displayName: 'Beto',
      removedAt: null,
    });

    expensesRepo.findExpense = jest.fn().mockResolvedValue(makeBaseExpense());
    expensesRepo.findShare = jest.fn().mockResolvedValue({
      id: 'sh1',
      expenseId: 'exp1',
      memberId: 'b',
      shareAmount: '30000.00',
      status: 'pending',
      disputedNote: null,
      statusChangedAt: null,
    });

    const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
    const service = new ExpensesService(expensesRepo, groupsService);

    await service.disputeShare('grp', 'u2', 'exp1', 'El monto no coincide');

    expect(expensesRepo.setShareStatus).toHaveBeenCalledWith(
      'exp1',
      'b',
      'disputed',
      'El monto no coincide',
    );
  });
});
