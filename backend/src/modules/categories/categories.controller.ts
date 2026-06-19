import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/** CRUD de categorias de presupuesto. Todas las rutas exigen autenticacion. */
@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Crea una categoria.
   * @param userId - Usuario autenticado.
   * @param dto - Datos de la categoria.
   * @returns La categoria creada.
   */
  @Post()
  @ApiOperation({ summary: 'Crear una categoria de ingreso o egreso' })
  @ApiResponse({ status: 201, description: 'Categoria creada.', type: CategoryResponseDto })
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(userId, dto);
  }

  /**
   * Lista las categorias del usuario.
   * @param userId - Usuario autenticado.
   * @returns Las categorias.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las categorias del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de categorias.', type: [CategoryResponseDto] })
  findAll(@CurrentUser('sub') userId: string): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(userId);
  }

  /**
   * Actualiza una categoria.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la categoria.
   * @param dto - Campos a actualizar.
   * @returns La categoria actualizada.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una categoria' })
  @ApiParam({ name: 'id', description: 'UUID de la categoria', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Categoria actualizada.', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada.' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(userId, id, dto);
  }

  /**
   * Elimina (soft delete) una categoria.
   * @param userId - Usuario autenticado.
   * @param id - UUID de la categoria.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una categoria (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID de la categoria', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Categoria eliminada.' })
  @ApiResponse({ status: 404, description: 'Categoria no encontrada.' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.categoriesService.remove(userId, id);
  }
}
