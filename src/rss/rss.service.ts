import { Injectable, Param, Query, Logger, Inject} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { XMLParser } from 'fast-xml-parser';
import { Repository, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Anime } from '../book/entities/rss.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo, AnilistAnime, RssAnimeInfo, AnimeEpisodeDetails } from './rss.type';
import { skip } from 'rxjs';
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

  public async getAnimeDetailsFromAnilist(title: string): Promise<AnilistAnime> {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          genres
          description
          status
          episodes
          duration
          averageScore
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

  public async getSimilarAnimes(animeId: number): Promise<AnilistAnime[]> {
    // Query de GraphQL para obtener recomendaciones de un anime específico
    // El $id es una variable que se reemplazará con animeId
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {   
          id
          recommendations(page: 1, perPage: 5) {    
            nodes {
              mediaRecommendation {    
                id                    
                title {                
                  romaji             
                  english            
                  native            
                }
                genres               
                description        
                episodes           
                averageScore      
              }
            }
          }
        }
      }
    `;

    try {
      // Hacer la petición a la API de Anilist
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // El body incluye la query y las variables necesarias
        body: JSON.stringify({
          query,
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

  public async getUpcomingPremieres() {
    // Query para obtener próximos estrenos
    const query = `
      query {
        Page(page: 1, perPage: 25) {
          media(
            type: ANIME,
            status: NOT_YET_RELEASED,   # Solo animes no estrenados
            sort: START_DATE,           # Ordenar por fecha de estreno
          ) {
            id
            title {
              romaji
              english
              native
            }
            startDate {
              year
              month
              day
            }
            coverImage {
              large
            }
            genres
            episodes          # Número de episodios planeados
            format           # TV, MOVIE, OVA, etc.
            studios {
              nodes {
                name        # Estudio de animación
              }
            }
            source          # Origen (MANGA, LIGHT_NOVEL, etc.)
            description     # Sinopsis
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      // Organizar por mes
      const premieresByMonth = data.data.Page.media.reduce((acc, anime) => {
        const monthName = new Date(
          anime.startDate.year,
          anime.startDate.month - 1,
          anime.startDate.day
        ).toLocaleString('es-ES', { month: 'long' });

        if (!acc[monthName]) {
          acc[monthName] = [];
        }

        acc[monthName].push({
          id: anime.id,
          titulo: {
            romaji: anime.title.romaji,
            english: anime.title.english,
            japones: anime.title.native
          },
          fechaEstreno: {
            año: anime.startDate.year,
            mes: anime.startDate.month,
            dia: anime.startDate.day,
          },
          imagen: anime.coverImage.large,
          generos: anime.genres,
          episodios: anime.episodes || "Por confirmar",
          formato: anime.format,
          estudio: anime.studios.nodes[0]?.name || "Por confirmar",
          origen: anime.source,
          sinopsis: anime.description
        });

        return acc;
      }, {});

      return premieresByMonth;
    } catch (error) {
      console.error('Error obteniendo estrenos:', error);
      return {};
    }
  }

  public async getAnimeStats(animeId: number): Promise<any> {
    // Query para obtener estadísticas detalladas
    const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        rankings {                       
          rank                           # Posición
          type                          
          context                      # Contexto del ranking
        }
        stats {
          scoreDistribution {          # Distribución de puntuaciones
            score                     
            amount                   # Cantidad de votos
          }
          statusDistribution {       # Estado de visualización
            status                  
            amount                 # Cantidad de usuarios
          }
        }
        popularity                
        favourites               # Cantidad de favoritos
        trending                # Tendencia actual
      }
    }
  `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { id: animeId }
        })
      });

      const data = await response.json();
      // Organizar todas las estadísticas en un objeto
      return {
        rankings: data.data.Media.rankings || [],
        stats: data.data.Media.stats || {},
        popularity: data.data.Media.popularity,
        favourites: data.data.Media.favourites,
        trending: data.data.Media.trending
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  public async getSeasonAnimes(season: string, year: number): Promise<AnilistAnime[]> {
    // Query para obtener animes de una temporada específica
    // Las temporadas son: WINTER, SPRING, SUMMER, FALL
    const query = `
    query ($season: MediaSeason, $year: Int) {
      Page(page: 1, perPage: 10) {           # Limitar a 10 resultados
        media(
          season: $season,                    
          seasonYear: $year,                  
          type: ANIME,                        # Tipo de media
          sort: POPULARITY_DESC               # Ordenar por popularidad
        ) {
          id
          title {
            romaji                           
            english                          
            native                           
          }
          genres                             
          status                             
          episodes                           
          nextAiringEpisode {                
            episode                          
            airingAt                         
          }
        }
      }
    }
  `;

    try {
      // Hacer la petición a Anilist
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            season: season.toUpperCase(),      // Convertir a mayúsculas
            year: year
          }
        })
      });

      const data = await response.json();
      // Devolver los animes encontrados o array vacío si no hay
      return data.data.Page.media || [];
    } catch (error) {
      console.error('Error obteniendo animes de temporada:', error);
      return [];
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
           const response = await fetch('https://graphql.anilist.co', {
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

      // Query 
      const query = `
          query ($season: MediaSeason, $year: Int) {
            Page(page: 1, perPage: 10) {
              media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
                id
                title {
                  romaji
                  english
                  native
                }
                duration
                description(asHtml: false)
                coverImage {
                  extraLarge
                }
                bannerImage
                nextAiringEpisode {
                  episode
                  airingAt
                }
                status
                episodes
              }
            }
          }
        `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
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
      const query = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
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
            description
            episodes
            duration
            status
            genres
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
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

  
public async findTrending(quantity: number) {
  try {
    // 1. Obtener animes de la base de datos primero
    const storedAnimes = await this.animeRepository.find({
      take: quantity,
      order: { idAnilist: 'DESC' }
    });

    if (storedAnimes.length >= quantity) {
      console.log('Animes encontrados en DB:', storedAnimes.length);
      return storedAnimes;
    }

    // 2. Si no hay suficientes, buscar en Anilist
    const query = `
      query ($perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(type: ANIME, sort: TRENDING_DESC) {
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
            description
            episodes
            duration
            status
            genres
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { perPage: quantity }
      })
    });

    const data = await response.json();
    const animes = data.data.Page.media;

    // 3. Guardar los nuevos animes en la base de datos
    const savedAnimes = await Promise.all(
      animes.map(async (animeData) => {
        // Verificar si ya existe
        const existingAnime = await this.animeRepository.findOne({
          where: { idAnilist: animeData.id }
        });

        if (existingAnime) {
          console.log('Anime ya existe en DB:', existingAnime.title.romaji);
          return existingAnime;
        }

        // Crear nuevo anime
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

    return savedAnimes;
  } catch (error) {
    console.error('Error en findTrending:', error);
    return [];
  }
}

//obtener episodios especificos
async getEpisodeData(idAnilist: number, episode: string): Promise<any> {
  try {
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          episodes
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { id: idAnilist }
      })
    });

    const data = await response.json();
    if (!data.data?.Media) {
      throw new Error('Anime not found');
    }

    //Obtener info del RSS para el episodio específico
    const rssResponse = await fetch(this.RSS_URL);
    const xmlData = await rssResponse.text();
    const rssData = this.parser.parse(xmlData);
    const episodeInfo = rssData.rss?.channel?.item?.find(item => 
      item.title.includes(data.data.Media.title.romaji) && 
      item.title.includes(`Episode ${episode}`)
    );

    return {
      animeInfo: data.data.Media,
      episodeData: episodeInfo || null
    };
  } catch (error) {
    this.logger.error(`Error getting episode data for anime ${idAnilist}, episode ${episode}:`, error);
    return null;
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

    //mejora:búsqueda en Anilist solo si es necesario
    const query = `
      query ($search: String, $perPage: Int, $status: MediaStatus) {
        Page(page: 1, perPage: $perPage) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC, status: $status) {
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
            description
            episodes
            duration
            status
            genres
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
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
} 



