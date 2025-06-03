import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ClaudeService } from './claude.service';

@Controller('claude')
export class ClaudeController {
  constructor(private readonly claudeService: ClaudeService) {}

  @Post('chat')
  async chat(@Body() body: { message: string; systemPrompt?: string }) {
    return await this.claudeService.chatGemini(body.message, body.systemPrompt);
  }

  // Endpoint para analizar un anime específico
  @Post('analiza-anime')
  async analyzeAnime(@Body() body: { animeData: any }) {
    if (!body.animeData) {
      throw new Error('Se requiere información del anime en el campo animeData');
    }
    return await this.claudeService.analizaAnime(body.animeData);
  }

  @Post('recommendacion')
  async getRecommendations(@Body() body: { preferences: string; history?: string[] }) {
    return await this.claudeService.getPersonalizadadRecommendation(body.preferences, body.history);
  }

  @Post('cultural')
  async explainCulturalContext(@Body() body: { animeTitle: string; culturalElement: string }) {
    return await this.claudeService.CulturalContexto(body.animeTitle, body.culturalElement);
  }
}
