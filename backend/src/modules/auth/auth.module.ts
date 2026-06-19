import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from '../../shared/security/password.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Modulo de autenticacion. Los secretos y expiraciones se pasan por llamada al
 * firmar/verificar (no se fija un secreto global) para usar claves distintas en
 * los tokens de acceso y de refresco.
 */
@Module({
  imports: [JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
