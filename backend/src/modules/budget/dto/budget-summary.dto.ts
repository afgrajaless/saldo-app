import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

/** Filtro del resumen por mes. */
export class BudgetSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Mes en formato YYYY-MM. Por defecto, el mes actual.',
    example: '2026-06',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'El mes debe tener formato YYYY-MM.' })
  month?: string;
}

/** Resumen de una categoria dentro del periodo. */
export class BudgetCategorySummaryDto {
  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Arriendo' })
  name!: string;

  @ApiProperty({ example: 'expense' })
  type!: string;

  @ApiPropertyOptional({
    description: 'UUID de la categoria padre; null si es de primer nivel.',
    format: 'uuid',
    nullable: true,
  })
  parentId!: string | null;

  @ApiProperty({ example: '#C0392B' })
  color!: string;

  @ApiPropertyOptional({ description: 'Meta mensual.', example: 1500000, nullable: true })
  monthlyBudget!: number | null;

  @ApiProperty({
    description:
      'Total del mes. En una categoria con subcategorias es la suma de estas.',
    example: 1200000,
  })
  spent!: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de la meta consumido (solo egresos con meta).',
    example: 80,
    nullable: true,
  })
  budgetUsage!: number | null;

  @ApiPropertyOptional({
    description: 'Subcategorias con su propio gasto del mes (solo en categorias padre).',
    type: () => [BudgetCategorySummaryDto],
  })
  subcategories?: BudgetCategorySummaryDto[];
}

/** Resumen mensual del presupuesto. */
export class BudgetSummaryDto {
  @ApiProperty({ example: '2026-06' })
  month!: string;

  @ApiProperty({ description: 'Total de ingresos del mes.', example: 5000000 })
  totalIncome!: number;

  @ApiProperty({ description: 'Total de egresos del mes.', example: 3200000 })
  totalExpense!: number;

  @ApiProperty({ description: 'Balance del mes (ingresos - egresos).', example: 1800000 })
  balance!: number;

  @ApiProperty({ type: [BudgetCategorySummaryDto] })
  categories!: BudgetCategorySummaryDto[];
}
