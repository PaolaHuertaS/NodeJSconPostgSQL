import { Controller, Get, Param, Query, Post, Body, Put } from '@nestjs/common';
import { RssService } from './rss.service';
import { Anime } from 'src/book/entities/rss.entity';

@Controller('anime')
export class RssController {
  constructor(private readonly rssService: RssService) { }

  @Get('details/:title')
  async getAnimeDetails(@Param('title') title: string) {
    const decodedTitle = decodeURIComponent(title);
    return this.rssService.getAnimeDetailsFromAnilist(title);
  }

  @Get('similar/:id')
  async getSimilarAnimes(@Param('id') id: number) {
  return this.rssService.getSimilarAnimes(id);
  }

  @Get('top/:genre')
  async getTopAnimesByGenre(@Param('genre') genre: string, @Query('limit') limit: number = 10) {
  return this.rssService.getTopAnimesByGenre(genre, limit);
}

  @Get('list')
  getAnimes(@Query('quantity') quantity: number) {
    return this.rssService.findTrending(quantity);
  }

  @Get('list/:idAnilist')
  getAnime(@Param('idAnilist') idAnilist: number) {
    return this.rssService.findByAnilistId(idAnilist);
  }

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

  @Get('recommendations/:idAnilist')
  getAnimeRecommendations(@Param('idAnilist') idAnilist: number) {
  return this.rssService.getAnimeRecommendations(idAnilist);
  }

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

  @Get('episodes/:idAnilist/:episode')
  getEpisodeData(
    @Param('idAnilist') idAnilist: number,
    @Param('episode') episode: string
  ) {
    return this.rssService.getEpisodeData(idAnilist, episode);
  }

  @Get('rss')
  getRssFeed(
  @Query('page') page: number = 1,
  @Query('perPage') perPage: number = 10,
  @Query('withHevc') withHevc: string
  ) {
    const includeHevc = withHevc === 'true';
    return this.rssService.getRssFeed(page, perPage, includeHevc);
  }

  @Put(':idAnilist')
  async updateAnime(
  @Param('idAnilist') idAnilist: number,
  @Body() updateAnimeDto: Partial<Anime>
   ) {
  return this.rssService.updateAnime(idAnilist, updateAnimeDto);
   }
}
