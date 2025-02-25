import { Injectable, Param, Query, Logger, Inject} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { XMLParser } from 'fast-xml-parser';
import { Repository, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Anime } from '../book/entities/rss.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo, AnilistAnime, RssAnimeInfo, AnimeEpisodeDetails } from './rss.type';
import { skip } from 'rxjs';
import { query_anime } from './query';
import { GraphQLAnime } from './graphsql.service';
const anitomyscript = require('anitomyscript');

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });

  constructor(
    @InjectRepository(Anime)
    private animeRepository: Repository<Anime>, 
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly logger: Logger = new Logger(RssService.name)
  ) {}

  private readonly RSS_URL = 'https://www.erai-raws.info/episodes/feed/?res=1080p&type=torrent&subs%5B0%5D=mx&token=c7aa3ae68b4ef37a904773bb46371e42';
  private readonly api_url = 'https://graphql.anilist.co';

  private mapeoAtypeorm(mediaData: any): Partial<Anime> {
    return {
      idAnilist: mediaData.id,
      idMal: mediaData.idMal ? Number(mediaData.idMal): null,
      title: {
        romaji: mediaData.title?.romaji || '',
        english: mediaData.title?.english || '',
        native: mediaData.title?.native || ''
      },
      description: mediaData.description,
      descriptionTranslated: mediaData.descriptionTranslated,
      season: mediaData.season ? String(mediaData.season) : null,
      seasonYear: mediaData.seasonYear !== null ? Number(mediaData.seasonYear) : null,
      format: mediaData.format !== null ? String(mediaData.format) : null,
      status: mediaData.status,
      episodes: mediaData.episodes ? Number(mediaData.episodes) : null,
      duration: mediaData.duration ? Number(mediaData.duration) : null,
      genres: mediaData.genres || [],
      coverImage: {
        extraLarge: mediaData.coverImage?.extraLarge || '',
        medium: mediaData.coverImage?.medium || '',
        color: mediaData.coverImage?.color || ''
      },
      bannerImage: mediaData.bannerImage ? String(mediaData.bannerImage) : null,
      synonyms: mediaData.synonyms || [],
      startDate: mediaData.startDate 
        ? {
            year: mediaData.startDate.year,
            month: mediaData.startDate.month,
            day: mediaData.startDate.day
          } 
        : null,
      nextAiringEpisode: mediaData.nextAiringEpisode || "Sin conocimiento"
        ? {
            airingAt: mediaData.nextAiringEpisode?.airingAt || null,
            episode: mediaData.nextAiringEpisode?.episode || null
          } 
          :null,
          trailer: mediaData.trailer || null,
    };
  }
