import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays, daysBetween, today } from '../../shared/date/add-months';
import { accrualSchedule, projectCdt } from '../../domain/yield/yield-projection';
import { AccountResponseDto } from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  AccountProjectionDto,
  NetWorthPointDto,
  ProjectionPointDto,
} from './dto/projection.dto';
import { CreateSnapshotDto, SnapshotResponseDto } from './dto/snapshot.dto';
import { SetYieldDto } from './dto/set-yield.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountRow, AccountsRepository, SnapshotRow } from './accounts.repository';

/** Cantidad de puntos (meses) de la curva de proyeccion por defecto. */
const PROJECTION_STEPS = 12;

/** Servicio de cuentas (CRUD aislado por usuario). */
@Injectable()
export class AccountsService {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  /**
   * Crea una cuenta validando que el nombre no este repetido.
   * @param userId - Dueno de la cuenta.
   * @param dto - Datos de la cuenta.
   * @returns La cuenta creada.
   */
  async create(userId: string, dto: CreateAccountDto): Promise<AccountResponseDto> {
    const name = dto.name.trim();
    await this.ensureNameAvailable(userId, name);
    const account = await this.accountsRepository.create(userId, {
      name,
      color: dto.color ?? '#2D6FB0',
    });
    return this.toResponse(account);
  }

