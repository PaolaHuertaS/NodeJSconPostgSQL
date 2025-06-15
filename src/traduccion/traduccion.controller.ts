import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { TranslationService } from './traduccion.service';

@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('anime/:id')
  async translateAnime(@Param('id') animeId: string) {
    try {
      const id = parseInt(animeId);
      if (isNaN(id)) {
        throw new HttpException('ID de anime inválido', HttpStatus.BAD_REQUEST);
      }

      const result = await this.translationService.translateAnimeDescription(id);
      
      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error interno del servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

