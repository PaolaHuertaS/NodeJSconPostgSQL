import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { RssService } from './rss.service';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo,  AnimeEpisodeDetails } from './rss.type';

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

  @Get('top/:genre')
  async getTopAnimesByGenre(@Param('genre') genre: string, @Query('limit') limit: number = 10) {
  return this.rssService.getTopAnimesByGenre(genre, limit);
}

  @Get('all')
  async getAllAnimeInformation(): Promise<AnimeEpisodeDetails[]> {
  return this.rssService.getAllAnimeInformation();
}

  // ejemplo: http://localhost:3001/rss/top/Drama?limit=5

  // endpoinst dados enero

  @Get('list')
  getAnimes(@Query('quantity') quantity: number) {
    return this.rssService.findTrending(quantity);
  }

  @Get('list/:idAnilist')
  getAnime(@Param('idAnilist') idAnilist: number) {
    return this.rssService.findByAnilistId(idAnilist);
  }

  //poder ver BD
  @Get('stored')
  async getStoredAnimes() {
    return this.rssService.findAllStored();
  }
  
  @Post('search/batch')
  searchAnimes(@Body() animes) {
    return this.rssService.searchArray(animes);
  }
  
  @Post('search')
  searchAnime(
  @Body() searchParams: {
    animeName: string;
    limit: number;
    status?: string;
    page?: number; 
    genre?: string;
  }
  ) {
  if (!searchParams.animeName) {
    return [];  // o retornar un error
  }
  return this.rssService.search({ 
    animeName: searchParams.animeName,
    limitResult: searchParams.limit,
    status: searchParams.status,
    page: searchParams.page || 1 ,
    genre: searchParams.genre
  });
  }
}
