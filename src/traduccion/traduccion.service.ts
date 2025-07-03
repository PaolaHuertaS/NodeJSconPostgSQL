import { Injectable } from '@nestjs/common';
import { GeminiS } from '../claude/claude.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anime } from '../book/entities/rss.entity';
import { PromptService } from '../prompts/prompt.service';

@Injectable()
export class TranslationService {
  constructor(
    private claudeService: GeminiS,
    @InjectRepository(Anime)
    private animeRepository: Repository<Anime>,
    private promptService: PromptService
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

      const systemPrompt = this.promptService.loadPrompt('traduccir-españo');

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
  
  async translateToGerman(animeId: number): Promise<any> {
    try {
      const anime = await this.animeRepository.findOne({ 
        where: { idAnilist: animeId } 
      });

      if (!anime) {
        throw new Error(`Anime con ID ${animeId} no encontrado`);
      }

      if (anime['descriptionTranslated_de']) {
        return {
          success: true,
          alreadyTranslated: true,
          description: anime['description_de'],
          language: 'Alemán',
          message: 'Este anime ya tiene descripción traducida al alemán'
        };
      }

     const systemPrompt = this.promptService.loadPrompt('traduccir-aleman');

      const userMessage = `Traduce esta descripción de anime al alemán:

      TÍTULO: ${anime.title.romaji || anime.title.english}
      GÉNEROS: ${anime.genres?.join(', ') || 'No especificados'}

      DESCRIPCIÓN:
      ${anime.description}`;

      const response = await this.claudeService.chatGemini(userMessage, systemPrompt);

      anime['description_de'] = response.response;
      anime['descriptionTranslated_de'] = true;
      await this.animeRepository.save(anime);

      return {
        success: true,
        translated: true,
        description: response.response,
        language: 'Alemán',
        aiProvider: response.provider
      };

    } catch (error) {
      console.error('Error traduciendo al alemán:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async translateToPortuguese(animeId: number): Promise<any> {
    try {
      const anime = await this.animeRepository.findOne({ 
        where: { idAnilist: animeId } 
      });

      if (!anime) {
        throw new Error(`Anime con ID ${animeId} no encontrado`);
      }

      if (anime.descriptionTranslated_pt) {
        return {
          success: true,
          alreadyTranslated: true,
          description: anime.description_pt,
          language: 'Português (Brasil)',
          message: 'Este anime ya tiene descripción traducida al portugués'
        };
      }

      const systemPrompt = `Eres un traductor especializado en anime. Traduce la siguiente descripción al portugués brasileño de manera natural y fluida.

    Reglas:
    - Mantén el tono original
    - NO traduzcas nombres de personajes, lugares o técnicas especiales
    - Preserva términos japoneses como -san, -kun, -chan
    - Usa portugués brasileño natural y comprensible`;

      const userMessage = `Traduce esta descripción de anime al portugués brasileño:

      TÍTULO: ${anime.title.romaji || anime.title.english}
      GÉNEROS: ${anime.genres?.join(', ') || 'No especificados'}

      DESCRIPCIÓN:
      ${anime.description}`;

      const response = await this.claudeService.chatGemini(userMessage, systemPrompt);

      anime.description_pt = response.response;
      anime.descriptionTranslated_pt = true;
      await this.animeRepository.save(anime);

      return {
        success: true,
        translated: true,
        description: response.response,
        language: 'Português (Brasil)',
        aiProvider: response.provider
      };

    } catch (error) {
      console.error('Error traduciendo al portugués:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async translateToItalian(animeId: number): Promise<any> {
    try {
      const anime = await this.animeRepository.findOne({ 
        where: { idAnilist: animeId } 
      });

      if (!anime) {
        throw new Error(`Anime con ID ${animeId} no encontrado`);
      }

      if (anime.descriptionTranslated_it) {
        return {
          success: true,
          alreadyTranslated: true,
          description: anime.description_it,
          language: 'Italiano',
          message: 'Este anime ya tiene descripción traducida al italiano'
        };
      }

      const systemPrompt = `Eres un traductor especializado en anime. Traduce la siguiente descripción al italiano de manera natural y fluida.

      Reglas:
      - Mantén el tono original
      - NO traduzcas nombres de personajes, lugares o técnicas especiales
      - Preserva términos japoneses como -san, -kun, -chan
      - Usa italiano natural y comprensible`;

      const userMessage = `Traduce esta descripción de anime al italiano:

      TÍTULO: ${anime.title.romaji || anime.title.english}
      GÉNEROS: ${anime.genres?.join(', ') || 'No especificados'}

      DESCRIPCIÓN:
      ${anime.description}`;

      const response = await this.claudeService.chatGemini(userMessage, systemPrompt);

      anime.description_it = response.response;
      anime.descriptionTranslated_it = true;
      await this.animeRepository.save(anime);

      return {
        success: true,
        translated: true,
        description: response.response,
        language: 'Italiano',
        aiProvider: response.provider
      };

    } catch (error) {
      console.error('Error traduciendo al italiano:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async translateToFrench(animeId: number): Promise<any> {
    try {
      const anime = await this.animeRepository.findOne({ 
        where: { idAnilist: animeId } 
      });

      if (!anime) {
        throw new Error(`Anime con ID ${animeId} no encontrado`);
      }

      if (anime.descriptionTranslated_fr) {
        return {
          success: true,
          alreadyTranslated: true,
          description: anime.description_fr,
          language: 'Français',
          message: 'Este anime ya tiene descripción traducida al francés'
        };
      }

      const systemPrompt = `Eres un traductor especializado en anime. Traduce la siguiente descripción al francés de manera natural y fluida.

    Reglas:
    - Mantén el tono original
    - NO traduzcas nombres de personajes, lugares o técnicas especiales
    - Preserva términos japoneses como -san, -kun, -chan
    - Usa francés natural y comprensible`;

      const userMessage = `Traduce esta descripción de anime al francés:

    TÍTULO: ${anime.title.romaji || anime.title.english}
    GÉNEROS: ${anime.genres?.join(', ') || 'No especificados'}

    DESCRIPCIÓN:
    ${anime.description}`;

      const response = await this.claudeService.chatGemini(userMessage, systemPrompt);

      anime.description_fr = response.response;
      anime.descriptionTranslated_fr = true;
      await this.animeRepository.save(anime);

      return {
        success: true,
        translated: true,
        description: response.response,
        language: 'Français',
        aiProvider: response.provider
      };

    } catch (error) {
      console.error('Error traduciendo al francés:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  

}