//se pone promise seguido de partial y el nombre anime pq es asi como tenemos declarado el mapeoATypeorm, la funcion, y promise y partial son conceptos diferentes asi q deben enlazarse para q funcionen
  public async getAnimeDetailsFromAnilist(title: string): Promise<Partial<Anime> | null> {
    try {
        const response = await fetch(this.api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query_anime.anime_detalles,
                variables: { search: title.trim() } // trim ayuda a eliminar espacios extra
            })
        });

        const data = await response.json();

        if (!data.data || !data.data.Media) {
            throw new Error(`No se encontraron detalles para el anime: ${title}`);
        }

        //aplico mapeo
        return this.mapeoAtypeorm(data.data.Media);
    } catch (error) {
        this.logger.error(`Error al obtener detalles de ${title}:`, error);
        return null;
    }
}

  public async getSimilarAnimes(animeId: number): Promise<AnilistAnime[]> {
    try {
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // El body incluye la query y las variables necesarias
        body: JSON.stringify({
          query: query_anime.anime_recomendaciones, 
          variables: { id: animeId }  // Pasamos el ID como variable
        })
      });

      // Convertir la respuesta a JSON
      const data = await response.json();

      // Verificar que existan recomendaciones
      // Si no hay datos o no hay recomendaciones, devolver array vacío
      if (!data?.data?.Media?.recommendations?.nodes) {
        return [];
      }

      // Extraer las recomendaciones
      const recommendations = data.data.Media.recommendations.nodes;

      // Esto elimina la estructura anidada y devuelve un array simple
      return recommendations.map(node => node.mediaRecommendation);
    } catch (error) {
      // Si ocurre cualquier error, lo registramos y devolvemos array vacío
      console.error('Error obteniendo recomendaciones:', error);
      return [];
    }
  }

  private async parseAnimeTitle(title: string, item: any): Promise<ParsedAnimeInfo> {
    try {
      if (!title) {
        throw new Error('Title is required');
      }

      const {
        anime_title,
        episode_number,
        video_resolution,
        subtitles
      } = await anitomyscript(title);

      return {
        title: anime_title,
        link: item.link,
        pubDate: item.pubDate,
        resolution: video_resolution || '1080p',
        linkType: 'Torrent',
        size: item['erai:size'] || 'Unknown',
        infoHash: item.infoHash || '',
        subtitles: subtitles ? `[${subtitles.join('][')}]` : '',
        category: '[Airing]',
        episode: parseInt(episode_number) || 0,
        isHevc: false,
        hasNetflixSubs: false
      };
    } catch (error) {
      console.error('Error anime title:', title, error);
      return {
        title: '',
        link: '',
        pubDate: '',
        resolution: '',
        linkType: '',
        size: '',
        infoHash: '',
        subtitles: '',
        category: '',
        episode: 0,
        isHevc: false,
        hasNetflixSubs: false
      };
    }
  }

  public async getTopAnimesByGenre(genre: string, limit: number = 10): Promise<AnilistAnime[]> {
    // Query GraphQL para obtener animes por género
    const query = `
    query ($genre: String, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(
          genre: $genre,
          type: ANIME,
          sort: POPULARITY_DESC
        ) {
          id
          title {
            romaji
            english
            native
          }
          genres
          description
          averageScore
          popularity
          format
          episodes
          status
        }
      }
    }
  `;

    try {
      // Realizar petición 
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            genre: genre,
            limit: limit
          }
        })
      });

      const data = await response.json();

      // Organizar resultados por popularidad
      return data.data.Page.media.map(anime => ({
        ...anime,
        popularityRank: anime.popularity
      })).sort((a, b) => b.popularityRank - a.popularityRank);
    } catch (error) {
      console.error(`Error buscando animes de género ${genre}:`, error);
      return [];
    }
  }

  private async searchAnilist(title: string): Promise<AnilistAnime> {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { search: title }
        })
      });

      const data = await response.json();
      return data.data.Media;
    } catch (error) {
      console.error('Error Anilist:', error);
      return null;
    }
  }

  async getLastEpisodes(): Promise<Episode[]> {
    try {
      const response = await fetch(this.RSS_URL);
      if (response.status === 403) {
        console.error('RSS token has expired or is invalid');
        return [];
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlData = await response.text();
      const result = this.parser.parse(xmlData);

      if (!result.rss?.channel?.item) {
        throw new Error('Invalid RSS ');
      }

      const items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];

      const episodes = await Promise.all(
        items.slice(0, 5).map(async (item): Promise<Episode> => {
          const parsedInfo = await this.parseAnimeTitle(item.title, item);

          return {
            original_title: item.title,
            info: parsedInfo,
            download: {
              link: item.link || null,
              size: item['erai:size'] || null
            },
            published: new Date(item.pubDate).toISOString()
          };
        })
      );

      return episodes;
    } catch (error) {
      console.error('Error fetching RSS:', error);
      return [];
    }
  }

  async getEnhancedEpisodes(
    season?: string,
    status?: string,
    format?: string
  ): Promise<EnhancedAnimeInfo[]> {
    try {
      const episodes = await this.getLastEpisodes();
      const enhancedEpisodes = await Promise.all(
        episodes.map(async (episode) => {
          const animeInfo = await this.searchAnilist(episode.info.title);
          return {
            anime: animeInfo,
            episode: episode.info.episode,
            torrent: {
              link: episode.download.link,
              size: episode.download.size
            }
          };
        })
      );
      return enhancedEpisodes.filter(Boolean);
    } catch (error) {
      this.logger.error('Error:', error);
      return [];
    }
  }
      
   private async fetchFromAnilist(query: string, variables: any) {
           const response = await fetch(this.api_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
          });
          return response.json();
        }

 private isCurrentSeason(airingAt: number): boolean {
  if (!airingAt) return false;
    const now = new Date();
      const airingDate = new Date(airingAt * 1000);
      return now.getMonth() === airingDate.getMonth();
        }

  async searchByAnimeTitle(title: string): Promise<Episode[]> {
    try {
      if (!title) {
        return [];
      }

      const allEpisodes = await this.getLastEpisodes();
      return allEpisodes.filter(episode =>
        episode.info.title.toLowerCase().includes(title.toLowerCase())
      );
    } catch (error) {
      console.error('Error episodes:', error);
      return [];
    }
  }

  async getRssAnimeInfo(): Promise<RssAnimeInfo[]> {
    try {
      const response = await fetch(this.RSS_URL);
      if (!response.ok) throw new Error(`HTTP error! : ${response.status}`);

      const xmlData = await response.text();
      const result = this.parser.parse(xmlData);
      const items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];

      return await Promise.all(
        items.slice(0, 5).map(async (item) => {
          // Obtener datos del episodio usando anitomyscript
          const { anime_title, episode_number } = await anitomyscript(item.title);
          // Buscar información del anime en Anilist
          const animeInfo = await this.searchAnilist(anime_title);

          return {
            anime: animeInfo,
            episode: parseInt(episode_number) || 0,
            torrent: {
              link: item.link,
              size: item['erai:size']
            }
          };
        })
      );
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  }

  public async getAllAnimeInformation(): Promise<AnimeEpisodeDetails[]> {
    try {
      // Obtener la temporada actual
      const currentDate = new Date();
      const month = currentDate.getMonth();
      let season = '';

      if (month >= 0 && month <= 2) season = 'WINTER';
      else if (month >= 3 && month <= 5) season = 'SPRING';
      else if (month >= 6 && month <= 8) season = 'SUMMER';
      else season = 'FALL';

      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query_anime.anime_todo,
          variables: {
            season: season,
            year: currentDate.getFullYear()
          }
        })
      });

      const data = await response.json();
      const animes = data.data?.Page?.media || [];

      // Obtener información del RSS feed
      const rssResponse = await fetch(this.RSS_URL);
      const xmlData = await rssResponse.text();
      const rssData = this.parser.parse(xmlData);
      const rssItems = rssData.rss?.channel?.item || [];

      const enrichedEpisodes = await Promise.all(
        animes.map(async (anime) => {
          // Buscar el torrent correspondiente
          const torrentInfo = rssItems.find(item =>
            item.title.toLowerCase().includes(anime.title.romaji.toLowerCase()) ||
            (anime.title.english && item.title.toLowerCase().includes(anime.title.english.toLowerCase()))
          );

          // Obtener información del episodio usando el torrent si existe
          const { episode_number } = torrentInfo ?
            await anitomyscript(torrentInfo.title) :
            { episode_number: anime.nextAiringEpisode?.episode.toString() || "1" };

          const nextEp = anime.nextAiringEpisode;
          const episodeNum = parseInt(episode_number);

          return {
            idAnilist: anime.id,
            title: {
              romaji: anime.title.romaji,
              english: anime.title.english,
              native: anime.title.native
            },
            duration: anime.duration,
            coverImage: {
              extraLarge: anime.coverImage?.extraLarge
            },
            bannerImage: anime.bannerImage,
            episode: {
              tvdbShowId: Math.floor(Math.random() * 1000000), 
              tvdbId: Math.floor(Math.random() * 1000000), 
              seasonNumber: 1,
              episodeNumber: episodeNum,
              absoluteEpisodeNumber: episodeNum,
              title: {
                ja: anime.title.native,
                en: anime.title.english,
                'x-jat': anime.title.romaji
              },
              airDate: nextEp ? new Date(nextEp.airingAt * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              airDateUtc: nextEp ? new Date(nextEp.airingAt * 1000).toISOString() : new Date().toISOString(),
              runtime: anime.duration || 24,
              overview: anime.description || '',
              episode: episode_number,
              anidbEid: Math.floor(Math.random() * 1000000), 
              length: anime.duration || 24,
              airdate: nextEp ? new Date(nextEp.airingAt * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            },
            torrent: torrentInfo ? {
              title: torrentInfo.title,
              link: torrentInfo.link,
              pubDate: torrentInfo.pubDate,
              resolution: '1080p',
              linkType: 'Torrent',
              size: torrentInfo['erai:size'] || 'Unknown',
              infoHash: torrentInfo.infoHash || '',
              subtitles: '[us][br][mx][es][sa][fr][de][it][ru]',
              category: '[Airing]',
              episode: episodeNum,
              isHevc: torrentInfo.title.toLowerCase().includes('hevc'),
              hasNetflixSubs: false
            } : {
              title: anime.title.romaji,
              link: '',
              pubDate: new Date().toISOString(),
              resolution: '1080p',
              linkType: 'Torrent',
              size: 'Unknown',
              infoHash: '',
              subtitles: '[us][br][mx][es][sa][fr][de][it][ru]',
              category: '[Airing]',
              episode: episodeNum,
              isHevc: false,
              hasNetflixSubs: false
            }
          };
        })
      );

      return enrichedEpisodes
        .filter(Boolean)
        .sort((a, b) => new Date(b.torrent.pubDate).getTime() - new Date(a.torrent.pubDate).getTime());

    } catch (error) {
      console.error('Error getting all anime information:', error);
      return [];
    }
  }

  public async getAnimeEpisodeDetails(
    animeId: number,
    page: number = 1,
    perPage: number = 10
  ): Promise<AnimeEpisodeDetails[]> {
    const query = `
        query ($animeId: Int, $page: Int, $perPage: Int) {
          Media(id: $animeId, type: ANIME) {
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
            episodes(page: $page, perPage: $perPage) {
              edges {
                node {
                  id
                  number
                  title {
                    romaji
                    english
                    native
                  }
                  duration
                  description
                  airDate
                }
              }
            }
          }
        }
      `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { animeId, page, perPage }
        })
      });

      const data = await response.json();

      // Verificar si hay errores en la respuesta
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        return [];
      }

      // Verificar si tenemos los datos necesarios
      if (!data.data?.Media) {
        console.error(`No media data found for anime ID ${animeId}`);
        return [];
      }

      const { id, title, coverImage, bannerImage, episodes } = data.data.Media;

      // Verificar si hay episodios
      if (!episodes?.edges?.length) {
        console.log(`No episodes found for anime ID ${animeId}`);
        return [{
          idAnilist: id,
          title: {
            romaji: title?.romaji || '',
            english: title?.english || '',
            native: title?.native || ''
          },
          duration: null,
          coverImage: {
            extraLarge: coverImage?.extraLarge || ''
          },
          bannerImage: bannerImage || null,
          episode: null,
          torrent: {
            title: title?.romaji || '',
            link: '',
            pubDate: new Date().toISOString(),
            resolution: '1080p',
            linkType: 'Torrent',
            size: 'Unknown',
            infoHash: '',
            subtitles: '[us][br][mx][es][sa][fr][de][it][ru]',
            category: '[Airing]',
            episode: 0,
            isHevc: false,
            hasNetflixSubs: false
          }
        }];
      }

      return episodes.edges.map(edge => ({
        idAnilist: id,
        title: {
          romaji: title?.romaji || '',
          english: title?.english || '',
          native: title?.native || ''
        },
        duration: edge.node?.duration || null,
        coverImage: {
          extraLarge: coverImage?.extraLarge || ''
        },
        bannerImage: bannerImage || null,
        episode: edge.node ? {
          tvdbShowId: 0,
          tvdbId: 0,
          seasonNumber: 1,
          episodeNumber: edge.node.number || 0,
          absoluteEpisodeNumber: edge.node.number || 0,
          airDate: edge.node.airDate || new Date().toISOString().split('T')[0],
          airDateUtc: edge.node.airDate ? new Date(edge.node.airDate).toISOString() : new Date().toISOString(),
          runtime: edge.node.duration || 24,
          episode: (edge.node.number || 0).toString(),
          anidbEid: 0,
          length: edge.node.duration || 24,
          airdate: edge.node.airDate || new Date().toISOString().split('T')[0],
          title: {
            ja: edge.node.title?.native || '',
            en: edge.node.title?.english || '',
            'x-jat': edge.node.title?.romaji || ''
          },
          overview: edge.node.description || ''
        } : null,
        torrent: {
          title: title?.romaji || '',
          link: '',
          pubDate: new Date().toISOString(),
          resolution: '1080p',
          linkType: 'Torrent',
          size: 'Unknown',
          infoHash: '',
          subtitles: '[us][br][mx][es][sa][fr][de][it][ru]',
          category: '[Airing]',
          episode: edge.node?.number || 0,
          isHevc: false,
          hasNetflixSubs: false
        }
      }));
    } catch (error) {
      console.error(`Error getting episode details for anime ${animeId}:`, error);
      return [];
    }
  }

  // nuevo enero a febrero
  public async findByAnilistId(idAnilist: number) {
    try {
      // Primero buscar en la base de datos
      const animeInDb = await this.animeRepository.findOne({
        where: { idAnilist }
      });

      if (animeInDb) {
        console.log('Anime encontrado en DB:', animeInDb);
        return animeInDb;
      }

      // Si no está en DB, buscar en Anilist
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query_anime.anime_findanilist, 
          variables: { id: idAnilist }
        })
      });

      const data = await response.json();
      const animeData = data.data.Media;

      // Guardar en la base de datos
      const anime = this.animeRepository.create({
        idAnilist: animeData.id,
        title: {
          romaji: animeData.title.romaji,
          english: animeData.title.english,
          native: animeData.title.native
        },
        description: animeData.description,
        coverImage: animeData.coverImage,
        bannerImage: animeData.bannerImage,
        genres: animeData.genres,
        episodes: animeData.episodes,
        duration: animeData.duration,
        status: animeData.status
      });

      const savedAnime = await this.animeRepository.save(anime);
      console.log('Anime guardado en DB:', savedAnime);

      return savedAnime;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  }

  async findAllStored() {
    return await this.animeRepository.find();
  }

