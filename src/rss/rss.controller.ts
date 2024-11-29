import { Controller, Get, Query } from '@nestjs/common';
import { RssService } from './rss.service';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo, RssAnimeInfo } from './rss.type';

@Controller('rss')
export class RssController {
  constructor(private readonly rssService: RssService) { }

  @Get()
  async getLastEpisodes(): Promise<Episode[]> {
    return this.rssService.getLastEpisodes();
  }

  @Get('info')
  async getLastEpisodesInfo(): Promise<ParsedAnimeInfo[]> {
    const episodes = await this.rssService.getLastEpisodes();
    return episodes.map(episode => episode.info);
  }

  @Get('enhanced')
  async getEnhancedEpisodes(): Promise<EnhancedAnimeInfo[]> {
    return this.rssService.getEnhancedEpisodes();
  }

  @Get('anime')
  getRssAnimeInfo() {
    return this.rssService.getRssAnimeInfo();
  }
}
