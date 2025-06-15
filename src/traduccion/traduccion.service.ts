import { Injectable } from '@nestjs/common';
import { GeminiS } from '../claude/claude.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anime } from '../book/entities/rss.entity';

@Injectable()
export class TranslationService {
  constructor(
    private claudeService: GeminiS,
    @InjectRepository(Anime)
    private animeRepository: Repository<Anime>,
  ) {}

  async translateAnimeDescription(animeId: number): Promise<any> {
    try {
      const anime = await this.animeRepository.findOne({ 
        where: { idAnilist: animeId } 
      });

      if (!anime) {
        throw new Error(`Anime con ID ${animeId} no encontrado`);
      }

      if (anime.descriptionTranslated) {
        return {
          success: true,
          alreadyTranslated: true,
          description: anime.description,
          message: 'Este anime ya tiene descripción traducida'
        };
      }

      // Prompt específico para traducción de anime
      const systemPrompt = `Eres un traductor especializado en anime. Traduce la siguiente descripción del inglés al español de manera natural y fluida.

            Reglas:
            - Mantén el tono original
            - NO traduzcas nombres de personajes, lugares o técnicas especiales
            - Preserva términos japoneses como -san, -kun, -chan
            - Usa español neutro y comprensible`;

      const userMessage = `Traduce esta descripción de anime al español:

TÍTULO: ${anime.title.romaji || anime.title.english}
GÉNEROS: ${anime.genres?.join(', ') || 'No especificados'}

DESCRIPCIÓN:
${anime.description}`;

      // Llamar a Gemini para traducir
      const response = await this.claudeService.chatGemini(userMessage, systemPrompt);

      // Actualizar anime con descripción traducida
      anime.description = response.response;
      anime.descriptionTranslated = true;
      await this.animeRepository.save(anime);

      return {
        success: true,
        translated: true,
        description: response.response,
        aiProvider: response.provider
      };

    } catch (error) {
      console.error('Error traduciendo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}