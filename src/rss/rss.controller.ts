import { Controller, Get, Param, Query } from '@nestjs/common';
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

  @Get('details/:title')
  async getAnimeDetails(@Param('title') title: string) {
    return this.rssService.getAnimeDetailsFromAnilist(title);
  }

    //nuevo 

  @Get('similar/:id')
  async getSimilarAnimes(@Param('id') id: number) {
  return this.rssService.getSimilarAnimes(id);
  }

  @Get('anime/:id/stats')
  async getAnimeStats(@Param('id') id: number) {
  return this.rssService.getAnimeStats(id);
  }

  @Get('season/:season/:year') 
  async getSeasonAnimes(@Param('season') season: string, @Param('year') year: number) {
  return this.rssService.getSeasonAnimes(season, year);
  }

  @Get('calendar/upcoming')
  async getUpcomingPremieres() {
  return this.rssService.getUpcomingPremieres();
  }
}
