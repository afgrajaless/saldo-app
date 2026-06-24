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
  } as unknown as Repo;
}

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
