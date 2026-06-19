import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../../shared/security/password.service';
import { UserRow, UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

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
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    passwordService = { hash: jest.fn(), verify: jest.fn() };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    const config = { getOrThrow: jest.fn(() => 'secret'), get: jest.fn(() => '15m') };

    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      passwordService as unknown as PasswordService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
    jwtService.signAsync.mockResolvedValueOnce('access').mockResolvedValueOnce('refresh');
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
    it('emite nuevos tokens con un refresh token valido', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid', email: 'juan@example.com' });
      usersRepository.findById.mockResolvedValue(makeUser());

      const result = await service.refresh('valid.refresh.token');

      expect(usersRepository.findById).toHaveBeenCalledWith('user-uuid');
      expect(result.accessToken).toBe('access');
    });

    it('rechaza un refresh token invalido', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(service.refresh('bad.token')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el usuario ya no existe', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'ghost', email: 'x@y.com' });
      usersRepository.findById.mockResolvedValue(undefined);
      await expect(service.refresh('valid.token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
