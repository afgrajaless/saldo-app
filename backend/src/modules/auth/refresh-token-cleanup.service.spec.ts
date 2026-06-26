import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';

describe('RefreshTokenCleanupService', () => {
  it('purga los tokens expirados delegando en el repositorio', async () => {
    const repo = { deleteExpired: jest.fn().mockResolvedValue(3) } as unknown as
      jest.Mocked<Pick<RefreshTokensRepository, 'deleteExpired'>>;
    const service = new RefreshTokenCleanupService(repo as unknown as RefreshTokensRepository);

    const deleted = await service.purgeExpired();

    expect(repo.deleteExpired).toHaveBeenCalledTimes(1);
    expect(deleted).toBe(3);
  });

  it('no falla cuando no hay nada que borrar', async () => {
    const repo = { deleteExpired: jest.fn().mockResolvedValue(0) } as unknown as
      jest.Mocked<Pick<RefreshTokensRepository, 'deleteExpired'>>;
    const service = new RefreshTokenCleanupService(repo as unknown as RefreshTokensRepository);

    await expect(service.purgeExpired()).resolves.toBe(0);
  });
});
