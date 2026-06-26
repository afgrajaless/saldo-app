import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OFAccount,
  OFAccountType,
  OFConsentResult,
  OFCreditProduct,
  OFInstitution,
  OFWidgetToken,
} from '../../../domain/openfinance/types';
import { OpenFinanceProvider } from './open-finance.provider';

/**
 * Respuesta paginada genérica de la API de Belvo.
 * Belvo envuelve los listados en `{ count, next, previous, results }`.
 */
interface BelvoPage<T> {
  results: T[];
}

/** Institución tal como la devuelve Belvo (`GET /api/institutions/`). */
interface BelvoInstitution {
  /** Código interno usado para crear links (p. ej. "bancolombia_co_retail"). */
  name: string;
  /** Nombre legible para el usuario. */
  display_name: string;
}

/** Cuenta tal como la devuelve Belvo (`GET /api/accounts/`). */
interface BelvoAccount {
  id: string;
  name: string | null;
  /** Categoría: CHECKING_ACCOUNT, SAVINGS_ACCOUNT, CREDIT_CARD, LOAN_ACCOUNT, ... */
  category: string;
  currency: string;
  balance: { current: number | null } | null;
  /** Presente sólo en tarjetas de crédito. */
  credit_data?: {
    credit_limit?: number | null;
    cutting_date?: string | null;
    minimum_payment?: number | null;
    interest_rate?: number | null;
  } | null;
  /** Presente sólo en préstamos. */
  loan_data?: {
    outstanding_balance?: number | null;
    interest_rate?: number | null;
    monthly_payment?: number | null;
    no_of_installments?: number | null;
  } | null;
}

/**
 * Adaptador real de Open Finance sobre Belvo (https://belvo.com).
 *
 * ESQUELETO: la estructura y las llamadas HTTP están planteadas, pero los
 * mapeos exactos de campos deben confirmarse contra la versión vigente de la
 * API de Belvo antes de usarse en producción. El proveedor por defecto sigue
 * siendo el mock; este adaptador sólo se activa con OPEN_FINANCE_PROVIDER=belvo.
 *
 * Credenciales requeridas (env):
 *   BELVO_BASE_URL        (sandbox: https://sandbox.belvo.com)
 *   BELVO_SECRET_ID
 *   BELVO_SECRET_PASSWORD
 */
@Injectable()
export class BelvoOpenFinanceProvider implements OpenFinanceProvider {
  /** Identificador de este proveedor. */
  readonly id = 'belvo';

  /** El consentimiento ocurre en el Belvo Connect Widget del lado cliente. */
  readonly requiresWidget = true;

