import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { users } from '../../db/schema';
import { EncryptionService } from '../../shared/security/encryption.service';

/** Fila de usuario tal como se almacena en la base de datos. */
export type UserRow = typeof users.$inferSelect;

/** Datos necesarios para crear un usuario. */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  fullName: string;
}

/**
 * Repositorio de acceso a datos de usuarios. Encapsula las consultas Drizzle
 * para mantener la logica de negocio libre de detalles de persistencia.
 * El `full_name` (PII) se cifra en reposo: se guarda cifrado y se descifra al leer.
 */
@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Busca un usuario por su correo (ya normalizado a minusculas).
   * @param email - Correo del usuario.
   * @returns El usuario si existe, o `undefined`.
   */
  async findByEmail(email: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return this.decryptRow(user);
  }

  /**
   * Busca un usuario por su identificador.
   * @param id - UUID del usuario.
   * @returns El usuario si existe, o `undefined`.
   */
  async findById(id: string): Promise<UserRow | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return this.decryptRow(user);
  }

  /**
   * Inserta un nuevo usuario (con el nombre cifrado) y devuelve la fila creada
   * con el nombre ya descifrado.
   * @param data - Correo, hash de contrasena y nombre completo.
   * @returns El usuario recien creado.
   */
  async create(data: CreateUserData): Promise<UserRow> {
    const [user] = await this.db
      .insert(users)
      .values({ ...data, fullName: this.encryption.encrypt(data.fullName) })
      .returning();
    return this.decryptRow(user) as UserRow;
  }

  /**
   * Descifra el `full_name` de una fila de usuario (o la devuelve tal cual si es undefined).
   * @param user - Fila cruda de la BD.
   * @returns La fila con el nombre en texto plano.
   */
  private decryptRow(user: UserRow | undefined): UserRow | undefined {
    if (!user) return user;
    return { ...user, fullName: this.encryption.decrypt(user.fullName) };
  }
}
