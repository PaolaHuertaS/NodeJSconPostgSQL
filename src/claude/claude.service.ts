import { Injectable } from '@nestjs/common';
import * as NestExceptions from '@nestjs/common';
import { PromptService } from '../prompts/prompt.service';

@Injectable()
export class GeminiS {
  private geminiApiKey: string | null = null;
  private geminiApiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  constructor(private readonly promptService: PromptService) {
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    
    if (this.geminiApiKey) {
      console.log('✅ Gemini API Key configurada correctamente');
    } else {
      console.warn('⚠️ GEMINI_API_KEY no encontrada en variables de entorno');
    }
  }

  // Método principal para chat usando API REST de Gemini
  async chatGemini(message: string, systemPrompt?: string): Promise<any> {
    try {
      if (!message || message.trim().length === 0) {
        throw new NestExceptions.BadRequestException('El mensaje no puede estar vacío');
      }

      return await this.callGeminiAPI(message, systemPrompt);

    } catch (error: any) {
      console.error('Error calling Gemini API:', error);

      if (error instanceof NestExceptions.HttpException) {
        throw error;
      }
    }
  }

  private async callGeminiAPI(message: string, systemPrompt?: string): Promise<any> {
    try {
      // Crear el prompt combinado
      let fullPrompt = message;
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${message}`;
      }

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('🚀 Enviando solicitud a Gemini 1.5 Flash...');
      console.log('📍 URL:', this.geminiApiUrl);

      const response = await fetch(`${this.geminiApiUrl}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📊 Status de respuesta:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error de Gemini API:', errorText);

        if (response.status === 400) {
          throw new NestExceptions.BadRequestException('Solicitud inválida a Gemini API');
        } else if (response.status === 403) {
          throw new NestExceptions.ForbiddenException('API key de Gemini inválida o sin permisos');
        } else if (response.status === 404) {
          throw new NestExceptions.NotFoundException('Modelo de Gemini no encontrado');
        } 

        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta recibida de Gemini 1.5 Flash');

      if (!data.candidates || data.candidates.length === 0) {
        console.error('❌ Respuesta inválida de Gemini:', JSON.stringify(data, null, 2));
        throw new Error('No se recibió respuesta válida de Gemini');
      }

      const candidate = data.candidates[0];
      if (candidate.finishReason === 'SAFETY') {
        throw new NestExceptions.BadRequestException('Contenido bloqueado por filtros de seguridad de Gemini');
      }

      const responseText = candidate?.content?.parts?.[0]?.text || 'No se pudo generar respuesta';

      return {
        response: responseText,
        provider: 'gemini-1.5-flash',
        model: 'gemini-1.5-flash',
        cost: 'free',
        finishReason: candidate.finishReason
      };
    } catch (error: any) {
      console.error('❌ Error específico con Gemini API:', error.message);
      throw error;
    }
  }

  // Métodos de análisis, recomendaciones y contexto cultural (sin cambios en la lógica)
  async analizaAnime(animeData: any): Promise<any> {
    try {
     const systemPrompt = this.promptService.loadPrompt('anime-analisis');

      const userMessage = `Analiza este anime:
      Título: ${animeData.title?.romaji || animeData.title?.english || 'Sin título'}
      Géneros: ${animeData.genres?.join(', ') || 'No especificados'}
      Estado: ${animeData.status || 'Desconocido'}
      Episodios: ${animeData.episodes || 'No especificado'}
      Descripción: ${animeData.description ? animeData.description.substring(0, 400) + '...' : 'Sin descripción'}`;

      const aiResponse = await this.chatGemini(userMessage, systemPrompt);

      return {
        analysis: aiResponse.response,
        anime: animeData,
        aiProvider: aiResponse.provider,
        model: aiResponse.model
      };
    } catch (error: any) {
      console.error('Error analyzing anime:', error);

      if (error instanceof NestExceptions.HttpException) {
        throw error;
      }

      throw new NestExceptions.InternalServerErrorException('Error al analizar el anime');
    }
  }

  async getPersonalizadadRecommendation(userPreferences: string, animeHistory?: string[]): Promise<any> {
    try {
      const systemPrompt = this.promptService.loadPrompt('recomendaciones');

      let userMessage = `Basándote en estas preferencias: "${userPreferences}"`;

      if (animeHistory && animeHistory.length > 0) {
        userMessage += `\n\nEl usuario ha visto estos animes: ${animeHistory.join(', ')}`;
      }

      userMessage += '\n\nProporciona recomendaciones de anime personalizadas con explicaciones detalladas.';

      const aiResponse = await this.chatGemini(userMessage, systemPrompt);

      return {
        recommendations: aiResponse.response,
        preferences: userPreferences,
        history: animeHistory,
        aiProvider: aiResponse.provider,
        model: aiResponse.model
      };
    } catch (error: any) {
      console.error('Error getting recommendations:', error);

      if (error instanceof NestExceptions.HttpException) {
        throw error;
      }

      throw new NestExceptions.InternalServerErrorException('Error al obtener recomendaciones');
    }
  }

