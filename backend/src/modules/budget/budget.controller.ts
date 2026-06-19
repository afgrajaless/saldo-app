import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BudgetService } from './budget.service';
import { BudgetSummaryDto, BudgetSummaryQueryDto } from './dto/budget-summary.dto';

/** Resumen del presupuesto mensual. Requiere autenticacion. */
@ApiTags('budget')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  /**
   * Devuelve el resumen del presupuesto de un mes.
   * @param userId - Usuario autenticado.
   * @param query - Mes a consultar (opcional).
   * @returns El resumen mensual.
   */
  @Get('summary')
  @ApiOperation({ summary: 'Resumen mensual: ingresos, egresos, balance y por categoria' })
  @ApiResponse({ status: 200, description: 'Resumen del mes.', type: BudgetSummaryDto })
  getSummary(
    @CurrentUser('sub') userId: string,
    @Query() query: BudgetSummaryQueryDto,
  ): Promise<BudgetSummaryDto> {
    return this.budgetService.getSummary(userId, query.month);
  }
}