  private readonly baseUrl: string;
  private readonly secretId: string;
  private readonly secretPassword: string;
  private readonly authHeader: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('BELVO_BASE_URL') ?? 'https://sandbox.belvo.com';
    this.secretId = config.get<string>('BELVO_SECRET_ID') ?? '';
    this.secretPassword = config.get<string>('BELVO_SECRET_PASSWORD') ?? '';
    // Belvo usa autenticación HTTP Basic con (secret_id, secret_password).
    const token = Buffer.from(`${this.secretId}:${this.secretPassword}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  /**
   * Crea un access token para inicializar el Belvo Connect Widget.
   * El cliente abre el widget con este token; el usuario se autentica en su
   * banco y el widget devuelve un `link_id` que luego se finaliza en el backend.
   * @param userId - Usuario solicitante (se asocia como external_id en el widget).
   * @returns Token de widget (Belvo lo expone como `access`).
   */
  async createWidgetToken(userId: string): Promise<OFWidgetToken> {
    const body = await this.post<{ access: string }>('/api/token/', {
      id: this.secretId,
      password: this.secretPassword,
      scopes: 'read_institutions,write_links,read_links',
      // external_id permite correlacionar el link con nuestro usuario.
      widget: { external_id: userId },
    });
    return { accessToken: body.access, expiresAt: null };
  }

  /**
   * Lista las instituciones soportadas por Belvo.
   * @returns Instituciones en forma canónica OF (id = código Belvo).
   */
  async listInstitutions(): Promise<OFInstitution[]> {
    const page = await this.get<BelvoPage<BelvoInstitution>>('/api/institutions/');
    return page.results.map((i) => ({ id: i.name, name: i.display_name }));
  }

  /**
   * Inicia el consentimiento del usuario para una institución.
   *
   * IMPORTANTE: en Belvo el `link` (la conexión autorizada) se crea desde el
   * **Belvo Connect Widget** en el cliente, donde el usuario se autentica en su
   * banco. El backend NO debe recibir las credenciales bancarias. El flujo real:
   *   1. Backend pide un access token de widget: POST /api/token/.
   *   2. El front abre el widget con ese token; el usuario se loguea en su banco.
   *   3. El widget devuelve un `link_id` al front.
   *   4. El front envía ese `link_id` al backend para persistir la conexión.
   *
   * Con Belvo NO se usa este método: el consentimiento va por el widget
   * (createWidgetToken) y la conexión se persiste con POST /connections/finalize
   * al recibir el link_id. Se mantiene por contrato de la interfaz.
   *
   * @param userId - Usuario autenticado.
   * @param institutionId - Código de institución Belvo seleccionada.
   * @returns Nunca: lanza NotImplementedException.
   */
  async startConsent(userId: string, institutionId: string): Promise<OFConsentResult> {
    void userId;
    void institutionId;
    throw new NotImplementedException(
      'Belvo usa el widget de consentimiento: pide widget-token y finaliza con el link_id.',
    );
  }

  /**
   * Trae las cuentas de depósito (ahorros/corriente) de un link Belvo.
   * @param externalConnectionId - link_id emitido por Belvo.
   * @returns Cuentas de depósito en forma canónica OF.
   */
  async fetchAccounts(externalConnectionId: string): Promise<OFAccount[]> {
    const page = await this.get<BelvoPage<BelvoAccount>>(
      `/api/accounts/?link=${encodeURIComponent(externalConnectionId)}`,
    );
    return page.results
      .map((a) => this.toDepositAccount(a))
      .filter((a): a is OFAccount => a !== null);
  }

  /**
   * Trae los productos de crédito (tarjetas y préstamos) de un link Belvo.
   * @param externalConnectionId - link_id emitido por Belvo.
   * @returns Productos de crédito en forma canónica OF.
   */
  async fetchCreditProducts(externalConnectionId: string): Promise<OFCreditProduct[]> {
    const page = await this.get<BelvoPage<BelvoAccount>>(
      `/api/accounts/?link=${encodeURIComponent(externalConnectionId)}`,
    );
    return page.results
      .map((a) => this.toCreditProduct(a))
      .filter((p): p is OFCreditProduct => p !== null);
  }

  /**
   * Mapea una cuenta Belvo a cuenta de depósito OF, o null si no aplica.
   * @param a - Cuenta cruda de Belvo.
   * @returns Cuenta de depósito OF o null (si no es ahorros/corriente).
   */
  private toDepositAccount(a: BelvoAccount): OFAccount | null {
    const type = this.depositTypeOf(a.category);
    if (!type) return null;
    return {
      externalId: a.id,
      name: a.name ?? 'Cuenta',
      type,
      balance: a.balance?.current ?? 0,
      currency: a.currency,
    };
  }

  /**
   * Mapea una cuenta Belvo a producto de crédito OF (tarjeta o préstamo), o null.
   * @param a - Cuenta cruda de Belvo.
   * @returns Producto de crédito OF o null (si es cuenta de depósito).
   */
  private toCreditProduct(a: BelvoAccount): OFCreditProduct | null {
    if (a.category === 'CREDIT_CARD') {
      // TODO(belvo): confirmar nombres/escala de credit_data (días de corte/pago,
      // tasa rotativa como fracción E.A.). La normalización omitirá la tarjeta si
      // faltan estos campos (ver normalizeCreditProduct).
      return {
        externalId: a.id,
        name: a.name ?? 'Tarjeta de crédito',
        type: 'credit_card',
        balance: a.balance?.current ?? 0,
        creditLimit: a.credit_data?.credit_limit ?? undefined,
        statementDay: this.dayOf(a.credit_data?.cutting_date),
        paymentDay: undefined, // TODO(belvo): Belvo no expone día de pago directo.
        rotativoRateEa: a.credit_data?.interest_rate ?? undefined,
      };
    }
    if (a.category === 'LOAN_ACCOUNT') {
      return {
        externalId: a.id,
        name: a.name ?? 'Préstamo',
        type: 'loan',
        balance: a.loan_data?.outstanding_balance ?? a.balance?.current ?? 0,
        effectiveAnnualRate: a.loan_data?.interest_rate ?? 0,
        monthlyPayment: a.loan_data?.monthly_payment ?? 0,
        termMonths: a.loan_data?.no_of_installments ?? 0,
        // TODO(belvo): mapear el tipo de préstamo a loanKind (libre_inversion,
        // hipotecario, vehiculo, ...). Sin loanKind cae a 'libre_inversion'.
      };
    }
    return null;
  }

  /**
   * Traduce la categoría Belvo a un tipo de depósito OF, o undefined si no aplica.
   * @param category - Categoría de cuenta Belvo.
   * @returns 'savings' | 'checking' o undefined.
   */
  private depositTypeOf(category: string): OFAccountType | undefined {
    if (category === 'SAVINGS_ACCOUNT') return 'savings';
    if (category === 'CHECKING_ACCOUNT') return 'checking';
    return undefined;
  }

  /**
   * Extrae el día del mes (1-31) de una fecha ISO, o undefined si no hay dato.
   * @param iso - Fecha en formato ISO (o null/undefined).
   * @returns Día del mes o undefined.
   */
  private dayOf(iso: string | null | undefined): number | undefined {
    if (!iso) return undefined;
    const day = Number(iso.slice(8, 10));
    return Number.isFinite(day) && day >= 1 && day <= 31 ? day : undefined;
  }

  /**
   * Ejecuta un GET autenticado contra la API de Belvo y parsea el JSON.
   * @param path - Ruta relativa (p. ej. "/api/accounts/?link=...").
   * @returns El cuerpo JSON tipado como T.
   * @throws Error si la respuesta no es 2xx.
   */
  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Belvo ${path} respondió ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }

  /**
   * Ejecuta un POST autenticado contra la API de Belvo y parsea el JSON.
   * @param path - Ruta relativa (p. ej. "/api/token/").
   * @param payload - Cuerpo a enviar como JSON.
   * @returns El cuerpo JSON tipado como T.
   * @throws Error si la respuesta no es 2xx.
   */
  private async post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Belvo ${path} respondió ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  }
}