//método público asíncrono que busca animes trending
//quantity es un parámetro opcional con valor por defecto de 10
//number = 10 significa que si no se proporciona un valor, usará 10
  public async findTrending(quantity: number = 10) {
    try {
      const storedAnimes = await this.animeRepository.find({
        take: quantity,
        order: { idAnilist: 'DESC' }
      });
  
      if (storedAnimes.length >= quantity) {
        console.log('Animes encontrados en DB:', storedAnimes.length);
        return storedAnimes;
      }
  
      //busca en anilist
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query_anime.anime_trending, 
          variables: { 
            perPage: quantity
          }
        })
      });
  //aqui mando a llamar la query, que es la que se llama anime_trending 
      const data = await response.json();
      const animes = data.data.Page.media;
  
      //guarda los nuevos animes
      const savedAnimes = await Promise.all(
        animes.map(async (animeData) => {
          const existingAnime = await this.animeRepository.findOne({
            where: { idAnilist: animeData.id }
          });
  
          if (existingAnime) {
            console.log('Anime ya existe en DB:', existingAnime.title.romaji);
            return existingAnime;
          }

          const anime = this.animeRepository.create({
            idAnilist: animeData.id,
            title: {
              romaji: animeData.title.romaji,
              english: animeData.title.english,
              native: animeData.title.native
            },
            coverImage: animeData.coverImage,
            status: animeData.status,
            startDate: {
              year: animeData.startDate?.year || new Date().getFullYear(),
              month: animeData.startDate?.month || (new Date().getMonth() + 1),
              day: animeData.startDate?.day || new Date().getDate() 
            },
            description: '',
            genres: [],
            episodes: 0,
            synonyms: []
          });
  
          const savedAnime = await this.animeRepository.save(anime);
          console.log('Nuevo anime guardado en DB:', savedAnime.title.romaji);
          return savedAnime;
        })
      );
  
      return savedAnimes;
    } catch (error) {
      console.error('Error en findTrending:', error);
      return [];
    }
  }   