  /**
   * Verifica que no exista ya otra cuenta con el mismo nombre.
   * @param userId - Dueno de las cuentas.
   * @param name - Nombre propuesto.
   * @param ignoreId - Id a ignorar (la propia cuenta al editar).
   * @throws ConflictException si el nombre ya esta en uso.
   */
  private async ensureNameAvailable(
    userId: string,
    name: string,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.accountsRepository.findByName(userId, name);
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(`Ya tienes una cuenta "${name}".`);
    }
  }

  /**
   * Lista las cuentas del usuario.
   * @param userId - Dueno de las cuentas.
   * @returns Las cuentas.
   */
  async findAll(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountsRepository.findAllByUser(userId);
    return accounts.map((a) => this.toResponse(a));
  }

  /**
   * Actualiza una cuenta del usuario.
   * @param userId - Dueno de la cuenta.
   * @param id - UUID de la cuenta.
   * @param dto - Campos a actualizar.
   * @returns La cuenta actualizada.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async update(userId: string, id: string, dto: UpdateAccountDto): Promise<AccountResponseDto> {
    const current = await this.accountsRepository.findByIdForUser(id, userId);
    if (!current) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    if (current.source === 'open_finance') {
      throw new ConflictException(
        'Esta cuenta está vinculada a un banco por Open Finance y no se edita a mano.',
      );
    }
    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== current.name.toLowerCase()) {
      await this.ensureNameAvailable(userId, name, id);
    }
    const updated = await this.accountsRepository.update(id, userId, { name, color: dto.color });
    if (!updated) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    return this.toResponse(updated);
  }

  /**
   * Elimina (soft delete) una cuenta del usuario.
   * @param userId - Dueno de la cuenta.
   * @param id - UUID de la cuenta.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const current = await this.accountsRepository.findByIdForUser(id, userId);
    if (!current) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    if (current.source === 'open_finance') {
      throw new ConflictException(
        'Esta cuenta está vinculada a un banco por Open Finance y no se edita a mano.',
      );
    }
    await this.accountsRepository.softDelete(id, userId);
  }

  /**
   * Configura el rendimiento de una cuenta (remunerada o CDT).
   * Registra la tasa en el historial y, si es CDT, guarda sus condiciones.
   * @param userId - Dueno de la cuenta.
   * @param id - UUID de la cuenta.
   * @param dto - Configuracion del rendimiento.
   * @returns La cuenta actualizada.
   * @throws NotFoundException si la cuenta no existe o no es del usuario.
   */
  async setYield(userId: string, id: string, dto: SetYieldDto): Promise<AccountResponseDto> {
    const account = await this.accountsRepository.findByIdForUser(id, userId);
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    if (account.source === 'open_finance') {
      throw new ConflictException(
        'Esta cuenta está vinculada a un banco por Open Finance y no se edita a mano.',
      );
    }
    const rate = dto.effectiveAnnualRate ?? null;
    const updated = await this.accountsRepository.setYield(
      id,
      userId,
      dto.yieldType,
      rate === null ? null : rate.toFixed(6),
    );
    if (dto.yieldType !== 'none' && rate !== null) {
      await this.accountsRepository.insertRate(id, rate.toFixed(6), dto.rateValidFrom ?? today());
    }
    if (dto.yieldType === 'cdt') {
      const openedOn = dto.openedOn!;
      await this.accountsRepository.upsertCdtTerms(id, userId, {
        principal: dto.principal!.toFixed(2),
        openedOn,
        termDays: dto.termDays!,
        maturesOn: addDays(openedOn, dto.termDays!),
        effectiveAnnualRate: rate!.toFixed(6),
        withholdingRate: (dto.withholdingRate ?? 0.04).toFixed(4),
        interestPayment: dto.interestPayment ?? 'at_maturity',
      });
    }
    return this.toResponse(updated ?? account);
  }

  /**
   * Registra (o reemplaza) el saldo real de una cuenta en una fecha.
   * Solo es valido para cuentas de tipo asset; las tarjetas de credito (kind='credit_card')
   * no admiten snapshots de saldo manual.
   * @param userId - Dueno de la cuenta.
   * @param accountId - UUID de la cuenta.
   * @param dto - Saldo y fecha.
   * @returns El snapshot guardado.
   * @throws NotFoundException si la cuenta no existe o no es del usuario.
   * @throws BadRequestException si la cuenta es una tarjeta de credito.
   */
  async addSnapshot(
    userId: string,
    accountId: string,
    dto: CreateSnapshotDto,
  ): Promise<SnapshotResponseDto> {
    const account = await this.getOwnedAccount(userId, accountId);
    if (account.kind === 'credit_card') {
      throw new BadRequestException('No puedes registrar saldo en una tarjeta de credito.');
    }
    const row = await this.accountsRepository.upsertSnapshot(
      userId,
      accountId,
      dto.balance.toFixed(2),
      dto.asOfDate,
    );
    return this.toSnapshotResponse(row);
  }

  /**
   * Lista los snapshots de saldo de una cuenta.
   * @param userId - Dueno de la cuenta.
   * @param accountId - UUID de la cuenta.
   * @returns Los snapshots ordenados por fecha.
   */
  async listSnapshots(userId: string, accountId: string): Promise<SnapshotResponseDto[]> {
    await this.getOwnedAccount(userId, accountId);
    const rows = await this.accountsRepository.listSnapshots(accountId);
    return rows.map((r) => this.toSnapshotResponse(r));
  }

  /**
   * Elimina un snapshot de la cuenta.
   * @param userId - Dueno de la cuenta.
   * @param snapshotId - UUID del snapshot.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async removeSnapshot(userId: string, snapshotId: string): Promise<void> {
    const deletedId = await this.accountsRepository.deleteSnapshot(snapshotId, userId);
    if (!deletedId) {
      throw new NotFoundException('Snapshot no encontrado.');
    }
  }

  /**
   * Proyecta el crecimiento de una cuenta con rendimiento (curva para grafico).
   * Para CDT proyecta hasta el vencimiento e incluye su estado; para cuenta
   * remunerada proyecta `months` meses desde el ultimo saldo conocido.
   * @param userId - Dueno de la cuenta.
   * @param id - UUID de la cuenta.
   * @param months - Horizonte en meses (solo cuenta remunerada).
   * @returns La proyeccion con su curva de puntos.
   * @throws NotFoundException si la cuenta no existe o no genera rendimiento.
   */
  async projection(userId: string, id: string, months = PROJECTION_STEPS): Promise<AccountProjectionDto> {
    const account = await this.getOwnedAccount(userId, id);
    if (account.yieldType === 'none' || account.effectiveAnnualRate === null) {
      throw new NotFoundException('La cuenta no tiene rendimiento configurado.');
    }
    const rate = Number(account.effectiveAnnualRate);
    if (account.yieldType === 'cdt') {
      return this.cdtProjection(id, rate);
    }
    return this.savingsProjection(id, rate, months);
  }

  /**
   * Construye la proyeccion de una cuenta remunerada desde su ultimo saldo.
   * @param accountId - UUID de la cuenta.
   * @param rate - Tasa E.A.
   * @param months - Horizonte en meses.
   * @returns La proyeccion.
   */
  private async savingsProjection(
    accountId: string,
    rate: number,
    months: number,
  ): Promise<AccountProjectionDto> {
    const start = today();
    const snapshot = await this.accountsRepository.latestSnapshotOnOrBefore(accountId, start);
    const base = snapshot ? Number(snapshot.balance) : 0;
    const totalDays = Math.round((365 * months) / 12);
    const schedule = accrualSchedule(base, rate, totalDays, months);
    const points: ProjectionPointDto[] = schedule.map((p) => ({
      date: addDays(start, p.day),
      value: p.value,
      accruedInterest: p.accruedInterest,
    }));
    return { yieldType: 'savings', effectiveAnnualRate: rate, baseValue: base, points };
  }

  /**
   * Construye la proyeccion y el estado de un CDT.
   * @param accountId - UUID de la cuenta.
   * @param rate - Tasa E.A. fija.
   * @returns La proyeccion con el estado del CDT.
   */
  private async cdtProjection(accountId: string, rate: number): Promise<AccountProjectionDto> {
    const terms = await this.accountsRepository.getCdtTerms(accountId);
    if (!terms) {
      throw new NotFoundException('El CDT no tiene condiciones configuradas.');
    }
    const principal = Number(terms.principal);
    const withholdingRate = Number(terms.withholdingRate);
    const cdt = projectCdt(principal, rate, terms.termDays, withholdingRate);
    // Curva mensual desde la apertura hasta el vencimiento.
    const stepsByMonth = Math.max(1, Math.round(terms.termDays / 30));
    const schedule = accrualSchedule(principal, rate, terms.termDays, stepsByMonth);
    const points: ProjectionPointDto[] = schedule.map((p) => ({
      date: addDays(terms.openedOn, p.day),
      value: p.value,
      accruedInterest: p.accruedInterest,
    }));
    const daysRemaining = Math.max(0, daysBetween(today(), terms.maturesOn));
    return {
      yieldType: 'cdt',
      effectiveAnnualRate: rate,
      baseValue: principal,
      points,
      cdt: {
        principal,
        maturesOn: terms.maturesOn,
        daysRemaining,
        grossInterest: cdt.grossInterest,
        withholding: cdt.withholding,
        netInterest: cdt.netInterest,
        maturityValue: cdt.maturityValue,
      },
    };
  }

  /**
   * Devuelve la serie de patrimonio (suma de snapshots por fecha menos deudas de tarjetas).
   * Las tarjetas de credito son pasivos: se resta su saldo adeudado de cada punto
   * de la serie para reflejar el patrimonio neto real.
   * @param userId - Dueno de los datos.
   * @returns Los puntos de patrimonio ordenados por fecha.
   */
  async netWorthSeries(userId: string): Promise<NetWorthPointDto[]> {
    const [rows, liabilityStr] = await Promise.all([
      this.accountsRepository.netWorthSeries(userId),
      this.accountsRepository.sumCreditCardLiabilities(userId),
    ]);
    const liability = Number(liabilityStr);
    return rows.map((r) => ({ date: r.asOfDate, total: Number(r.total) - liability }));
  }

  /**
   * Recupera una cuenta del usuario o lanza 404.
   * @param userId - Dueno esperado.
   * @param id - UUID de la cuenta.
   * @returns La cuenta.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  private async getOwnedAccount(userId: string, id: string): Promise<AccountRow> {
    const account = await this.accountsRepository.findByIdForUser(id, userId);
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada.');
    }
    return account;
  }

  /**
   * Mapea un snapshot a su DTO de respuesta.
   * @param row - Fila de snapshot.
   * @returns El DTO de respuesta.
   */
  private toSnapshotResponse(row: SnapshotRow): SnapshotResponseDto {
    return { id: row.id, balance: Number(row.balance), asOfDate: row.asOfDate };
  }

  /**
   * Mapea una fila de cuenta a su DTO de respuesta.
   * @param account - Fila de cuenta.
   * @returns El DTO de respuesta.
   */
  private toResponse(account: AccountRow): AccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      color: account.color,
      kind: account.kind,
      yieldType: account.yieldType,
      effectiveAnnualRate:
        account.effectiveAnnualRate === null ? null : Number(account.effectiveAnnualRate),
      createdAt: account.createdAt,
    };
  }
}
