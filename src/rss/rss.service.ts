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