//obtener episodios especificos
async getEpisodeData(idAnilist: number, episode: string): Promise<any> {    
  try {
    const animeInfo = await this.fetchFromAnilist(query_anime.anime_episodio, { id: idAnilist });
  
    //obtener info del RSS y parsear con anitomyscript
    const rssResponse = await fetch(this.api_url);
    const xmlData = await rssResponse.text();
    const rssData = this.parser.parse(xmlData);
    const episodeInfo = rssData.rss?.channel?.item?.find(item => {
      const titleLower = item.title.toLowerCase();
      const animeTitleLower = animeInfo.data.Media.title.romaji.toLowerCase();
      return titleLower.includes(animeTitleLower) && 
             titleLower.includes(`episode ${episode}`);
    });

    //usar anitomyscript para obtener más detalles
    let parsedInfo = null;
    if (episodeInfo) {
      parsedInfo = await anitomyscript(episodeInfo.title);
    }

    return {
      animeInfo: animeInfo.data.Media,
      episodeData: {
        title: `${animeInfo.data.Media.title.romaji} - Episode ${episode}`,
        parsedInfo: parsedInfo ? {
          anime_title: parsedInfo.anime_title,
          episode_number: parsedInfo.episode_number,
          video_resolution: parsedInfo.video_resolution,
          release_group: parsedInfo.release_group,
          subtitles: parsedInfo.subtitles,
          file_type: parsedInfo.file_type,
          audio_term: parsedInfo.audio_term
        } : null,
        link: episodeInfo?.link || null,
        size: episodeInfo?.['erai:size'] || 'Unknown',
        pubDate: episodeInfo?.pubDate || null,
        resolution: parsedInfo?.video_resolution || '1080p',
        subtitles: parsedInfo?.subtitles ? `[${parsedInfo.subtitles.join('][')}]` : '[us][mx][es]',
        episodeNumber: parseInt(episode),
        available: !!episodeInfo,
        status: parseInt(episode) > 1122 ? 'UPCOMING' : 'RELEASED'
      }
    };

  } catch (error) {
    this.logger.error(`Error getting episode data for anime ${idAnilist}, episode ${episode}:`, error);
    return {
      animeInfo: null,
      episodeData: null,
      error: error.message
    };
  }
}

