import { Logger, Module } from '@nestjs/common';
import { RssService } from './rss.service';
import { RssController } from './rss.controller';
import { Anime } from '../book/entities/rss.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { GeminiModule } from '../claude/claude.module';
import { TranslationModule } from '../traduccion/traduccion.module';
import { PromptService } from 'src/prompts/prompt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Anime]), CacheModule.register(),GeminiModule, TranslationModule],
  controllers: [RssController],
  providers: [RssService, Logger, PromptService]
})
export class RssModule {}
