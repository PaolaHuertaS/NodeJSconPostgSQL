import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
const anitomy = require('anitomyscript');

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });

  private readonly RSS_URL = 'https://www.erai-raws.info/episodes/feed/?res=1080p&type=torrent&subs%5B0%5D=mx&token=c7aa3ae68b4ef37a904773bb46371e42';

  private parseAnimeInfo(title: string) {
   
    const animeMatch = /\[Torrent\] (.*?) - (\d+)/;
    const resolutionMatch = /\[(\d+p)\]/;
    const subtitlesMatch = /\[(.*?)\]/g;
    
    const animeParts = title.match(animeMatch);
    const resolution = title.match(resolutionMatch);
    const subtitles = [...title.matchAll(subtitlesMatch)]
      .map(match => match[1])
      .filter(sub => sub !== 'Torrent' && !sub.includes('p') && sub !== 'Airing');

    return {
      anime_title: animeParts ? animeParts[1] : 'Unknown',
      episode_number: animeParts ? animeParts[2] : 'Unknown',
      resolution: resolution ? resolution[1] : 'Unknown',
      subtitles: subtitles,
      is_airing: title.includes('[Airing]')
    };
  }

  async getLastEpisodes() {
    try {
      const response = await fetch(this.RSS_URL);
      const xmlData = await response.text();
      const result = this.parser.parse(xmlData);
      
      const items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];

      const episodes = items.slice(0, 5).map(item => {
        const parsedInfo = this.parseAnimeInfo(item.title);
        
        return {
          original_title: item.title,
          parsed: parsedInfo,
          link: item.link,
          date: new Date(item.pubDate).toLocaleString(),
          size: item['erai:size']
        };
      });

      return {
        success: true,
        count: episodes.length,
        episodes: episodes
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        episodes: []
      };
    }
  }
}