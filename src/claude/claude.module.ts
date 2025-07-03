import { Module } from '@nestjs/common';
import { GeminiS } from './claude.service';
import { GeminiController } from './claude.controller';
import { PromptService } from '../prompts/prompt.service';

@Module({
  controllers: [GeminiController],
  providers: [GeminiS,PromptService],
  exports: [GeminiS], 
})
export class GeminiModule {}

