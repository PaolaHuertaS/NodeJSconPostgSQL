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
        anime_title: this.getValueOrNull(result.anime_title),
        episode_number: this.parseEpisodeNumber(result.episode_number),
        video_resolution: this.getValueOrNull(result.video_resolution),
        release_group: this.getValueOrNull(result.release_group),
        file_checksum: this.getValueOrNull(result.file_checksum),
        subtitles: Array.isArray(result.subtitles) ? result.subtitles : [],
        audio_term: this.getValueOrNull(result.audio_term)
      };
    } catch (error) {
      console.error('Error', title, error);
      return this.createEmptyParsedInfo();
    }
  }

  
  private getValueOrNull<T>(value: T): T | null {
    return value || null;
  }

  private parseEpisodeNumber(value: string | number): number | null {
    if (!value) return null;
    const parsed = parseInt(value.toString());
    return isNaN(parsed) ? null : parsed;
  }

  private createEmptyParsedInfo(): ParsedAnimeInfo {
    return {
      anime_title: null,
      episode_number: null,
      video_resolution: null,
      release_group: null,
      file_checksum: null,
      subtitles: [],
      audio_term: null
    };
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
        throw new Error('Invalid RSS structure');
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
              link: this.getValueOrNull(item.link),
              size: this.getValueOrNull(item['erai:size'])
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