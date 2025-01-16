import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { Episode, ParsedAnimeInfo, EnhancedAnimeInfo, AnilistAnime, RssAnimeInfo } from './rss.type';
const anitomyscript = require('anitomyscript');

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });
  
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

  async getEnhancedEpisodes(): Promise<(Episode & EnhancedAnimeInfo)[]> {
    try {
      const episodes = await this.getLastEpisodes();
      
      return Promise.all(
        episodes.map(async (episode): Promise<Episode & EnhancedAnimeInfo> => {
          const animeInfo = await this.searchAnilist(episode.info.title);
          
          return {
            ...episode,
            anime: animeInfo,
            episode: episode.info.episode,
            torrent: {
              link: episode.download.link,
              size: episode.download.size
            }
          };
        })
      );
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
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
}

