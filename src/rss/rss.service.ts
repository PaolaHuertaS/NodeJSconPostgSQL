import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { parseAnimeTitle } from 'anitomyscript';

@Injectable()
export class RssService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''
  });

  private readonly RSS_URL = 'https://www.erai-raws.info/episodes/feed/?res=1080p&type=torrent&subs%5B0%5D=mx&token=c7aa3ae68b4ef37a904773bb46371e42';

  async getLastEpisodes() {
    try {
      const response = await fetch(this.RSS_URL);
      const xmlData = await response.text();
      const result = this.parser.parse(xmlData);
      
      const items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];

      const episodes = await Promise.all(
        items.slice(0, 5).map(async (item) => {
          try {
            const parsedTitle = await parseAnimeTitle(item.title);
            
            return {
              original: item.title,
              parsed: parsedTitle,
              link: item.link,
              date: item.pubDate,
              size: item['erai:size']
            };
          } catch (parseError) {
            console.error('Error parsing title:', item.title, parseError);
            return {
              original: item.title,
              link: item.link,
              date: item.pubDate,
              size: item['erai:size'],
              parsed: null
            };
          }
        })
      );

      return episodes;
    } catch (error) {
      console.error('RSS Feed Error:', error);
      throw new Error(`Failed to fetch episodes: ${error.message}`);
    }
  }
}