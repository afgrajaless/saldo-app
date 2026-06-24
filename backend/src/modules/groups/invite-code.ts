import { randomBytes } from 'crypto';

/**
 * Alfabeto sin caracteres ambiguos: excluye I, O, 0 y 1 para evitar confusiones
 * al leer o transcribir el codigo.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

/**
 * Genera un codigo de invitacion aleatorio de 8 caracteres del alfabeto sin ambiguos.
 * Usa crypto.randomBytes para mayor calidad de entropia que Math.random.
 * @returns Cadena de 8 caracteres del conjunto [A-Z2-9] sin I, O, 0 ni 1.
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
