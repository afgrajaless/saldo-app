import { debtTypeEnum } from '../../db/schema';
import { UsuryModality } from './usury.repository';

/** Tipo de deuda (enum de la BD). */
type DebtType = (typeof debtTypeEnum.enumValues)[number];

/**
 * Mapea el tipo de obligacion a la modalidad de usura con la que se compara.
 *
 * En el MVP todos los productos de credito de consumo se contrastan contra la
 * usura de "consumo y ordinario". Las modalidades de microcredito y consumo de
 * bajo monto quedan disponibles en el catalogo para reglas futuras (p. ej. por
 * monto del credito).
 */
export const DEBT_TYPE_TO_MODALITY: Record<DebtType, UsuryModality> = {
  libre_inversion: 'consumo_ordinario',
  tarjeta_credito: 'consumo_ordinario',
  libranza: 'consumo_ordinario',
  hipotecario: 'consumo_ordinario',
  vehiculo: 'consumo_ordinario',
  educativo: 'consumo_ordinario',
  gota_gota: 'consumo_ordinario',
};