  async CulturalContexto(animeTitle: string, culturalElement: string): Promise<any> {
    try {
       const systemPrompt = this.promptService.loadPrompt('contexto-cultural');

      const userMessage = `En el anime "${animeTitle}", explica el contexto cultural de: "${culturalElement}". Incluye trasfondo histórico, significado cultural, y por qué es relevante en la narrativa.`;

      const aiResponse = await this.chatGemini(userMessage, systemPrompt);

      return {
        explanation: aiResponse.response,
        anime: animeTitle,
        element: culturalElement,
        aiProvider: aiResponse.provider,
        model: aiResponse.model
      };
    } catch (error: any) {
      console.error('Error explaining cultural context:', error);

      if (error instanceof NestExceptions.HttpException) {
        throw error;
      }

      throw new NestExceptions.InternalServerErrorException('Error al explicar el contexto cultural');
    }
  }

async analizarPerso(characterName: string, animeTitle: string, traits?: string[]): Promise<any> {
  try {
   const systemPrompt = this.promptService.loadPrompt('personaje-analisis');

    const message = `Analiza profundamente este personaje de anime:
    PERSONAJE: ${characterName}
    ANIME: ${animeTitle}
    ${traits ? ` RASGOS CONOCIDOS: ${traits.join(', ')}` : ''}

  Proporciona:
  - Perfil psicológico completo
  - Análisis de sus motivaciones
  - Evolución a lo largo de la serie
  - Impacto en la narrativa
  - Comparación con arquetipos clásicos`;

    const response = await this.chatGemini(message, systemPrompt);

    return {
      characterAnalysis: response.response,
      character: characterName,
      anime: animeTitle,
      traits: traits || [],
      aiProvider: response.provider
    };
  } catch (error: any) {
    throw new NestExceptions.InternalServerErrorException('Error analizando personaje');
  }
}

  async generarSinopsisCorta(animeData: any): Promise<any> {
    try {
      const systemPrompt = this.promptService.loadPrompt('sinopsis-corta');

      const userMessage = `Crea una sinopsis corta para este anime:

      TÍTULO: ${animeData.title?.romaji || animeData.title?.english}
      GÉNEROS: ${animeData.genres?.join(', ') || 'No especificados'}
      DESCRIPCIÓN ORIGINAL: ${animeData.description?.substring(0, 500)}...`;

      const response = await this.chatGemini(userMessage, systemPrompt);

      return {
        shortSynopsis: response.response,
        characterCount: response.response.length,
        aiProvider: response.provider
      };
    } catch (error) {
      throw new Error('Error generando sinopsis corta');
    }
  }

   async compararAnimes(animeList: any[], criterios?: string[]): Promise<any> {
    try {
      const systemPrompt = this.promptService.loadPrompt('comparador-anime');

      let userMessage = `Compara estos animes de manera detallada:\n\n`;
      
      animeList.forEach((anime, index) => {
        userMessage += `ANIME ${index + 1}: ${anime.title?.romaji || anime.title?.english || 'Sin título'}\n`;
        userMessage += `- Géneros: ${anime.genres?.join(', ') || 'No especificados'}\n`;
        userMessage += `- Año: ${anime.seasonYear || 'No especificado'}\n`;
        userMessage += `- Episodios: ${anime.episodes || 'No especificado'}\n`;
        userMessage += `- Estudio: ${anime.studios?.nodes?.[0]?.name || 'No especificado'}\n`;
        if (anime.description) {
          userMessage += `- Descripción: ${anime.description.substring(0, 200)}...\n`;
        }
        userMessage += `\n`;
      });

      if (criterios && criterios.length > 0) {
        userMessage += `\nCriterios específicos a enfatizar en la comparación: ${criterios.join(', ')}`;
      }

      const response = await this.chatGemini(userMessage, systemPrompt);

      return {
        comparar: response.response,
        animeCompared: animeList,
        criteria: criterios || [],
        aiProvider: response.provider,
        model: response.model
      };
    } catch (error: any) {
      console.error('Error comparing animes:', error);

      if (error instanceof NestExceptions.HttpException) {
        throw error;
      }

      throw new NestExceptions.InternalServerErrorException('Error al comparar animes');
    }
  }
}