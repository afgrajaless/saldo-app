import { OFAccount, OFConsentResult, OFCreditProduct, OFInstitution } from '../../../domain/openfinance/types';

/** Token de inyección del proveedor de Open Finance. */
export const OPEN_FINANCE_PROVIDER = Symbol('OPEN_FINANCE_PROVIDER');

/**
 * Puerto del proveedor de Open Finance. El mock y el adaptador real (futuro)
 * lo implementan; el resto del sistema sólo depende de esta interfaz.
 */
export interface OpenFinanceProvider {
  /** Identificador del proveedor (p.ej. 'mock', 'belvo'). */
  readonly id: string;

  /** Lista las instituciones financieras disponibles. */
  listInstitutions(): Promise<OFInstitution[]>;

  /** Inicia el consentimiento del usuario para una institución. */
  startConsent(userId: string, institutionId: string): Promise<OFConsentResult>;

  /** Trae las cuentas de depósito de una conexión. */
  fetchAccounts(externalConnectionId: string): Promise<OFAccount[]>;

  /** Trae los productos de crédito de una conexión. */
  fetchCreditProducts(externalConnectionId: string): Promise<OFCreditProduct[]>;
}
