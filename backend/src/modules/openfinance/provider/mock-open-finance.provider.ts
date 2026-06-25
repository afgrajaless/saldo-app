import { Injectable } from '@nestjs/common';
import { OFAccount, OFConsentResult, OFCreditProduct, OFInstitution } from '../../../domain/openfinance/types';
import { OpenFinanceProvider } from './open-finance.provider';

/** Datos de ejemplo por institución (deterministas). */
const FIXTURES: Record<string, { accounts: OFAccount[]; products: OFCreditProduct[] }> = {
  'banco-001': {
    accounts: [
      { externalId: 'b1-acc-1', name: 'Cuenta de Ahorros', type: 'savings', balance: 2500000, currency: 'COP' },
      { externalId: 'b1-acc-2', name: 'Cuenta Corriente', type: 'checking', balance: 800000, currency: 'COP' },
    ],
    products: [
      {
        externalId: 'b1-card-1',
        name: 'Tarjeta Visa',
        type: 'credit_card',
        balance: 1200000,
        creditLimit: 6000000,
        statementDay: 15,
        paymentDay: 5,
        rotativoRateEa: 0.29,
      },
      {
        externalId: 'b1-loan-1',
        name: 'Crédito de Libre Inversión',
        type: 'loan',
        balance: 9500000,
        effectiveAnnualRate: 0.24,
        monthlyPayment: 520000,
        termMonths: 36,
        loanKind: 'libre_inversion',
      },
      // Producto no soportado (ejercita la ruta 'skipped').
      { externalId: 'b1-x-1', name: 'Leasing Vehículo', type: 'leasing', balance: 30000000 },
    ],
  },
  'banco-002': {
    accounts: [{ externalId: 'b2-acc-1', name: 'Ahorro Programado', type: 'savings', balance: 4200000, currency: 'COP' }],
    products: [
      {
        externalId: 'b2-loan-1',
        name: 'Crédito Hipotecario',
        type: 'loan',
        balance: 78000000,
        effectiveAnnualRate: 0.13,
        monthlyPayment: 980000,
        termMonths: 180,
        loanKind: 'hipotecario',
      },
    ],
  },
};

/**
 * Proveedor mock de Open Finance: datos deterministas en forma canónica OF.
 * Codifica la institución dentro del externalConnectionId ("of:<instId>:<userId>").
 */
@Injectable()
export class MockOpenFinanceProvider implements OpenFinanceProvider {
  /** Identificador de este proveedor. */
  readonly id = 'mock';

  /**
   * Lista las instituciones de ejemplo.
   * @returns Arreglo de instituciones disponibles.
   */
  async listInstitutions(): Promise<OFInstitution[]> {
    return [
      { id: 'banco-001', name: 'Banco Ejemplo Uno' },
      { id: 'banco-002', name: 'Banco Ejemplo Dos' },
    ];
  }

  /**
   * Aprueba el consentimiento al instante y codifica la institución en el id.
   * @param userId - ID del usuario solicitante.
   * @param institutionId - ID de la institución.
   * @returns Resultado del consentimiento con status 'active' e id externo.
   */
  async startConsent(userId: string, institutionId: string): Promise<OFConsentResult> {
    if (!FIXTURES[institutionId]) {
      return { externalConnectionId: '', status: 'pending', consentExpiresAt: null };
    }
    return {
      externalConnectionId: `of:${institutionId}:${userId}`,
      status: 'active',
      consentExpiresAt: null,
    };
  }

  /**
   * Devuelve las cuentas de la institución codificada en el id.
   * @param externalConnectionId - ID de conexión en forma "of:<instId>:<userId>".
   * @returns Arreglo de cuentas de depósito.
   */
  async fetchAccounts(externalConnectionId: string): Promise<OFAccount[]> {
    return FIXTURES[this.institutionOf(externalConnectionId)]?.accounts ?? [];
  }

  /**
   * Devuelve los productos de crédito de la institución codificada en el id.
   * @param externalConnectionId - ID de conexión en forma "of:<instId>:<userId>".
   * @returns Arreglo de productos de crédito (tarjetas, préstamos, leasing, etc.).
   */
  async fetchCreditProducts(externalConnectionId: string): Promise<OFCreditProduct[]> {
    return FIXTURES[this.institutionOf(externalConnectionId)]?.products ?? [];
  }

  /**
   * Extrae el institutionId de un externalConnectionId "of:<inst>:<user>".
   * @param externalConnectionId - ID de conexión con formato "of:<instId>:<userId>".
   * @returns ID de la institución extraído.
   */
  private institutionOf(externalConnectionId: string): string {
    return externalConnectionId.split(':')[1] ?? '';
  }
}
