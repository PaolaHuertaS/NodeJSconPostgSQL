import { Module } from '@nestjs/common';
import { RssService } from './rss.service';
import { RssController } from './rss.controller';
import { Anime } from '../book/entities/rss.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Anime])],
  controllers: [RssController],
  providers: [RssService]
})
export class RssModule {}
