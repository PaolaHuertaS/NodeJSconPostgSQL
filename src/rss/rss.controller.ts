import { Controller, Get, Param, Query, Post, Body, Put } from '@nestjs/common';
import { RssService } from './rss.service';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo,  AnimeEpisodeDetails } from './rss.type';
import { Anime } from 'src/book/entities/rss.entity';

@Controller('anime')
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
  async getEnhancedEpisodes(
  @Query('season') season?: string,
  @Query('status') status?: string,
  @Query('format') format?: string
  ): Promise<EnhancedAnimeInfo[]> {
    return this.rssService.getEnhancedEpisodes(season, status, format);
  }

  @Get('anime')
  getRssAnimeInfo() {
    return this.rssService.getRssAnimeInfo();
  }
 //apartir d aqui es todo lo de animeton 
  @Get('details/:title')
  async getAnimeDetails(@Param('title') title: string) {
    const decodedTitle = decodeURIComponent(title);
    return this.rssService.getAnimeDetailsFromAnilist(title);
  }
//getAnimeDetails actualizada

  @Get('similar/:id')
  async getSimilarAnimes(@Param('id') id: number) {
  return this.rssService.getSimilarAnimes(id);
  }
//getSimilarAnimes actualizado 
 
  @Get('top/:genre')
  async getTopAnimesByGenre(@Param('genre') genre: string, @Query('limit') limit: number = 10) {
  return this.rssService.getTopAnimesByGenre(genre, limit);
}

  @Get('all')
  async getAllAnimeInformation(): Promise<AnimeEpisodeDetails[]> {
  return this.rssService.getAllAnimeInformation();
}
//acutalizado
  // ejemplo: http://localhost:3001/rss/top/Drama?limit=5

  // endpoinst dados enero

  @Get('list')
  getAnimes(@Query('quantity') quantity: number) {
    return this.rssService.findTrending(quantity);
  }
  //actualizado findTrending

  @Get('list/:idAnilist')
  getAnime(@Param('idAnilist') idAnilist: number) {
    return this.rssService.findByAnilistId(idAnilist);
  }
//actualizado findByAnilistId
  //poder ver BD
  @Get('stored')
  async getStoredAnimes() {
    return this.rssService.findAllStored();
  } //este no se actualiza
  
  @Post('search/batch')
  searchAnimes(@Body() animes) {
    return this.rssService.searchArray(animes);
  }
//no se actualiza
  
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
//search actualizado
  @Get('recommendations/:idAnilist')
  getAnimeRecommendations(@Param('idAnilist') idAnilist: number) {
  return this.rssService.getAnimeRecommendations(idAnilist);
  }
//actualizado getAnimeRecommendations

  @Get('episodes/:idAnilist')
  getAllAnimeEpisodes(
    @Param('idAnilist') idAnilist: number,
    @Query('torrents') torrents?: string,
    @Query('withHevc') withHevc?: string
  ) {
    const includeTorrents = torrents === 'true';
    const includeHevc = withHevc === 'true';
    return this.rssService.getAllAnimeEpisodes(idAnilist, includeTorrents, includeHevc);
  }
//actualizado getAllAnimeEpisodes -> otra  query, me equivoqu

  @Get('episodes/:idAnilist/:episode')
  getEpisodeData(
    @Param('idAnilist') idAnilist: number,
    @Param('episode') episode: string
  ) {
    return this.rssService.getEpisodeData(idAnilist, episode);
  }
  //getEpisode data esta actualizado y con su query
/*
  @Get('rss')
  getRssFeed(
  @Query('page') page: number = 1,
  @Query('perPage') perPage: number = 10,
  @Query('withHevc') withHevc: string
  ) {
    const includeHevc = withHevc === 'true';
    return this.rssService.getRssFeed(page, perPage, includeHevc);
  }
*/
  //actualizado el put
  @Put(':idAnilist')
  async updateAnime(
  @Param('idAnilist') idAnilist: number,
  @Body() updateAnimeDto: Partial<Anime>
   ) {
  return this.rssService.updateAnime(idAnilist, updateAnimeDto);
   }
}
