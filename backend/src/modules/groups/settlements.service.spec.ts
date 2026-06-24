import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { SettlementsRepository } from './settlements.repository';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';
import { BalanceService } from './balance.service';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CategoriesRepository } from '../categories/categories.repository';

// ──────────────────────────────── helpers de mock ────────────────────────────

type SettlementsRepo = jest.Mocked<SettlementsRepository>;
type GroupsRepo = jest.Mocked<GroupsRepository>;
type AccountsRepo = jest.Mocked<AccountsRepository>;
type CategoriesRepo = jest.Mocked<CategoriesRepository>;

const GROUP_ID = 'group-uuid-1';
const USER_ID = 'user-uuid-1';

const MEMBER_FROM = {
  id: 'member-from-uuid',
  groupId: GROUP_ID,
  userId: USER_ID,       // el usuario autenticado ES el pagador (from)
  displayName: 'Ana',
  addedByUserId: USER_ID,
  joinedAt: new Date(),
  removedAt: null,
};

const MEMBER_TO = {
  id: 'member-to-uuid',
  groupId: GROUP_ID,
  userId: 'other-user-uuid',
  displayName: 'Bruno',
  addedByUserId: USER_ID,
  joinedAt: new Date(),
  removedAt: null,
};

const MEMBERS_LIST = [MEMBER_FROM, MEMBER_TO];

/** Fila de settlement que el repo devuelve tras insertar. */
const SETTLEMENT_ROW = {
  id: 'settlement-uuid-1',
  groupId: GROUP_ID,
  fromMemberId: MEMBER_FROM.id,
  toMemberId: MEMBER_TO.id,
  amount: '50000.00',
  settledOn: '2026-06-24',
  fromTransactionId: null as string | null,
  toTransactionId: null as string | null,
  createdByUserId: USER_ID,
  createdAt: new Date(),
};

function makeSettlementsRepo(): SettlementsRepo {
  return {
    insertSettlement: jest.fn().mockResolvedValue(SETTLEMENT_ROW),
    listSettlements: jest.fn().mockResolvedValue([SETTLEMENT_ROW]),
    findMemberById: jest.fn().mockResolvedValue(undefined),
  } as unknown as SettlementsRepo;
}

function makeGroupsRepo(): GroupsRepo {
  return {
    findActiveMember: jest.fn().mockResolvedValue(MEMBER_FROM),
    listMembers: jest.fn().mockResolvedValue(MEMBERS_LIST),
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
    resolveDisplayName: jest.fn().mockResolvedValue('Ana'),
  } as unknown as GroupsRepo;
}

function makeBalanceSvc(): jest.Mocked<BalanceService> {
  return {
    getMemberNet: jest.fn().mockResolvedValue(0),
    getBalance: jest.fn(),
  } as unknown as jest.Mocked<BalanceService>;
}

function makeAccountsRepo(): AccountsRepo {
  return {
    findByIdForUser: jest.fn().mockResolvedValue({ id: 'account-uuid', userId: USER_ID, name: 'Nequi', deletedAt: null }),
  } as unknown as AccountsRepo;
}

function makeCategoriesRepo(): CategoriesRepo {
  return {
    findByIdForUser: jest.fn().mockResolvedValue({ id: 'category-uuid', userId: USER_ID, name: 'Gastos compartidos', type: 'expense', deletedAt: null }),
  } as unknown as CategoriesRepo;
}

function makeService(
  settlementsRepo: SettlementsRepo,
  groupsRepo: GroupsRepo,
  accountsRepo: AccountsRepo,
  categoriesRepo: CategoriesRepo,
): SettlementsService {
  const groupsService = new GroupsService(groupsRepo, makeBalanceSvc());
  return new SettlementsService(settlementsRepo, groupsService, groupsRepo, accountsRepo, categoriesRepo);
}

// ─────────────────────────────────── tests ───────────────────────────────────

