import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

/**
 * DTO para actualizar parcialmente un gasto compartido.
 * Hereda todas las propiedades de CreateExpenseDto como opcionales,
 * conservando las validaciones de class-validator y la documentacion Swagger.
 */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
