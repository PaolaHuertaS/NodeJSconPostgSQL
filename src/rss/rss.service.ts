import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { Episode, ParsedAnimeInfo } from './rss.type';
const anitomyscript = require('anitomyscript');

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });

  private readonly RSS_URL = 'https://www.erai-raws.info/episodes/feed/?res=1080p&type=torrent&subs%5B0%5D=mx&token=c7aa3ae68b4ef37a904773bb46371e42';

  private async parseAnimeTitle(title: string): Promise<ParsedAnimeInfo> {
    try {
      if (!title) {
        throw new Error('Title is required');
      }

      const result = await anitomyscript(title);
      return {
        anime_title: result.anime_title || '',
        episode_number: result.episode_number ? parseInt(result.episode_number) : null,
        video_resolution: result.video_resolution || '',
        release_group: result.release_group || '',
        file_checksum: result.file_checksum || '',
        subtitles: result.subtitles || [],
        audio_term: result.audio_term || ''
      };
    } catch (error) {
      console.error('Error parsing anime title:', title, error);
      return {
        anime_title: title,
        episode_number: null,
        video_resolution: '',
        release_group: '',
        file_checksum: '',
        subtitles: [],
        audio_term: ''
      };
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
        throw new Error('Invalid RSS feed structure');
      }

      const items = Array.isArray(result.rss.channel.item)
        ? result.rss.channel.item
        : [result.rss.channel.item];

      const episodes = await Promise.all(
        items.slice(0, 5).map(async (item): Promise<Episode> => {
          const parsedInfo = await this.parseAnimeTitle(item.title);
          
          return {
            original_title: item.title,
            info: parsedInfo,
            download: {
              link: item.link,
              size: item['erai:size'] || 'Unknown'
            },
            published: new Date(item.pubDate).toISOString()
          };
        })
      );

      return episodes;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
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
        episode.info.anime_title?.toLowerCase().includes(title.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching episodes:', error);
      return [];
    }
  }
}