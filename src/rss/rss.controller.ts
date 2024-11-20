import { Controller, Get } from '@nestjs/common';
import { RssService } from './rss.service';

@Controller('rss')
export class RssController {
  constructor(private readonly rssService: RssService) {}

  @Get('latest')
  getLastEpisodes() {
    return this.rssService.getLastEpisodes();
  }
}