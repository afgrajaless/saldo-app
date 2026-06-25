import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { computeCycleDates } from '../../domain/card/card-dates';
import { estimateStatement } from '../../domain/card/card-statement';
import { effectiveAnnualToMonthly } from '../../domain/rates/rate-conversion';
import { evaluateUsury } from '../../domain/usury/usury-evaluation';
import { UsuryRepository } from '../usury/usury.repository';
import { CardResponseDto } from './dto/card-response.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { InstallmentPlanResponseDto } from './dto/installment-plan-response.dto';
import { ReconcileStatementDto } from './dto/reconcile-statement.dto';
import { StatementResponseDto } from './dto/statement-response.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { UpcomingPaymentDto } from './dto/upcoming-payment.dto';
import { cardStatements } from '../../db/schema';
import { CardRow, CardsRepository } from './cards.repository';

/** Tipo inferido de la fila de extractos de tarjeta. */
type StatementRow = typeof cardStatements.$inferSelect;

/** Modalidad de usura usada para tarjetas de credito (consumo y ordinario). */
const CREDIT_CARD_USURY_MODALITY = 'consumo_ordinario' as const;

/** Servicio de tarjetas de credito (CRUD + saldo + alerta de usura). */
@Injectable()
export class CardsService {
  constructor(
    private readonly cardsRepository: CardsRepository,
    private readonly usuryRepository: UsuryRepository,
  ) {}

  /**
   * Crea una tarjeta de credito con sus parametros de configuracion.
   * @param userId - Dueno de la tarjeta.
   * @param dto - Datos de la tarjeta.
   * @returns La tarjeta creada con saldo inicial en cero.
   */
  async createCard(userId: string, dto: CreateCardDto): Promise<CardResponseDto> {
    const card = await this.cardsRepository.createCard(userId, dto);
    return this.toEnrichedResponse(card);
  }

  /**
   * Actualiza los campos de una tarjeta del usuario.
   * @param userId - Dueno de la tarjeta.
   * @param accountId - UUID de la tarjeta.
   * @param dto - Campos a actualizar.
   * @returns La tarjeta actualizada.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async updateCard(userId: string, accountId: string, dto: UpdateCardDto): Promise<CardResponseDto> {
    const existing = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!existing) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    const updated = await this.cardsRepository.updateCard(accountId, userId, dto);
    if (!updated) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    return this.toEnrichedResponse(updated);
  }

  /**
   * Obtiene los datos de una tarjeta del usuario con saldo y alerta de usura.
   * @param userId - Dueno de la tarjeta.
   * @param accountId - UUID de la tarjeta.
   * @returns La tarjeta enriquecida con saldo, cupo disponible y alerta de usura.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async findOne(userId: string, accountId: string): Promise<CardResponseDto> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) {
      throw new NotFoundException('Tarjeta de credito no encontrada.');
    }
    return this.toEnrichedResponse(card);
  }

  /**
   * Lista todas las tarjetas activas del usuario, enriquecidas con saldo actual,
   * cupo disponible, fecha de proximo pago y alerta de usura.
   * @param userId - Dueno de las tarjetas.
   * @returns Lista de tarjetas enriquecidas.
   */
  async listCards(userId: string): Promise<CardResponseDto[]> {
    const cards = await this.cardsRepository.listCards(userId);
    return Promise.all(cards.map((c) => this.toEnrichedResponse(c)));
  }

  /**
   * Calcula el saldo adeudado de una tarjeta: cargos totales menos pagos recibidos.
   * Un saldo negativo (mas pagos que cargos) se ajusta a cero.
   * @param accountId - UUID de la tarjeta.
   * @returns Saldo adeudado en pesos.
   */
  async getCardBalance(accountId: string): Promise<number> {
    const [charges, payments] = await Promise.all([
      this.cardsRepository.sumCardCharges(accountId),
      this.cardsRepository.sumCardPayments(accountId),
    ]);
    return Math.max(0, charges - payments);
  }

