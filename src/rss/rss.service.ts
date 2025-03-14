import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Anime } from '../book/entities/rss.entity';
import { query_anime } from './query';
import { si } from 'nyaapi';
const anitomyscript = require('anitomyscript');

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });

  constructor(
    @InjectRepository(Anime)
    private animeRepository: Repository<Anime>
  ) { }

  private readonly RSS_URL = 'https://www.erai-raws.info/episodes/feed/?res=1080p&type=torrent&subs%5B0%5D=mx&token=eb4108a77108d2c5c14db7202458aacb';
  private readonly api_url = 'https://graphql.anilist.co';
  private readonly any_url = 'https://api.ani.zip/mappings?anilist_id=${idAnilist}';

  async fetchAnimeInfo(idAnilist: number): Promise<any> {
    try {
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query_anime.anime_episodio,
          variables: { id: idAnilist }
        }),
      });
      const data = await response.json();
      return data.data.Media;
    } catch (error) {
      console.error("Error obteniendo información del anime:", error);
      return null;
    }
  }

  async fetchAnizipData(idAnilist: number, episode: string): Promise<any> {
    try {
      const response = await fetch(`https://api.ani.zip/mappings?anilist_id=${idAnilist}`);
      const data = await response.json();
      return data.episodes?.[episode] || null;
    } catch (error) {
      console.error("Error obteniendo datos de Anizip:", error);
      return null;
    }
  }

  async fetchRssData(RSS_URL: string, animeTitle: string, episodeNumber: number): Promise<any> {
    try {
      const response = await fetch(RSS_URL);
      const xmlData = await response.text();
      const rssData = this.parser.parse(xmlData);
      const rssItems = Array.isArray(rssData.rss?.channel?.item)
        ? rssData.rss.channel.item
        : [rssData.rss?.channel?.item || []];
      const episodeInfo = rssItems.find(item => {
        try {
          const parsedTitle = anitomyscript.sync(item.title);

          return (
            item.title.toLowerCase().includes(animeTitle.toLowerCase()) &&
            parseInt(parsedTitle.episode_number) === episodeNumber
          );
        } catch (e) {
          return false;
        }
      });
      return episodeInfo || null;
    } catch (error) {
      return null;
    }
  }

  async fetchNyaaTorrents(animeTitle: string, episodeNumber: number): Promise<any[]> {
    try {
      const searchTerm = `${animeTitle} ${episodeNumber}`;
      const results = await si.search(searchTerm, {
        category: '1_2',
        sort: 'seeders'
      }, 5);

      return results.filter(torrent => {
        try {
          const parsedTitle = anitomyscript.sync(torrent.name);
          return parseInt(parsedTitle.episode_number) === episodeNumber;
        } catch (e) {
          return false;
        }
      }).map(result => ({
        title: result.name,
        link: result.links?.magnet || null,
        pubDate: result.date,
        size: result.filesize,
        seeders: result.seeders,
        leechers: result.leechers,
        completed: result.completed,
        source: 'nyaa.si'
      }));
    } catch (error) {
      return;
    }
  }

  buildTorrentInfo(episodeInfo: any, episodeNumber: number) {
    if (!episodeInfo) return null;
    return {
      title: episodeInfo.title || null,
      link: episodeInfo.link || null,
      pubDate: episodeInfo.pubDate || null,
      resolution: episodeInfo["erai:resolution"] || "1080p",
      linkType: "Torrent",
      size: episodeInfo["erai:size"] || null,
      infoHash: episodeInfo.infoHash || null,
      subtitles: episodeInfo["erai:subtitles"] || null,
      category: "[Airing]",
      episode: episodeNumber,
      isHevc: (episodeInfo.title || "").toLowerCase().includes("hevc"),
      hasNetflixSubs: (episodeInfo.title || "").toLowerCase().includes("netflix")
    };
  }

  async getAnimeRecommendations(idAnilist: number): Promise<any> {
    try {
      const animeInfo = await this.fetchAnimeInfo(idAnilist);
      const genres = animeInfo.genres.map(genre => genre.toLowerCase());
      const variables = {
        genres: genres,
        idAnilist: idAnilist,
        page: 1,        
        perPage: 5      
      };

      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: query_anime.anime_recomendaciones ,variables})
      });

      const data = await response.json();
      return data.data.Page.media.map(anime => ({
        id: anime.id || null,
        idAnilist: anime.id || null,
        idMal: anime.idMal || null,
        title: {
          romaji: anime.title?.romaji || null,
          english: anime.title?.english || null,
          native: anime.title?.native || null
        },
        description: anime.description || null,
        descriptionTranslated: anime.descriptionTranslated || false,
        season: anime.season || null,
        seasonYear: anime.seasonYear || null,
        format: anime.format || null,
        status: anime.status || null,
        episodes: anime.episodes || null,
        duration: anime.duration || null,
        genres: anime.genres || [],
        coverImage: {
          extraLarge: anime.coverImage?.extraLarge || null,
          medium: anime.coverImage?.medium || null,
          color: anime.coverImage?.color || null
        },
        bannerImage: anime.bannerImage || null,
        synonyms: anime.synonyms || [],
        nextAiringEpisode: anime.nextAiringEpisode || null,
        startDate: {
          year: anime.startDate?.year || null,
          month: anime.startDate?.month || null,
          day: anime.startDate?.day || null
        },
        trailer: {
          id: anime.trailer?.id || null,
          site: anime.trailer?.site || null
        }
      }));
    } catch (error) {
      console.error("Error obteniendo recomendaciones:", error);
      return [];
    }
  }
  
  async getAllAnimeEpisodes(
    idAnilist: number,
    includeTorrents: boolean = false,
    includeHevc: boolean = false
  ): Promise<any> {
    try {
      const animeInfo = await this.fetchAnimeInfo(idAnilist);
  
      const anizipData = await this.fetchAnizipData(idAnilist, "all").catch(() => null);
      const episodes = Object.keys(anizipData.episodes).map(episode => {
        const episodeData = anizipData.episodes[episode];
 
        let torrents = null;
        if (includeTorrents) {
          torrents = this.fetchNyaaTorrents(animeInfo.title.romaji, parseInt(episode))
            .then(torrents => torrents.filter(torrent => {
              if (includeHevc) {
                return torrent.title.toLowerCase().includes("hevc");
              }
              return true;
            }))
            .catch(() => []);
        }
  
        return {
          tvdbShowId: episodeData.tvdbShowId || null,
          tvdbId: episodeData.tvdbId || null,
          seasonNumber: episodeData.seasonNumber || 1,
          episodeNumber: episodeData.episodeNumber || null,
          absoluteEpisodeNumber: episodeData.absoluteEpisodeNumber || null,
          episode: episode,
          anidbEid: episodeData.anidbEid || null,
          airDate: episodeData.airDate || null,
          airDateUtc: episodeData.airDateUtc || null,
          runtime: episodeData.runtime || null,
          length: episodeData.length || null,
          airdate: episodeData.airdate || null,
          title: {
            ja: episodeData.title?.ja || null,
            en: episodeData.title?.en || null,
            "x-jat": episodeData.title?.["x-jat"] || null
          },
          image: episodeData.image || null,
          rating: episodeData.rating || null,
          finaleType: episode === Object.keys(anizipData.episodes).length.toString() ? "final" : null,
          torrents: includeTorrents ? torrents : null
        };
      });
  
      return { episodes };
    } catch (error) {
      return { 
        error: "Error obteniendo todos los episodios.",
        message: error.message
      };
    }
  }

  async getEpisodeData(idAnilist: number, episode: string): Promise<any> {
    try {
      const episodeNumber = parseInt(episode);
      const animeInfo = await this.fetchAnimeInfo(idAnilist);
      if (!animeInfo) {
        throw new Error(`No se encontró información del anime para ID: ${idAnilist}`);
      }

      const [anizipData, rssData, nyaaTorrents] = await Promise.all([
        this.fetchAnizipData(idAnilist, episode).catch(() => null),
        this.fetchRssData(this.RSS_URL, animeInfo.title.romaji, episodeNumber).catch(() => null),
        this.fetchNyaaTorrents(animeInfo.title.romaji, episodeNumber).catch(() => [])
      ]);

      return {
        tvdbShowId: anizipData?.tvdbShowId || null,
        tvdbId: anizipData?.tvdbId || null,
        seasonNumber: anizipData?.seasonNumber || 1,
        episodeNumber,
        absoluteEpisodeNumber: anizipData?.absoluteEpisodeNumber || episodeNumber,
        episode: episode,
        anidbEid: anizipData?.anidbEid || (rssData ? parseInt(rssData["erai:anidbEid"]) : null) || null,
        length: anizipData?.length || (rssData ? parseInt(rssData["erai:length"]) : null) || animeInfo.duration || null,
        runtime: anizipData?.runtime || animeInfo.duration || null,
        airDate: anizipData?.airDate || (rssData ? rssData.pubDate : null) || null,
        airDateUtc: anizipData?.airDateUtc || (rssData ? rssData.pubDate : null) || null,
        airdate: anizipData?.airdate || (rssData ? rssData.pubDate : null) || null,
        title: {
          ja: anizipData?.title?.ja || (rssData ? rssData["erai:title-ja"] : null) || null,
          en: anizipData?.title?.en || (rssData ? rssData["erai:title-en"] : null) || (rssData ? rssData.title : null) || null,
          de: anizipData?.title?.de || null,
          fr: anizipData?.title?.fr || null,
          ar: anizipData?.title?.ar || null,
          "x-jat": anizipData?.title?.["x-jat"] || (rssData ? rssData["erai:title-x-jat"] : null) || null
        },
        overview: anizipData?.overview || (rssData && rssData.description ? rssData.description.replace(/<[^>]+>/g, '') : null) || null,
        summary: anizipData?.summary || (rssData && rssData.description ? rssData.description.replace(/<[^>]+>/g, '') : null) || null,
        image: anizipData?.image || (rssData ? rssData.image : null) || null,
        rating: anizipData?.rating || (rssData ? rssData["erai:rating"] : null) || null
      };
    } catch (error) {
      return {
        error: "Error obteniendo datos del episodio.",
        message: error.message
      };
    }
  }
}