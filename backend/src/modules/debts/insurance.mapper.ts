import { InsuranceConfig, InsuranceMode } from '../../domain/insurance/insurance';

/**
 * Construye la configuracion de seguro del dominio a partir de los valores
 * almacenados en la deuda.
 * @param mode - Modalidad ('none' | 'rate' | 'fixed').
 * @param value - Valor (tasa o monto) como string NUMERIC, o null.
 * @returns La configuracion de seguro del dominio.
 */
export function toInsuranceConfig(mode: string, value: string | null): InsuranceConfig {
  if (mode === InsuranceMode.RATE || mode === InsuranceMode.FIXED) {
    return { mode: mode as InsuranceMode, value: Number(value ?? 0) };
  }
  return { mode: InsuranceMode.NONE, value: 0 };
}
