import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryRow, CategoriesRepository } from './categories.repository';

/** Servicio de categorias de presupuesto (CRUD aislado por usuario). */
@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  /**
   * Crea una categoria.
   * @param userId - Dueno de la categoria.
   * @param dto - Datos de la categoria.
   * @returns La categoria creada.
   */
  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.create(userId, {
      name: dto.name.trim(),
      type: dto.type,
      color: dto.color ?? '#0B5D3B',
      monthlyBudget: dto.monthlyBudget?.toFixed(2) ?? null,
    });
    return this.toResponse(category);
  }

  /**
   * Lista las categorias del usuario.
   * @param userId - Dueno de las categorias.
   * @returns Las categorias.
   */
  async findAll(userId: string): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesRepository.findAllByUser(userId);
    return categories.map((c) => this.toResponse(c));
  }

  /**
   * Actualiza una categoria del usuario.
   * @param userId - Dueno de la categoria.
   * @param id - UUID de la categoria.
   * @param dto - Campos a actualizar.
   * @returns La categoria actualizada.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const updated = await this.categoriesRepository.update(id, userId, {
      name: dto.name?.trim(),
      color: dto.color,
      monthlyBudget:
        dto.monthlyBudget === undefined ? undefined : dto.monthlyBudget.toFixed(2),
    });
    if (!updated) {
      throw new NotFoundException('Categoria no encontrada.');
    }
    return this.toResponse(updated);
  }

  /**
   * Elimina (soft delete) una categoria del usuario.
   * @param userId - Dueno de la categoria.
   * @param id - UUID de la categoria.
   * @throws NotFoundException si no existe o no es del usuario.
   */
  async remove(userId: string, id: string): Promise<void> {
    const deletedId = await this.categoriesRepository.softDelete(id, userId);
    if (!deletedId) {
      throw new NotFoundException('Categoria no encontrada.');
    }
  }

  /**
   * Mapea una fila de categoria a su DTO de respuesta.
   * @param category - Fila de categoria.
   * @returns El DTO de respuesta.
   */
  private toResponse(category: CategoryRow): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      monthlyBudget: category.monthlyBudget === null ? null : Number(category.monthlyBudget),
      createdAt: category.createdAt,
    };
  }
}
