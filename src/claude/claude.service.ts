import { Injectable } from '@nestjs/common';
import * as NestExceptions from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ClaudeService {
  private geminiApiKey: string | null = null;
  private geminiApiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

  constructor() {
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
      const systemPrompt = `Eres un experto en anime que proporciona análisis detallados y recomendaciones. 
      Analiza la información del anime proporcionada y proporciona:
      1. Un resumen conciso
      2. Puntos destacados
      3. Audiencia objetivo
      4. Comparaciones con otros animes similares si es relevante`;

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
      const systemPrompt = `Eres un experto en anime que proporciona recomendaciones personalizadas basadas en las preferencias del usuario.
      Proporciona 5-10 recomendaciones específicas con razones detalladas para cada una.`;

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
      const systemPrompt = `Eres un experto en cultura japonesa y anime. Proporciona explicaciones detalladas sobre elementos culturales, referencias históricas, tradiciones, y contexto social en el anime.`;

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
}