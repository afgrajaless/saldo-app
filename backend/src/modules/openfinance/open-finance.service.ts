import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OFInstitution, OFWidgetToken } from '../../domain/openfinance/types';
import { normalizeAccount, normalizeCreditProduct } from '../../domain/openfinance/normalize';
import { SyncSummaryDto } from './dto/sync-summary.dto';
import { ConnectionRow, OpenFinanceRepository } from './open-finance.repository';
import { OPEN_FINANCE_PROVIDER, OpenFinanceProvider } from './provider/open-finance.provider';

/** Orquesta el proveedor de Open Finance y concilia los datos hacia Saldo. */
@Injectable()
export class OpenFinanceService {
  constructor(
    private readonly repo: OpenFinanceRepository,
    @Inject(OPEN_FINANCE_PROVIDER) private readonly provider: OpenFinanceProvider,
  ) {}

  /** Lista las instituciones disponibles del proveedor. */
  async listInstitutions(): Promise<OFInstitution[]> {
    return this.provider.listInstitutions();
  }

  /**
   * Crea una conexión e inicia el consentimiento.
   * @param userId - Usuario autenticado.
   * @param institutionId - Institución a conectar.
   * @returns La conexión creada (estado según el consentimiento).
   */
  async createConnection(userId: string, institutionId: string): Promise<ConnectionRow> {
    const insts = await this.provider.listInstitutions();
    const inst = insts.find((i) => i.id === institutionId);
    if (!inst) {
      throw new NotFoundException('Institución no encontrada.');
    }
    const consent = await this.provider.startConsent(userId, institutionId);
    return this.repo.createConnection(userId, {
      institutionId,
      institutionName: inst.name,
      provider: this.provider.id,
      externalConnectionId: consent.externalConnectionId,
      status: consent.status,
      consentGrantedAt: consent.status === 'active' ? new Date() : null,
      consentExpiresAt: consent.consentExpiresAt ? new Date(consent.consentExpiresAt) : null,
    });
  }

  /**
   * Sincroniza: trae cuentas y créditos y los concilia (upsert idempotente).
   * @param userId - Usuario autenticado.
   * @param connectionId - Conexión a sincronizar.
   * @returns Resumen de creados/actualizados/omitidos.
   */
  async sync(userId: string, connectionId: string): Promise<SyncSummaryDto> {
    const conn = await this.repo.findConnectionForUser(connectionId, userId);
    if (!conn || !conn.externalConnectionId) {
      throw new NotFoundException('Conexión no encontrada.');
    }
    const summary: SyncSummaryDto = {
      accountsCreated: 0, accountsUpdated: 0,
      cardsCreated: 0, cardsUpdated: 0,
      debtsCreated: 0, debtsUpdated: 0, skipped: 0,
    };

    try {
      const ofAccounts = await this.provider.fetchAccounts(conn.externalConnectionId);
      for (const ofAcc of ofAccounts) {
        const n = normalizeAccount(ofAcc);
        const { created, accountId } = await this.repo.upsertAccount(userId, connectionId, n);
        created ? summary.accountsCreated++ : summary.accountsUpdated++;
        await this.repo.insertSnapshot(userId, accountId, n.balance);
      }

      const ofProducts = await this.provider.fetchCreditProducts(conn.externalConnectionId);
      for (const ofProd of ofProducts) {
        const r = normalizeCreditProduct(ofProd);
        if (r.kind === 'skipped') {
          summary.skipped++;
          continue;
        }
        if (r.kind === 'card') {
          const { created, accountId } = await this.repo.upsertCard(userId, connectionId, r.card);
          created ? summary.cardsCreated++ : summary.cardsUpdated++;
          await this.repo.insertSnapshot(userId, accountId, r.card.balance);
        } else {
          const { created } = await this.repo.upsertDebt(userId, connectionId, r.debt);
          created ? summary.debtsCreated++ : summary.debtsUpdated++;
        }
      }
    } catch (error: unknown) {
      await this.repo.updateConnection(connectionId, { status: 'error' });
      throw error;
    }

    await this.repo.updateConnection(connectionId, { lastSyncedAt: new Date() });
    return summary;
  }

  /**
   * Crea un token efímero para abrir el widget de consentimiento del proveedor.
   * @param userId - Usuario autenticado.
   * @returns Token de widget para inicializar el cliente.
   */
  async createWidgetToken(userId: string): Promise<OFWidgetToken> {
    return this.provider.createWidgetToken(userId);
  }

  /**
   * Finaliza una conexión iniciada por widget: el cliente ya obtuvo el
   * identificador externo (p. ej. el link_id de Belvo) tras autenticar al
   * usuario en su banco, y aquí se persiste como conexión activa.
   * @param userId - Usuario autenticado.
   * @param institutionId - Institución conectada.
   * @param externalConnectionId - Identificador de la conexión emitido por el proveedor.
   * @returns La conexión recién persistida.
   */
  async finalizeConnection(
    userId: string,
    institutionId: string,
    externalConnectionId: string,
  ): Promise<ConnectionRow> {
    const insts = await this.provider.listInstitutions();
    const inst = insts.find((i) => i.id === institutionId);
    if (!inst) {
      throw new NotFoundException('Institución no encontrada.');
    }
    return this.repo.createConnection(userId, {
      institutionId,
      institutionName: inst.name,
      provider: this.provider.id,
      externalConnectionId,
      status: 'active',
      consentGrantedAt: new Date(),
      consentExpiresAt: null,
    });
  }

  /** Lista las conexiones del usuario. */
  async listConnections(userId: string): Promise<ConnectionRow[]> {
    return this.repo.findConnectionsByUser(userId);
  }

  /**
   * Revoca una conexión (deja de refrescar; conserva lo importado).
   * @param userId - Usuario autenticado.
   * @param connectionId - Conexión a revocar.
   */
  async revoke(userId: string, connectionId: string): Promise<void> {
    const conn = await this.repo.findConnectionForUser(connectionId, userId);
    if (!conn) {
      throw new NotFoundException('Conexión no encontrada.');
    }
    await this.repo.updateConnection(connectionId, { status: 'revoked' });
  }
}