describe('SettlementsService.createSettlement', () => {
  it('(a) saldar sin recordPersonal crea el settlement sin transacciones', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    // listMembers devuelve los dos miembros para que los UUIDs sean validos
    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);
    // findActiveMember retorna al usuario como miembro activo
    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);

    // El repo devuelve un settlement sin transacciones (from/toTransactionId = null)
    settlementsRepo.insertSettlement.mockResolvedValue({ ...SETTLEMENT_ROW, fromTransactionId: null, toTransactionId: null });

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    const dto = {
      fromMemberId: MEMBER_FROM.id,
      toMemberId: MEMBER_TO.id,
      amount: 50000,
      settledOn: '2026-06-24',
      // sin recordPersonal
    };

    const result = await service.createSettlement(GROUP_ID, USER_ID, dto);

    // El repositorio se llama SIN personalTx
    expect(settlementsRepo.insertSettlement).toHaveBeenCalledWith(
      GROUP_ID,
      USER_ID,
      expect.objectContaining({ fromMemberId: MEMBER_FROM.id, toMemberId: MEMBER_TO.id }),
      undefined,
    );

    // La respuesta no tiene transacciones
    expect(result.fromTransactionId).toBeNull();
    expect(result.toTransactionId).toBeNull();
  });

  it('(b) saldar con recordPersonal y usuario = from crea transaccion egreso y guarda fromTransactionId', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();
    const accountsRepo = makeAccountsRepo();
    const categoriesRepo = makeCategoriesRepo();

    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);
    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);

    // El repo devuelve un settlement CON fromTransactionId asignado
    const settlementWithTx = { ...SETTLEMENT_ROW, fromTransactionId: 'tx-uuid-1', toTransactionId: null };
    settlementsRepo.insertSettlement.mockResolvedValue(settlementWithTx);

    const service = makeService(settlementsRepo, groupsRepo, accountsRepo, categoriesRepo);

    const dto = {
      fromMemberId: MEMBER_FROM.id,   // userId del from = USER_ID = usuario autenticado
      toMemberId: MEMBER_TO.id,
      amount: 50000,
      settledOn: '2026-06-24',
      recordPersonal: {
        accountId: 'account-uuid',
        categoryId: 'category-uuid',
      },
    };

    const result = await service.createSettlement(GROUP_ID, USER_ID, dto);

    // El repositorio se llama CON personalTx para egreso
    expect(settlementsRepo.insertSettlement).toHaveBeenCalledWith(
      GROUP_ID,
      USER_ID,
      expect.objectContaining({ fromMemberId: MEMBER_FROM.id }),
      expect.objectContaining({
        side: 'from',
        accountId: 'account-uuid',
        categoryId: 'category-uuid',
      }),
    );

    // La respuesta tiene fromTransactionId
    expect(result.fromTransactionId).toBe('tx-uuid-1');
    expect(result.toTransactionId).toBeNull();
  });

  it('lanza 403 si el usuario no es miembro activo del grupo', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember.mockResolvedValue(undefined as never);

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: MEMBER_FROM.id,
        toMemberId: MEMBER_TO.id,
        amount: 50000,
        settledOn: '2026-06-24',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lanza 400 si fromMemberId y toMemberId son iguales', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: MEMBER_FROM.id,
        toMemberId: MEMBER_FROM.id,  // igual que from
        amount: 50000,
        settledOn: '2026-06-24',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza 404 si fromMemberId no es miembro activo del grupo', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    // Solo devuelve MEMBER_TO; MEMBER_FROM no esta en la lista
    groupsRepo.listMembers.mockResolvedValue([MEMBER_TO] as never);

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: 'uuid-desconocido',
        toMemberId: MEMBER_TO.id,
        amount: 50000,
        settledOn: '2026-06-24',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza 404 si la cuenta no pertenece al usuario', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();
    const accountsRepo = makeAccountsRepo();
    const categoriesRepo = makeCategoriesRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);

    // La cuenta no existe para este usuario
    accountsRepo.findByIdForUser.mockResolvedValue(undefined);

    const service = makeService(settlementsRepo, groupsRepo, accountsRepo, categoriesRepo);

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: MEMBER_FROM.id,
        toMemberId: MEMBER_TO.id,
        amount: 50000,
        settledOn: '2026-06-24',
        recordPersonal: { accountId: 'cuenta-ajena', categoryId: 'category-uuid' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza 404 si la categoria no pertenece al usuario', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();
    const accountsRepo = makeAccountsRepo();
    const categoriesRepo = makeCategoriesRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);

    // La categoria no existe o no pertenece al usuario
    categoriesRepo.findByIdForUser.mockResolvedValue(undefined);

    const service = makeService(settlementsRepo, groupsRepo, accountsRepo, categoriesRepo);

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: MEMBER_FROM.id,
        toMemberId: MEMBER_TO.id,
        amount: 50000,
        settledOn: '2026-06-24',
        recordPersonal: { accountId: 'account-uuid', categoryId: 'categoria-ajena' },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza 400 si la categoria es de tipo income cuando el usuario es el pagador (from)', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();
    const accountsRepo = makeAccountsRepo();
    const categoriesRepo = makeCategoriesRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    groupsRepo.listMembers.mockResolvedValue(MEMBERS_LIST as never);

    // El usuario es el pagador (from), pero la categoria es de tipo ingreso — mismatch
    categoriesRepo.findByIdForUser.mockResolvedValue({
      id: 'category-uuid',
      userId: USER_ID,
      name: 'Salario',
      type: 'income',
      deletedAt: null,
    } as never);

    const service = makeService(settlementsRepo, groupsRepo, accountsRepo, categoriesRepo);

    await expect(
      service.createSettlement(GROUP_ID, USER_ID, {
        fromMemberId: MEMBER_FROM.id,  // userId del from = USER_ID = pagador
        toMemberId: MEMBER_TO.id,
        amount: 50000,
        settledOn: '2026-06-24',
        recordPersonal: { accountId: 'account-uuid', categoryId: 'category-uuid' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SettlementsService.listSettlements', () => {
  it('devuelve la lista de settlements del grupo si el usuario es miembro', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember.mockResolvedValue(MEMBER_FROM as never);
    settlementsRepo.listSettlements.mockResolvedValue([SETTLEMENT_ROW]);

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    const result = await service.listSettlements(GROUP_ID, USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SETTLEMENT_ROW.id);
  });

  it('lanza 403 si el usuario no es miembro', async () => {
    const settlementsRepo = makeSettlementsRepo();
    const groupsRepo = makeGroupsRepo();

    groupsRepo.findActiveMember.mockResolvedValue(undefined as never);

    const service = makeService(settlementsRepo, groupsRepo, makeAccountsRepo(), makeCategoriesRepo());

    await expect(service.listSettlements(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
