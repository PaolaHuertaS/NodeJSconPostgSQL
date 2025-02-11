import { Logger, Module } from '@nestjs/common';
import { RssService } from './rss.service';
import { RssController } from './rss.controller';
import { Anime } from '../book/entities/rss.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [TypeOrmModule.forFeature([Anime]), CacheModule.register(),],
  controllers: [RssController],
  providers: [RssService, Logger]
})
export class RssModule {}
