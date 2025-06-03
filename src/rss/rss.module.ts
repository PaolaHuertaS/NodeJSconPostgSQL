import { Logger, Module } from '@nestjs/common';
import { RssService } from './rss.service';
import { RssController } from './rss.controller';
import { Anime } from '../book/entities/rss.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ClaudeModule } from '../claude/claude.module';

@Module({
  imports: [TypeOrmModule.forFeature([Anime]), CacheModule.register(),ClaudeModule],
  controllers: [RssController],
  providers: [RssService, Logger]
})
export class RssModule {}
