import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportResultDto } from './dto/import-result.dto';
import { ImportService } from './import.service';

/** Tamano maximo del archivo a importar (5 MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Importacion de movimientos desde archivo. Requiere autenticacion. */
@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Importa movimientos desde un archivo XLSX o CSV.
   * @param userId - Usuario autenticado.
   * @param file - Archivo subido (campo 'file').
   * @returns Resumen de lo importado.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar movimientos desde un archivo XLSX o CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Importación realizada.', type: ImportResultDto })
  @ApiResponse({ status: 400, description: 'Archivo inválido o sin movimientos.' })
  import(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo en el campo "file".');
    }
    return this.importService.importFile(userId, file.buffer);
  }
}
