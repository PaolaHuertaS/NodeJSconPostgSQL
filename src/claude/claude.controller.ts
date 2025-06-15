import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { GeminiS } from './claude.service';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly GeminiS: GeminiS) {}

  @Post('chat')
  async chat(@Body() body: { message: string; systemPrompt?: string }) {
    return await this.GeminiS.chatGemini(body.message, body.systemPrompt);
  }

  // Endpoint para analizar un anime específico
  @Post('analiza-anime')
  async analyzeAnime(@Body() body: { animeData: any }) {
    if (!body.animeData) {
      throw new Error('Se requiere información del anime en el campo animeData');
    }
    return await this.GeminiS.analizaAnime(body.animeData);
  }

  @Post('recommendacion')
  async getRecommendations(@Body() body: { preferences: string; history?: string[] }) {
    return await this.GeminiS.getPersonalizadadRecommendation(body.preferences, body.history);
  }

  @Post('cultural')
  async explainCulturalContext(@Body() body: { animeTitle: string; culturalElement: string }) {
    return await this.GeminiS.CulturalContexto(body.animeTitle, body.culturalElement);
  }

  @Post('analizarperso')
  async analyzeCharacter(@Body() body: {
  characterName: string;
  animeTitle: string;
  traits?: string[];
  }) {
  return this.GeminiS.analizarPerso(body.characterName, body.animeTitle, body.traits);
}
}
