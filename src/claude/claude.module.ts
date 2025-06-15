import { Module } from '@nestjs/common';
import { GeminiS } from './claude.service';
import { GeminiController } from './claude.controller';

@Module({
  controllers: [GeminiController],
  providers: [GeminiS],
  exports: [GeminiS], 
})
export class GeminiModule {}

