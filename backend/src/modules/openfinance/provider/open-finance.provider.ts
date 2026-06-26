import {
  OFAccount,
  OFConsentResult,
  OFCreditProduct,
  OFInstitution,
  OFWidgetToken,
} from '../../../domain/openfinance/types';

/** Token de inyección del proveedor de Open Finance. */
export const OPEN_FINANCE_PROVIDER = Symbol('OPEN_FINANCE_PROVIDER');

/**
 * Puerto del proveedor de Open Finance. El mock y el adaptador real (futuro)
 * lo implementan; el resto del sistema sólo depende de esta interfaz.
 */
export interface OpenFinanceProvider {
  /** Identificador del proveedor (p.ej. 'mock', 'belvo'). */
  readonly id: string;

  /**
   * True si el consentimiento ocurre en un widget del lado cliente (el usuario
   * se autentica en su banco). En ese caso se usa createWidgetToken + finalizar
   * la conexión, en vez de startConsent.
   */
  readonly requiresWidget: boolean;

  /** Lista las instituciones financieras disponibles. */
  listInstitutions(): Promise<OFInstitution[]>;

  /** Inicia el consentimiento del usuario para una institución (sin widget). */
  startConsent(userId: string, institutionId: string): Promise<OFConsentResult>;

  /** Crea un token efímero para abrir el widget de consentimiento. */
  createWidgetToken(userId: string): Promise<OFWidgetToken>;

  /** Trae las cuentas de depósito de una conexión. */
  fetchAccounts(externalConnectionId: string): Promise<OFAccount[]>;

  /** Trae los productos de crédito de una conexión. */
  fetchCreditProducts(externalConnectionId: string): Promise<OFCreditProduct[]>;
}