async getAllAnimeEpisodes(
  idAnilist: number,
  includeTorrents: boolean,
  includeHevc: boolean 
): Promise<any> {
  try {
    const animeInfo = await this.fetchFromAnilist(query_anime.anime_todo, { id: idAnilist });

    if (includeTorrents) {
      const rssResponse = await fetch(this.RSS_URL);
      const xmlData = await rssResponse.text();
      const rssData = this.parser.parse(xmlData);
      const episodes = rssData.rss?.channel?.item || [];

      const torrentEpisodes = episodes
        .filter(item => {
          const titleLower = item.title.toLowerCase();
          return titleLower.includes(animeInfo.data.Media.title.romaji.toLowerCase()) &&
                 (includeHevc || !titleLower.includes('hevc'));
        })
        .map(item => ({
          title: item.title,
          link: item.link,
          size: item['erai:size'],
          pubDate: item.pubDate
        }));

      return {
        animeInfo: animeInfo.data.Media,
        episodes: torrentEpisodes
      };
    }

    return {
      animeInfo: animeInfo.data.Media,
      episodes: []
    };
  } catch (error) {
    this.logger.error(`Error getting episodes for anime ${idAnilist}:`, error);
    return {
      animeInfo: null,
      episodes: []
    };
  }
}

  public async getAnimeRecommendations(animeId: number): Promise<AnilistAnime[]> {
    try {
      const baseAnimeResponse = await fetch(this.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ($id: Int) {
              Media(id: $id, type: ANIME) {
                genres
              }
            }
          `,
          variables: { id: animeId }
        })
      }); //query para encontrar solo por generos
  
      const baseAnimeData = await baseAnimeResponse.json();
      const baseGenres = baseAnimeData.data.Media.genres;
  
      const response = await fetch(this.api_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query_anime.anime_recomendaciones,
          variables: { id: animeId }
        })
      });
  
      const data = await response.json();
      const recommendations = data.data?.Media?.recommendations?.nodes || [];
  //filtrado para que solo devuelva generos iguales
      const exactGenreMatches = recommendations.filter(node => 
        node.mediaRecommendation.genres.length === baseGenres.length && 
        node.mediaRecommendation.genres.every(genre => 
          baseGenres.includes(genre)
        )
      ).map(node => node.mediaRecommendation);

      if (exactGenreMatches.length > 0) {
        return exactGenreMatches.slice(0, 10);
      }

      return recommendations
        .map(node => node.mediaRecommendation)
        .slice(0, 10);
  
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

public async search({ 
  animeName, 
  limitResult, 
  status,
  page = 1 ,
  genre
}: { 
  animeName: string;
  limitResult: number;
  status?: string;
  page?: number;
  genre?: string;
}) {
  try {
    const skip = (page - 1) * limitResult;

    //mejora: búsqueda optimizada en DB usando QueryBuilder = herramienta de TypeORM
    const queryBuilder =  this.animeRepository
      .createQueryBuilder('anime')
      .where(`anime.title->>'romaji' ILIKE :name OR anime.title->>'english' ILIKE :name`, {
        name: `%${animeName}%`
      })
      // Obtener el total
    const totalCount = await queryBuilder.getCount();

    // Obtener los resultados paginados
    const storedAnimes = await queryBuilder
      .skip(skip)
      .take(limitResult)
      .getMany();
    console.log(`Animes encontrados en DB para "${animeName}":`, storedAnimes.length);

    //mejora:si hay suficientes resultados en DB, los retornamos
    if (storedAnimes.length >= limitResult) {
      return {
        data: storedAnimes,
        pagination: {
          currentPage: page,
          itemsPerPage: limitResult,
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limitResult)
        }
      };
    }

    const response = await fetch(this.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query_anime.anime_todo,
        variables: { 
          search: animeName,
          perPage: limitResult - storedAnimes.length, //mejora: ajustar cantidad a buscar
          status: status?.toUpperCase()
        }
      })
    });

    const data = await response.json();
    const animes = data.data?.Page?.media || [];

    // mejora verificación mejorada de duplicados
    const newAnimes = await Promise.all(
      animes.map(async (animeData) => {
        const existingAnime = await this.animeRepository
          .createQueryBuilder('anime')
          .where(`anime.title->>'romaji' ILIKE :title OR anime.idAnilist = :id`, {
            title: animeData.title.romaji,
            id: animeData.id
          })
          .getOne();

        if (existingAnime) {
          console.log('Anime ya existe en DB:', existingAnime.title.romaji);
          return existingAnime;
        }

        const anime = this.animeRepository.create({
          idAnilist: animeData.id,
          title: {
            romaji: animeData.title.romaji,
            english: animeData.title.english,
            native: animeData.title.native
          },
          description: animeData.description,
          coverImage: animeData.coverImage,
          bannerImage: animeData.bannerImage,
          genres: animeData.genres,
          episodes: animeData.episodes,
          duration: animeData.duration,
          status: animeData.status
        });

        const savedAnime = await this.animeRepository.save(anime);
        console.log('Nuevo anime guardado en DB:', savedAnime.title.romaji);
        return savedAnime;
      })
    );

    //Mjora combinar resultados de DB y nuevos
    // Mejora combinar resultados de DB y nuevos
    return {
    data: [...storedAnimes, ...newAnimes],  // Combinar ambos arrays
    pagination: {
    currentPage: page,
    itemsPerPage: limitResult,
    totalItems: totalCount + newAnimes.length,  // Sumar nuevos items al total
    totalPages: Math.ceil((totalCount + newAnimes.length) / limitResult)
   }
  };
  } catch (error) {
    console.error('Error en search:', error);
    return {
      data: [],
      pagination: {
        currentPage: page,
        itemsPerPage: limitResult,
        totalItems: 0,
        totalPages: 0
      }
    };
  }}

public async searchArray(animes: string[]) {
  try {
    const results = await Promise.all(
      animes.map(animeName => 
        this.search({ 
          animeName, 
          limitResult: 1, // Solo el mejor resultado para cada uno
          status: undefined 
        })
      )
    );

    // Aplanar resultados y eliminar vacíos
    return results
      .flat()
      .filter(Boolean);
  } catch (error) {
    console.error('Error en búsqueda por lote:', error);
    return [];
    }
  }

async updateAnime(idAnilist: number, updateData: Partial<Anime>) {
  try {
    console.log(`Buscando anime con idAnilist: ${idAnilist}`);
    let anime = await this.animeRepository.findOne({ where: { idAnilist } });
    console.log(`Resultado de la búsqueda:`, anime);

    if (!anime) {
      console.log('No se encontró en la base de datos, buscando en anilist');
      const animeInfo = await this.fetchFromAnilist(query_anime.anime_actualizar, { id: idAnilist });
      console.log('Respuesta de Anilist:', animeInfo);

      if (!animeInfo?.data?.Media) {
        throw new Error('No se encontró información del anime en Anilist');
      }

      const mappedAnimeData = this.mapeoAtypeorm(animeInfo.data.Media);
      console.log('Datos mapeados:', mappedAnimeData);

      anime = this.animeRepository.create(mappedAnimeData);
      anime = await this.animeRepository.save(anime);
      console.log('Nuevo anime guardado:', anime);
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    Object.assign(anime, updateData);
    console.log('Datos después de la actualización:', anime);

    const updatedAnime = await this.animeRepository.save(anime);
    console.log('Anime actualizado:', updatedAnime);

    return updatedAnime;
  } catch (error) {
    this.logger.error(`Error en actualizar el anime ${idAnilist}:`, error);
    throw new Error(`Error en actualizar: ${error.message}`);
  }
}
}
