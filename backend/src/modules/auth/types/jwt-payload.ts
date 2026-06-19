/** Contenido del token JWT de acceso. */
export interface JwtPayload {
  /** UUID del usuario (subject). */
  sub: string;
  /** Correo del usuario. */
  email: string;
}

/** Usuario autenticado adjuntado a la peticion tras validar el token. */
export type AuthenticatedUser = JwtPayload;