  /**
   * Obtiene el extracto estimado del ciclo actual de una tarjeta.
   * Si ya existe un extracto para la fecha de corte en BD, lo retorna directamente.
   * Si no, calcula los cargos, cuotas diferidas, base rotativa e intereses del ciclo
   * y persiste el resultado como extracto de estado 'open'.
   *
   * Ventana del ciclo:
   *   - Corte anterior: mismo statementDay del mes anterior.
   *   - Corte actual: statementDay del mes en curso.
   *   - Cargos del ciclo: transactions con occurred_on en [corteAnterior + 1 dia, cutoffDate].
   *   - Cuotas diferidas: card_installment_items con due_on en [corteAnterior + 1 dia, cutoffDate].
   *
   * Base rotativa (revolvingBase):
   *   - Si existe extracto previo cerrado, se usa su reconciled_balance.
   *   - Si no hay extracto previo cerrado, se usa 0 (sin deuda arrastrada conocida).
   *
   * @param accountId - UUID de la tarjeta.
   * @param userId - Dueno esperado; lanza NotFoundException si no coincide.
   * @returns El DTO de extracto estimado o existente.
   */
  async getStatement(accountId: string, userId: string): Promise<StatementResponseDto> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) throw new NotFoundException('Tarjeta de credito no encontrada.');

    const today = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { cutoffDate, paymentDueDate } = computeCycleDates(card.statementDay, card.paymentDay, today);

    // Si ya existe un extracto para este corte, devolverlo directamente.
    const existing = await this.cardsRepository.findStatementByCutoff(accountId, cutoffDate);
    if (existing) {
      return this.toStatementDto(existing);
    }

    // Calcular ventana del ciclo actual.
    const prevMonth = this.previousMonth(today);
    const { cutoffDate: prevCutoff } = computeCycleDates(card.statementDay, card.paymentDay, prevMonth);
    const cycleStart = this.addOneDay(prevCutoff);
    const cycleEnd = cutoffDate;

    // Agregar datos del ciclo en paralelo.
    const [chargesInCycle, installmentDueInCycle, prevStatement] = await Promise.all([
      this.cardsRepository.sumChargesInCycle(accountId, cycleStart, cycleEnd),
      this.cardsRepository.sumInstallmentsDueInCycle(accountId, cycleStart, cycleEnd),
      this.cardsRepository.findPreviousClosedStatement(accountId, cutoffDate),
    ]);

    // Base rotativa: usar saldo reconciliado del extracto previo cerrado, si existe.
    const revolvingBase =
      prevStatement?.reconciledBalance != null ? Number(prevStatement.reconciledBalance) : 0;

    const { estimatedBalance, estimatedMinPayment } = this.computeEstimatedStatement(card, {
      chargesInCycle,
      installmentDueInCycle,
      revolvingBase,
      referenceMonth: today,
    });

    // Persistir la estimacion en BD; on conflict solo actualiza los campos estimados.
    const saved = await this.cardsRepository.upsertEstimatedStatement({
      accountId,
      cutoffDate,
      paymentDueDate,
      estimatedBalance,
      estimatedMinPayment,
    });

    return this.toStatementDto(saved);
  }

  /**
   * Reconcilia el extracto de una tarjeta con los valores reales recibidos del banco.
   * Actualiza (o crea) el extracto con los montos oficiales y cambia el status a
   * 'closed' o 'paid' segun si se incluye el pago total.
   * En el caso de actualizacion (on conflict), solo pisa los campos reconciliados;
   * los campos estimados se conservan intactos.
   * En el caso de insercion (no existe la fila), calcula el estimado como respaldo
   * para los campos NOT NULL.
   * @param accountId - UUID de la tarjeta.
   * @param userId - Dueno esperado; lanza NotFoundException si no coincide.
   * @param dto - Valores reales del extracto bancario.
   * @returns El DTO de extracto reconciliado.
   * @throws BadRequestException si alguno de los montos es negativo.
   */
  async reconcileStatement(
    accountId: string,
    userId: string,
    dto: ReconcileStatementDto,
  ): Promise<StatementResponseDto> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) throw new NotFoundException('Tarjeta de credito no encontrada.');

    if (
      dto.reconciledBalance < 0 ||
      dto.reconciledMinPayment < 0 ||
      (dto.reconciledTotalPayment != null && dto.reconciledTotalPayment < 0)
    ) {
      throw new BadRequestException('Los montos reconciliados deben ser mayores o iguales a cero.');
    }

    // Obtener las fechas del ciclo para la fecha de corte indicada.
    const cycleMonth = dto.cutoffDate.slice(0, 7); // YYYY-MM
    const { paymentDueDate } = computeCycleDates(card.statementDay, card.paymentDay, cycleMonth);

    // Obtener valores estimados existentes; si no hay fila, calcular el estimado como respaldo
    // para el caso de insercion (los campos estimated_* son NOT NULL en la BD).
    const existing = await this.cardsRepository.findStatementByCutoff(accountId, dto.cutoffDate);
    let estimatedBalance: number;
    let estimatedMinPayment: number;

    if (existing) {
      estimatedBalance = Number(existing.estimatedBalance);
      estimatedMinPayment = Number(existing.estimatedMinPayment);
    } else {
      // No existe extracto previo: calcular el estimado on-the-fly como respaldo.
      const prevMonth = this.previousMonth(cycleMonth);
      const { cutoffDate: prevCutoff } = computeCycleDates(
        card.statementDay,
        card.paymentDay,
        prevMonth,
      );
      const cycleStart = this.addOneDay(prevCutoff);

      const [chargesInCycle, installmentDueInCycle, prevStatement] = await Promise.all([
        this.cardsRepository.sumChargesInCycle(accountId, cycleStart, dto.cutoffDate),
        this.cardsRepository.sumInstallmentsDueInCycle(accountId, cycleStart, dto.cutoffDate),
        this.cardsRepository.findPreviousClosedStatement(accountId, dto.cutoffDate),
      ]);

      const revolvingBase =
        prevStatement?.reconciledBalance != null ? Number(prevStatement.reconciledBalance) : 0;

      const computed = this.computeEstimatedStatement(card, {
        chargesInCycle,
        installmentDueInCycle,
        revolvingBase,
        referenceMonth: cycleMonth,
      });
      estimatedBalance = computed.estimatedBalance;
      estimatedMinPayment = computed.estimatedMinPayment;
    }

    // status: 'paid' si se provee el pago total; 'closed' si solo se reconcilia el saldo.
    const status: 'open' | 'closed' | 'paid' = dto.reconciledTotalPayment != null ? 'paid' : 'closed';

    // On conflict: solo actualiza reconciled_* y status, sin tocar estimated_*.
    const saved = await this.cardsRepository.upsertReconciledStatement({
      accountId,
      cutoffDate: dto.cutoffDate,
      paymentDueDate,
      estimatedBalance,
      estimatedMinPayment,
      reconciledBalance: dto.reconciledBalance,
      reconciledMinPayment: dto.reconciledMinPayment,
      reconciledTotalPayment: dto.reconciledTotalPayment ?? null,
      status,
    });

    return this.toStatementDto(saved);
  }

  /**
   * Devuelve los planes diferidos de una tarjeta con su cronograma de cuotas.
   * Valida que la tarjeta pertenezca al usuario antes de consultar.
   * @param accountId - UUID de la tarjeta.
   * @param userId - Dueno esperado.
   * @returns Lista de planes con sus items.
   * @throws NotFoundException si la tarjeta no existe o no es del usuario.
   */
  async getInstallments(accountId: string, userId: string): Promise<InstallmentPlanResponseDto[]> {
    const card = await this.cardsRepository.findCardForUser(accountId, userId);
    if (!card) throw new NotFoundException('Tarjeta de credito no encontrada.');
    const plans = await this.cardsRepository.findInstallmentPlansWithItems(accountId);
    return plans.map((plan) => ({
      id: plan.id,
      accountId: plan.accountId,
      description: plan.description ?? null,
      principal: Number(plan.principal),
      numberOfInstallments: plan.numberOfInstallments,
      monthlyRate: Number(plan.monthlyRate),
      startDate: plan.startDate,
      status: plan.status,
      items: plan.items.map((item) => ({
        number: item.number,
        dueOn: item.dueOn,
        principal: Number(item.principal),
        interest: Number(item.interest),
        balance: Number(item.balance),
      })),
    }));
  }

  /**
   * Devuelve el proximo pago estimado de cada tarjeta activa del usuario.
   * Para cada tarjeta calcula el ciclo actual con computeCycleDates y el
   * extracto estimado (reutilizando la logica de getStatement internamente).
   * @param userId - Dueno de las tarjetas.
   * @returns Lista de proximos pagos por tarjeta.
   */
  async getUpcomingPayments(userId: string): Promise<UpcomingPaymentDto[]> {
    const cards = await this.cardsRepository.listCards(userId);
    return Promise.all(
      cards.map(async (card) => {
        const today = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { paymentDueDate, cutoffDate } = computeCycleDates(
          card.statementDay,
          card.paymentDay,
          today,
        );
        const existing = await this.cardsRepository.findStatementByCutoff(card.id, cutoffDate);
        let estimatedBalance: number;
        let estimatedMinPayment: number;
        if (existing) {
          estimatedBalance = Number(existing.estimatedBalance);
          estimatedMinPayment = Number(existing.estimatedMinPayment);
        } else {
          const prevMonth = this.previousMonth(today);
          const { cutoffDate: prevCutoff } = computeCycleDates(
            card.statementDay,
            card.paymentDay,
            prevMonth,
          );
          const cycleStart = this.addOneDay(prevCutoff);
          const [chargesInCycle, installmentDueInCycle, prevStatement] = await Promise.all([
            this.cardsRepository.sumChargesInCycle(card.id, cycleStart, cutoffDate),
            this.cardsRepository.sumInstallmentsDueInCycle(card.id, cycleStart, cutoffDate),
            this.cardsRepository.findPreviousClosedStatement(card.id, cutoffDate),
          ]);
          const revolvingBase =
            prevStatement?.reconciledBalance != null
              ? Number(prevStatement.reconciledBalance)
              : 0;
          const computed = this.computeEstimatedStatement(card, {
            chargesInCycle,
            installmentDueInCycle,
            revolvingBase,
            referenceMonth: today,
          });
          estimatedBalance = computed.estimatedBalance;
          estimatedMinPayment = computed.estimatedMinPayment;
        }
        return {
          cardId: card.id,
          name: card.name,
          paymentDueDate,
          estimatedMinPayment,
          estimatedBalance,
        };
      }),
    );
  }

  /**
   * Calcula los valores estimados de balance y pago minimo para el ciclo actual.
   * Centraliza la logica de estimacion para reutilizarla en getStatement y en
   * reconcileStatement cuando no existe extracto previo.
   * @param card - Fila combinada de la tarjeta con tasa, porcentaje minimo y cuota de manejo.
   * @param params - Cargos del ciclo, cuotas diferidas, base rotativa y mes de referencia.
   * @returns Objeto con estimatedBalance y estimatedMinPayment.
   */
  private computeEstimatedStatement(
    card: CardRow,
    params: {
      chargesInCycle: number;
      installmentDueInCycle: number;
      revolvingBase: number;
      referenceMonth: string;
    },
  ): { estimatedBalance: number; estimatedMinPayment: number } {
    const managementFeeThisCycle = this.computeManagementFeeForCycle(
      card.managementFee != null ? Number(card.managementFee) : null,
      card.managementFeePeriod,
      params.referenceMonth,
    );

    const monthlyRate = effectiveAnnualToMonthly(Number(card.rotativoRateEa));
    const minPaymentPct = Number(card.minPaymentPct);

    return estimateStatement({
      chargesInCycle: params.chargesInCycle,
      installmentDueInCycle: params.installmentDueInCycle,
      revolvingBase: params.revolvingBase,
      monthlyRate,
      managementFeeThisCycle,
      minPaymentPct,
    });
  }

  /**
   * Mapea una fila de card_statements al DTO de respuesta, convirtiendo strings
   * numericos a number y preservando nulls en los campos reconciliados.
   * @param row - Fila de cardStatements tal como la devuelve Drizzle.
   * @returns El DTO de respuesta del extracto.
   */
  private toStatementDto(row: StatementRow): StatementResponseDto {
    return {
      cutoffDate: row.cutoffDate,
      paymentDueDate: row.paymentDueDate,
      estimatedBalance: Number(row.estimatedBalance),
      estimatedMinPayment: Number(row.estimatedMinPayment),
      reconciledBalance: row.reconciledBalance != null ? Number(row.reconciledBalance) : null,
      reconciledMinPayment:
        row.reconciledMinPayment != null ? Number(row.reconciledMinPayment) : null,
      reconciledTotalPayment:
        row.reconciledTotalPayment != null ? Number(row.reconciledTotalPayment) : null,
      status: row.status,
    };
  }

  /**
   * Suma un dia a una fecha YYYY-MM-DD y retorna la nueva fecha en el mismo formato.
   * Usa UTC para evitar cambios de horario de verano.
   * @param dateStr - Fecha de entrada en formato YYYY-MM-DD.
   * @returns Fecha siguiente en formato YYYY-MM-DD.
   */
  private addOneDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Resta un mes a referenceMonth (YYYY-MM) y retorna el mes anterior en YYYY-MM.
   * @param referenceMonth - Mes de referencia en formato YYYY-MM.
   * @returns Mes anterior en formato YYYY-MM.
   */
  private previousMonth(referenceMonth: string): string {
    const [y, m] = referenceMonth.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${(m - 1).toString().padStart(2, '0')}`;
  }

  /**
   * Calcula la cuota de manejo aplicable en el ciclo actual segun la periodicidad.
   * - 'monthly': se cobra cada ciclo.
   * - 'annual': se cobra solo en enero (mes 1); resto = 0.
   * - 'none': siempre 0.
   * @param fee - Monto de la cuota de manejo; null si no aplica.
   * @param period - Periodicidad de cobro.
   * @param referenceMonth - Mes de referencia en formato YYYY-MM.
   * @returns Monto de cuota de manejo aplicable en el ciclo.
   */
  private computeManagementFeeForCycle(
    fee: number | null,
    period: 'none' | 'monthly' | 'annual',
    referenceMonth: string,
  ): number {
    if (fee == null || period === 'none') return 0;
    if (period === 'monthly') return fee;
    if (period === 'annual') {
      const month = Number(referenceMonth.split('-')[1]);
      return month === 1 ? fee : 0;
    }
    return 0;
  }

  /**
   * Mapea una fila combinada de tarjeta a su DTO de respuesta enriquecido.
   * Consulta en paralelo el saldo y la tasa de usura vigente, luego calcula
   * el cupo disponible, la fecha de proximo pago y la alerta de usura.
   * @param card - Fila combinada accounts + credit_card_details.
   * @returns El DTO de respuesta enriquecido.
   */
  private async toEnrichedResponse(card: CardRow): Promise<CardResponseDto> {
    const today = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [usedAmount, usuryRate] = await Promise.all([
      this.getCardBalance(card.id),
      this.usuryRepository.findCurrent(CREDIT_CARD_USURY_MODALITY, new Date().toISOString().slice(0, 10)),
    ]);

    const creditLimit = Number(card.creditLimit);
    const available = Math.max(0, creditLimit - usedAmount);

    const { paymentDueDate } = computeCycleDates(card.statementDay, card.paymentDay, today);

    let exceedsUsury = false;
    if (usuryRate) {
      const rotativoEa = Number(card.rotativoRateEa);
      const usuryCap = Number(usuryRate.effectiveAnnualRate);
      if (usuryCap > 0) {
        const evaluation = evaluateUsury(rotativoEa, usuryCap);
        exceedsUsury = evaluation.isUsurious;
      }
    }

    return {
      id: card.id,
      name: card.name,
      color: card.color,
      creditLimit,
      statementDay: card.statementDay,
      paymentDay: card.paymentDay,
      rotativoRateEa: Number(card.rotativoRateEa),
      minPaymentPct: Number(card.minPaymentPct),
      managementFee: card.managementFee !== null ? Number(card.managementFee) : null,
      managementFeePeriod: card.managementFeePeriod,
      usedAmount,
      available,
      paymentDueDate,
      exceedsUsury,
      createdAt: card.createdAt,
    };
  }
}
