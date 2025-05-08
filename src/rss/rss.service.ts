import { Injectable, HttpStatus } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Anime } from '../book/entities/rss.entity';
import { query_anime } from './query';
import { si } from 'nyaapi';
import  anitomyscript = require('anitomyscript');

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

      if (!data || !data.episodes) {
        console.error("No se encontraron datos de episodios en la respuesta de AniZip para el ID:", idAnilist);
        return null;
      }

      const episodeData = data.episodes[episode];
      if (!episodeData) {
        console.error("No se encontró información para el episodio:", episode);
        return null;
      }

      return episodeData;
    } catch (error) {
      console.error("Error obteniendo datos de AniZip:", error);
      return null;
    }
  }

  async fetchRssData(RSS_URL: string, animeTitle: string, episodeNumber: number): Promise<any> {
    try {
      const response = await fetch(this.RSS_URL);
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
      // Quitar caracteres especiales y palabras comunes para mejorar búsqueda
      const cleanTitle = animeTitle
        .replace(/season \d+/i, '')
        .replace(/\(.*?\)/g, '')
        .replace(/[^\w\s]/gi, ' ')
        .trim();

      console.log(`Búsqueda en Nyaa con título limpio: "${cleanTitle}"`);

      // Buscar sólo con el nombre del anime para obtener más resultados
      const results = await si.search(cleanTitle, {
        category: '1_2',
        sort: 'seeders'
      }, 15);

      console.log(`Resultados totales de Nyaa: ${results.length}`);

      // Filtrado más flexible
      return results.filter(torrent => {
        const torrentTitle = torrent.name.toLowerCase();
        const searchTerms = cleanTitle.toLowerCase().split(' ');

        // Verificar si contiene palabras clave del título
        const titleMatch = searchTerms.some(term =>
          term.length > 3 && torrentTitle.includes(term)
        );

        // Verificar número de episodio de manera flexible
        const episodeMatch =
          torrentTitle.includes(`e${episodeNumber}`) ||
          torrentTitle.includes(`ep${episodeNumber}`) ||
          torrentTitle.includes(`episode ${episodeNumber}`) ||
          torrentTitle.includes(` ${episodeNumber} `) ||
          torrentTitle.match(new RegExp(`\\b${episodeNumber}\\b`));

        return titleMatch && episodeMatch;
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
      console.error(`Error en fetchNyaaTorrents: ${error.message}`);
      return [];
    }
  }

  async findTrending(quantity?: number): Promise<any> {
    try {
      if (quantity !== undefined && (isNaN(quantity) || quantity < 1)) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Error obteniendo animes populares.",
          message: "El parámetro quantity debe ser un número positivo"
        };
      }
      const animeInfo = await this.fetchAnimeInfo(0);

      if (!animeInfo) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Error obteniendo animes populares.",
          message: "No se encontraron animes populares"
        };
      }

      const allAnimes = Array.isArray(animeInfo) ? animeInfo : [animeInfo];
      const trendingAnimes = quantity ? allAnimes.slice(0, quantity) : allAnimes;

      if (trendingAnimes.length === 0) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Error obteniendo animes populares.",
          message: "No se encontraron animes populares que cumplan con los criterios"
        };
      }

      const formattedAnimes = trendingAnimes.map(anime => ({
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

      return formattedAnimes;
    } catch (error) {
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR; // 500 
      
      if (error.message) {
        if (error.message.includes('timeout')) {
          statusCode = HttpStatus.GATEWAY_TIMEOUT; // 504
        } else if (error.message.includes('no autorizado')) {
          statusCode = HttpStatus.UNAUTHORIZED; // 401
        } else if (error.message.includes('API')) {
          statusCode = HttpStatus.BAD_GATEWAY; // 502
        } else if (error.message.includes('no disponible')) {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503
        }
      }
      
      return {
        statusCode,
        error: "Error obteniendo animes populares.",
        message: error.message
      };
    }
  }

  async findByAnilistId(idAnilist: number): Promise<any> {
    try {
      if (!idAnilist || isNaN(idAnilist)) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Error obteniendo información del anime.",
          message: "ID de Anilist inválido"
        };
      }
      const animeInfo = await this.fetchAnimeInfo(idAnilist);
      if (!animeInfo) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Error obteniendo información del anime.",
          message: `No se encontró el anime con ID: ${idAnilist}`
        };
      }

      return {
        id: animeInfo.id || null,
        idAnilist: animeInfo.idAnilist || null,
        idMal: animeInfo.idMal || null,
        title: {
          romaji: animeInfo.title?.romaji || null,
          english: animeInfo.title?.english || null,
          native: animeInfo.title?.native || null
        },
        description: animeInfo.description || null,
        descriptionTranslated: animeInfo.descriptionTranslated || false,
        season: animeInfo.season || null,
        seasonYear: animeInfo.seasonYear || null,
        format: animeInfo.format || null,
        status: animeInfo.status || null,
        episodes: animeInfo.episodes || null,
        duration: animeInfo.duration || null,
        genres: animeInfo.genres || [],
        coverImage: {
          extraLarge: animeInfo.coverImage?.extraLarge || null,
          medium: animeInfo.coverImage?.medium || null,
          color: animeInfo.coverImage?.color || null
        },
        bannerImage: animeInfo.bannerImage || null,
        synonyms: animeInfo.synonyms || [],
        nextAiringEpisode: animeInfo.nextAiringEpisode || null,
        startDate: {
          year: animeInfo.startDate?.year || null,
          month: animeInfo.startDate?.month || null,
          day: animeInfo.startDate?.day || null
        },
        trailer: {
          id: animeInfo.trailer?.id || null,
          site: animeInfo.trailer?.site || null
        }
      };
    } catch (error) {
     let statusCode = HttpStatus.INTERNAL_SERVER_ERROR; // 500 
      
      if (error.message) {
        if (error.message.includes('no encontr')) {
          statusCode = HttpStatus.NOT_FOUND; // 404
        } else if (error.message.includes('timeout')) {
          statusCode = HttpStatus.GATEWAY_TIMEOUT; // 504
        } else if (error.message.includes('no autorizado')) {
          statusCode = HttpStatus.UNAUTHORIZED; // 401
        } else if (error.message.includes('permiso')) {
          statusCode = HttpStatus.FORBIDDEN; // 403
        } else if (error.message.includes('API')) {
          statusCode = HttpStatus.BAD_GATEWAY; // 502
        } else if (error.message.includes('servicio no disponible')) {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503
        }
      }
      
      return {
        statusCode,
        error: "Error obteniendo información del anime.",
        message: error.message
      };
    }
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
        body: JSON.stringify({ query: query_anime.anime_recomendaciones, variables })
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
      if (!idAnilist || isNaN(idAnilist)) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Error obteniendo datos del episodio.",
          message: "ID de Anilist inválido"
        };
      }

      const episodeNumber = parseInt(episode);
      if (isNaN(episodeNumber)) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: "Error obteniendo datos del episodio.",
          message: "El número de episodio debe ser un valor numérico"
        };
      }

      const animeInfo = await this.fetchAnimeInfo(idAnilist);
      if (!animeInfo) {
         return { 
          statusCode: HttpStatus.NOT_FOUND,
          error: "Error obteniendo datos del episodio.",
          message: `No se encontró información del anime para ID: ${idAnilist}`
        };
      }

      const [anizipData, rssData, nyaaTorrents] = await Promise.all([
        this.fetchAnizipData(idAnilist, episode).catch(() => null),
        this.fetchRssData(this.RSS_URL, animeInfo.title.romaji, episodeNumber).catch(() => null),
        this.fetchNyaaTorrents(animeInfo.title.romaji, episodeNumber).catch(() => [])
      ]);

      if (!anizipData && !rssData && (!nyaaTorrents || nyaaTorrents.length === 0)) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: "Error obteniendo datos del episodio.",
          message: `No se encontraron datos para el episodio ${episode} del anime ${animeInfo.title.romaji}`
        };
      }

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
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR; //500 
      
      if (error.message) {
        if (error.message.includes('No se encontró información del anime')) {
          statusCode = HttpStatus.NOT_FOUND; //404
        } else if (error.message.includes('timeout')) {
          statusCode = HttpStatus.GATEWAY_TIMEOUT; //504
        } else if (error.message.includes('no autorizado')) {
          statusCode = HttpStatus.UNAUTHORIZED; //401
        } else if (error.message.includes('permiso')) {
          statusCode = HttpStatus.FORBIDDEN; //403
        } else if (error.message.includes('API externa')) {
          statusCode = HttpStatus.BAD_GATEWAY; //502
        } else if (error.message.includes('servicio no disponible')) {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE; //503
        }
    }

    return {
      statusCode,
      error: "Error obteniendo datos del episodio.",
      message: error.message
      };
    }
  }

  async getRssFeed(page: number = 1, perPage: number = 10, withHevc: boolean = false): Promise<any[]> {
    try {
      const rssResponse = await fetch(this.RSS_URL);
      const rssText = await rssResponse.text();
      const rssData = this.parser.parse(rssText);

      const rssItems = Array.isArray(rssData.rss.channel.item)
        ? rssData.rss.channel.item
        : [rssData.rss.channel.item];

      let filteredItems = rssItems.filter(item => {
        const title = item.title.toLowerCase();
        const isHevc =
          title.includes('hevc') ||
          title.includes('h.265') ||
          title.includes('h265') ||
          title.includes('x265');

        return withHevc ? isHevc : !isHevc;
      });

      if (filteredItems.length === 0 && withHevc) {
        filteredItems = rssItems;
      }

      const startIndex = (page - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, filteredItems.length);
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      const results = [];

      for (const item of paginatedItems) {
        try {
          const parsedTitle = await anitomyscript(item.title);
          const animeTitle = parsedTitle.anime_title || "";
          const episodeNumber = parsedTitle.episode_number ? parseInt(parsedTitle.episode_number) : null;

          if (!animeTitle || episodeNumber === null) {
            continue;
          }

          const releaseGroup = parsedTitle.release_group || "Erai-raws";
          const videoResolution = parsedTitle.video_resolution || "1080p";
          const videoTerm = parsedTitle.video_term || "CR WEB-DL AVC AAC";
          const fileName = ` ${animeTitle} - ${episodeNumber} [${videoResolution} ${videoTerm}][MultiSub].mkv`;

          let animeInfo = null;
          let anilistId = null;

          try {
            const anilistQuery = `
            query {
              Media(search: "${animeTitle}", type: ANIME) {
                id
                title {
                  romaji
                  english
                  native
                }
                coverImage {
                  extraLarge
                }
                bannerImage
                duration
              }
            }
          `;

            const anilistResponse = await fetch(this.api_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({ query: anilistQuery }),
            });

            const anilistData = await anilistResponse.json();
            animeInfo = anilistData.data?.Media;

            if (animeInfo) {
              anilistId = animeInfo.id;
            } else {
              continue;
            }
          } catch (anilistError) {
            continue;
          }

          let episodeData = null;

          try {
            const anizipUrl = `https://api.ani.zip/mappings?anilist_id=${anilistId}`;
            const anizipResponse = await fetch(anizipUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            });

            if (!anizipResponse.ok) {
              throw new Error(`Error en respuesta de ani.zip: ${anizipResponse.status}`);
            }

            const mappingData = await anizipResponse.json();

            if (mappingData && mappingData.episodes) {
              if (mappingData.episodes[episodeNumber.toString()]) {
                episodeData = mappingData.episodes[episodeNumber.toString()];
              } else {
                const episodeKeys = Object.keys(mappingData.episodes)
                  .filter(key => !isNaN(parseInt(key)))
                  .map(key => parseInt(key));

                if (episodeKeys.length > 0) {
                  const closestEpisode = episodeKeys.reduce((prev, curr) =>
                    Math.abs(curr - episodeNumber) < Math.abs(prev - episodeNumber) ? curr : prev
                  );

                  episodeData = mappingData.episodes[closestEpisode.toString()];
                }
              }
            }
          } catch (anizipError) {
          }

          const sizeMatch = item.description?.match(/Size: ([0-9.]+[KMGT]B)/i);
          const hashMatch = item.description?.match(/Hash: ([a-f0-9]{40})/i);

          const result = {
            idAnilist: anilistId,
            title: {
              romaji: animeInfo.title?.romaji || null,
              english: animeInfo.title?.english || null,
              native: animeInfo.title?.native || null,
            },
            duration: animeInfo.duration || null,
            coverImage: {
              extraLarge: animeInfo.coverImage?.extraLarge || null,
            },
            bannerImage: animeInfo.bannerImage || null,
            episode: {
              tvdbShowId: episodeData?.tvdbShowId || null,
              tvdbId: episodeData?.tvdbId || null,
              seasonNumber: episodeData?.seasonNumber || null,
              episodeNumber: episodeNumber,
              absoluteEpisodeNumber: episodeNumber,
              title: {
                ja: episodeData?.title?.ja || null,
                en: episodeData?.title?.en || null,
                "x-jat": episodeData?.title?.["x-jat"] || null
              },
              airDate: episodeData?.airdate || (item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null),
              airDateUtc: episodeData?.airDateUtc || item.pubDate,
              runtime: episodeData?.runtime || animeInfo.duration || null,
              image: episodeData?.image || null,
              episode: episodeNumber.toString(),
              anidbEid: episodeData?.anidbEid || null,
              length: episodeData?.length || animeInfo.duration || null,
              airdate: episodeData?.airdate || (item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : null),
              rating: episodeData?.rating || null
            },
            torrent: {
              title: animeTitle,
              link: item.link,
              pubDate: item.pubDate,
              resolution: parsedTitle.video_resolution || "1080p",
              linkType: "Torrent",
              size: sizeMatch ? sizeMatch[1] : parsedTitle.file_size || null,
              infoHash: hashMatch ? hashMatch[1] : null,
              subtitles: this.extractSubtitles(item.title),
              category: "[Airing]",
              fileName: fileName,
              episode: episodeNumber,
              isHevc: parsedTitle.video_term?.toLowerCase().includes("hevc") ||
                parsedTitle.video_term?.toLowerCase().includes("h265") ||
                parsedTitle.video_term?.toLowerCase().includes("x265") || false,
              hasNetflixSubs: item.title.toLowerCase().includes("netflix")
            }
          };

          results.push(result);
        } catch (itemError) {
          continue;
        }
      }

      return results;
    } catch (error) {
      console.error("Error en getRssFeed:", error);
      return [];
    }
  }

  private extractSubtitles(title: string): string {
    const subtitleRegex = /\[([a-z]{2})\]/g;
    const matches = title.match(subtitleRegex);
    if (matches) {
      return matches.join("");
    }
    return "";
  }

  async updateAnime(idAnilist: number, updateAnimeDto: Partial<Anime>): Promise<Anime> {
    const anime = await this.animeRepository.findOne({ where: { idAnilist } });
    
    Object.assign(anime, updateAnimeDto);
    return this.animeRepository.save(anime);
  }

}
