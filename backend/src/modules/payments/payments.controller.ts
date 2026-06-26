import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto, PaymentResultDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

/** Pagos de una obligacion. Rutas anidadas bajo la deuda y autenticadas. */
@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debts/:debtId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Registra un pago (regular o abono a capital) sobre la deuda.
   * @param userId - Usuario autenticado.
   * @param debtId - UUID de la deuda.
   * @param dto - Datos del pago.
   * @returns El pago y, si es abono, el resumen del recalculo.
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un pago o abono a capital' })
  @ApiParam({ name: 'debtId', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Pago registrado.', type: PaymentResultDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos (p. ej. abono sin modalidad).' })
  @ApiResponse({ status: 404, description: 'Deuda no encontrada.' })
  register(
    @CurrentUser('sub') userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResultDto> {
    return this.paymentsService.register(userId, debtId, dto);
  }

  /**
   * Lista los pagos de la deuda.
   * @param userId - Usuario autenticado.
   * @param debtId - UUID de la deuda.
   * @returns Los pagos de la deuda.
   */
  @Get()
  @ApiOperation({ summary: 'Listar los pagos de una obligación' })
  @ApiParam({ name: 'debtId', description: 'UUID de la deuda', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de pagos.', type: [PaymentResponseDto] })
  @ApiResponse({ status: 404, description: 'Deuda no encontrada.' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Param('debtId', ParseUUIDPipe) debtId: string,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentsService.findAll(userId, debtId);
  }
}
