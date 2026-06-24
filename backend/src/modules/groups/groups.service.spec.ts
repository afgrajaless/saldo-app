import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';

type Repo = jest.Mocked<GroupsRepository>;

function makeRepo(): Repo {
  return {
    createGroup: jest.fn(),
    findGroupsForUser: jest.fn().mockResolvedValue([]),
    findGroupForMember: jest.fn().mockResolvedValue(undefined),
    findActiveMember: jest.fn().mockResolvedValue(undefined),
    renameOrArchive: jest.fn(),
    leaveGroup: jest.fn(),
    addGhostMember: jest.fn(),
    removeMember: jest.fn(),
    listMembers: jest.fn().mockResolvedValue([]),
    createInvite: jest.fn(),
    findInviteByCode: jest.fn().mockResolvedValue(undefined),
    joinGroupAtomically: jest.fn().mockResolvedValue(undefined),
    findGroupById: jest.fn().mockResolvedValue(undefined),
    resolveDisplayName: jest.fn().mockResolvedValue('Usuario'),
  } as unknown as Repo;
}

describe('GroupsService.addMember', () => {
  it('agrega un miembro fantasma (userId null)', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue({ id: 'm1' } as never);
    repo.addGhostMember = jest.fn().mockResolvedValue({ id: 'g1', userId: null, displayName: 'Juan' });
    const service = new GroupsService(repo);
    const member = await service.addMember('grp', 'u1', { displayName: 'Juan' });
    expect(member.userId).toBeNull();
    expect(repo.addGhostMember).toHaveBeenCalledWith('grp', 'u1', 'Juan');
  });

  it('lanza 403 si el usuario que agrega no es miembro activo', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue(undefined);
    const service = new GroupsService(repo);
    await expect(service.addMember('grp', 'u1', { displayName: 'Juan' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('GroupsService.removeMember', () => {
  it('lanza 403 si el usuario no es miembro activo', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue(undefined);
    const service = new GroupsService(repo);
    await expect(service.removeMember('grp', 'u1', 'mem1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('llama al repositorio con los parametros correctos', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue({ id: 'm1' } as never);
    repo.removeMember.mockResolvedValue(undefined);
    const service = new GroupsService(repo);
    await service.removeMember('grp', 'u1', 'mem1');
    expect(repo.removeMember).toHaveBeenCalledWith('grp', 'mem1');
  });
});

describe('GroupsService.listMembers', () => {
  it('lanza 403 si el usuario no es miembro activo', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue(undefined);
    const service = new GroupsService(repo);
    await expect(service.listMembers('grp', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve la lista de miembros del grupo', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue({ id: 'm1' } as never);
    repo.listMembers.mockResolvedValue([
      { id: 'g1', userId: null, displayName: 'Juan' } as never,
    ]);
    const service = new GroupsService(repo);
    const members = await service.listMembers('grp', 'u1');
    expect(members).toHaveLength(1);
    expect(members[0].isGhost).toBe(true);
  });

  it('marca como miembro real (no fantasma) si userId no es null', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue({ id: 'm1' } as never);
    repo.listMembers.mockResolvedValue([
      { id: 'm2', groupId: 'grp', userId: 'u2', displayName: 'Ana', removedAt: null } as never,
    ]);
    const service = new GroupsService(repo);
    const members = await service.listMembers('grp', 'u1');
    expect(members).toHaveLength(1);
    expect(members[0].isGhost).toBe(false);
  });
});

describe('GroupsService.joinByCode', () => {
  it('al unirse con invite ligado a fantasma, llama joinGroupAtomically con el invite correcto', async () => {
    const repo = makeRepo();
    const invite = {
      id: 'inv',
      groupId: 'grp',
      memberId: 'ghost1',
      expiresAt: new Date(Date.now() + 1e6),
      consumedAt: null,
    };
    repo.findInviteByCode = jest.fn().mockResolvedValue(invite);
    repo.findActiveMember.mockResolvedValue(undefined); // aun no es miembro
    repo.joinGroupAtomically = jest.fn().mockResolvedValue(undefined);
    repo.findGroupById = jest.fn().mockResolvedValue({
      id: 'grp',
      name: 'Apto',
      createdBy: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    });
    const service = new GroupsService(repo);
    const group = await service.joinByCode('u9', 'ABCD2345');
    expect(group.id).toBe('grp');
    // Verifica que se haya invocado joinGroupAtomically con el invite que tiene memberId
    expect(repo.joinGroupAtomically).toHaveBeenCalledTimes(1);
    const [passedInvite, passedUserId] = (repo.joinGroupAtomically as jest.Mock).mock.calls[0] as [typeof invite, string, string];
    expect(passedInvite.memberId).toBe('ghost1');
    expect(passedUserId).toBe('u9');
  });

  it('lanza 409 si el invite ya fue consumido', async () => {
    const repo = makeRepo();
    repo.findInviteByCode = jest.fn().mockResolvedValue({
      id: 'inv', groupId: 'grp', memberId: null, expiresAt: new Date(Date.now() + 1e6), consumedAt: new Date(),
    });
    const service = new GroupsService(repo);
    await expect(service.joinByCode('u9', 'ABCD2345')).rejects.toBeInstanceOf(ConflictException);
  });

  it('lanza 409 si el invite esta vencido', async () => {
    const repo = makeRepo();
    repo.findInviteByCode = jest.fn().mockResolvedValue({
      id: 'inv', groupId: 'grp', memberId: null, expiresAt: new Date(Date.now() - 1000), consumedAt: null,
    });
    const service = new GroupsService(repo);
    await expect(service.joinByCode('u9', 'ABCD2345')).rejects.toBeInstanceOf(ConflictException);
  });

  it('lanza 409 si el usuario ya es miembro real del grupo', async () => {
    const repo = makeRepo();
    repo.findInviteByCode = jest.fn().mockResolvedValue({
      id: 'inv', groupId: 'grp', memberId: null, expiresAt: new Date(Date.now() + 1e6), consumedAt: null,
    });
    repo.findActiveMember.mockResolvedValue({ id: 'm1', userId: 'u9' } as never);
    const service = new GroupsService(repo);
    await expect(service.joinByCode('u9', 'ABCD2345')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('GroupsService.assertActiveMember', () => {
  it('lanza 403 si el usuario no es miembro del grupo', async () => {
    const repo = makeRepo();
    const service = new GroupsService(repo);
    await expect(service.assertActiveMember('g1', 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('devuelve el miembro si pertenece', async () => {
    const repo = makeRepo();
    repo.findActiveMember.mockResolvedValue({ id: 'm1', groupId: 'g1', userId: 'u1' } as never);
    const service = new GroupsService(repo);
    const member = await service.assertActiveMember('g1', 'u1');
    expect(member.id).toBe('m1');
  });
});
