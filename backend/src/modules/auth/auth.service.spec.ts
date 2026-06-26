import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../shared/security/password.service';
import { UserRow, UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { RefreshTokenRow, RefreshTokensRepository } from './refresh-tokens.repository';

/** Construye un usuario de prueba con valores por defecto sobreescribibles. */
function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-uuid',
    email: 'juan@example.com',
    passwordHash: 'hashed',
    fullName: 'Juan Perez',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail' | 'findById' | 'create'>>;
  let passwordService: jest.Mocked<Pick<PasswordService, 'hash' | 'verify'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync' | 'decode'>>;
  let refreshTokens: jest.Mocked<
    Pick<RefreshTokensRepository, 'create' | 'findActiveByHash' | 'revoke'>
  >;

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    passwordService = { hash: jest.fn(), verify: jest.fn() };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn() };
    refreshTokens = { create: jest.fn(), findActiveByHash: jest.fn(), revoke: jest.fn() };
    const config = { getOrThrow: jest.fn(() => 'secret'), get: jest.fn(() => '15m') };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      passwordService as unknown as PasswordService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      refreshTokens as unknown as RefreshTokensRepository,
    );
    jwtService.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');
    // exp lejano para el claim del refresh token (buildAuthResponse lo decodifica).
    jwtService.decode.mockReturnValue({ exp: 9999999999 });
  });

  describe('register', () => {
    it('crea el usuario, hashea la contrasena y devuelve tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);
      passwordService.hash.mockResolvedValue('hashed');
      usersRepository.create.mockResolvedValue(makeUser());

      const result = await service.register({
        email: 'Juan@Example.com',
        password: 'ClaveSegura123',
        fullName: 'Juan Perez',
      });

      expect(usersRepository.findByEmail).toHaveBeenCalledWith('juan@example.com');
      expect(passwordService.hash).toHaveBeenCalledWith('ClaveSegura123');
      expect(usersRepository.create).toHaveBeenCalledWith({
        email: 'juan@example.com',
        passwordHash: 'hashed',
        fullName: 'Juan Perez',
      });
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.user).toEqual({
        id: 'user-uuid',
        email: 'juan@example.com',
        fullName: 'Juan Perez',
      });
    });

    it('rechaza un correo ya registrado', async () => {
      usersRepository.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.register({ email: 'juan@example.com', password: 'ClaveSegura123', fullName: 'Juan' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('devuelve tokens con credenciales validas', async () => {
      usersRepository.findByEmail.mockResolvedValue(makeUser());
      passwordService.verify.mockResolvedValue(true);

      const result = await service.login({ email: 'juan@example.com', password: 'ClaveSegura123' });

      expect(result.accessToken).toBe('access');
      expect(result.user.email).toBe('juan@example.com');
    });

    it('rechaza cuando el usuario no existe', async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);
      await expect(
        service.login({ email: 'no@existe.com', password: 'ClaveSegura123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza cuando la contrasena no coincide', async () => {
      usersRepository.findByEmail.mockResolvedValue(makeUser());
      passwordService.verify.mockResolvedValue(false);
      await expect(
        service.login({ email: 'juan@example.com', password: 'incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('emite nuevos tokens y rota (revoca el anterior) con un refresh valido', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid', email: 'juan@example.com' });
      refreshTokens.findActiveByHash.mockResolvedValue({ id: 'rt-1' } as RefreshTokenRow);
      usersRepository.findById.mockResolvedValue(makeUser());

      const result = await service.refresh('valid.refresh.token');

      expect(usersRepository.findById).toHaveBeenCalledWith('user-uuid');
      expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-1'); // rotacion
      expect(refreshTokens.create).toHaveBeenCalled(); // nuevo token persistido
      expect(result.accessToken).toBe('access');
    });

    it('rechaza un refresh token invalido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(service.refresh('bad.token')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un refresh token revocado o ya rotado (no esta activo en BD)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid', email: 'juan@example.com' });
      refreshTokens.findActiveByHash.mockResolvedValue(undefined);
      await expect(service.refresh('rotated.token')).rejects.toThrow(UnauthorizedException);
      expect(usersRepository.findById).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario ya no existe', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'ghost', email: 'x@y.com' });
      refreshTokens.findActiveByHash.mockResolvedValue({ id: 'rt-2' } as RefreshTokenRow);
      usersRepository.findById.mockResolvedValue(undefined);
      await expect(service.refresh('valid.token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revoca el refresh token presentado', async () => {
      refreshTokens.findActiveByHash.mockResolvedValue({ id: 'rt-9' } as RefreshTokenRow);
      await service.logout('some.refresh.token');
      expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-9');
    });

    it('es idempotente si el token ya no esta activo', async () => {
      refreshTokens.findActiveByHash.mockResolvedValue(undefined);
      await expect(service.logout('gone.token')).resolves.toBeUndefined();
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('devuelve el perfil leido de la base de datos', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());

      const profile = await service.me('user-uuid');

      expect(usersRepository.findById).toHaveBeenCalledWith('user-uuid');
      expect(profile).toEqual({
        id: 'user-uuid',
        email: 'juan@example.com',
        fullName: 'Juan Perez',
      });
    });

    it('rechaza si el usuario fue borrado (evita ghost session)', async () => {
      usersRepository.findById.mockResolvedValue(undefined);
      await expect(service.me('ghost')).rejects.toThrow(UnauthorizedException);
    });
  });
});
