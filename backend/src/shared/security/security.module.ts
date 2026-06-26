import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * Modulo global de seguridad. Expone el cifrado en reposo (EncryptionService)
 * para que cualquier repositorio pueda inyectarlo sin importarlo explicitamente.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SecurityModule {}
