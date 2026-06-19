import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, DRIZZLE } from '../../db/database.module';
import { users } from '../../db/schema';

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
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
    return user;
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
    return user;
  }

  /**
   * Inserta un nuevo usuario y devuelve la fila creada.
   * @param data - Correo, hash de contrasena y nombre completo.
   * @returns El usuario recien creado.
   */
  async create(data: CreateUserData): Promise<UserRow> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }
}
