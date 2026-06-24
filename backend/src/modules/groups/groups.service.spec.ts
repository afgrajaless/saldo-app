import { ForbiddenException } from '@nestjs/common';
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
