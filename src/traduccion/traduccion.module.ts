import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationService } from './traduccion.service';
import { TranslationController } from './traduccion.controller';
import { Anime } from '../book/entities/rss.entity';
import { GeminiModule } from '../claude/claude.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Anime]),
    GeminiModule
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
  exports: [TranslationService]
})
export class TranslationModule {}