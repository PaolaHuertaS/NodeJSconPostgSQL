import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';

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
      
      
      return result.rss.channel.item.slice(0, 5).map(item => ({
        title: item.title,
        link: item.link,
        date: item.pubDate,
        size: item['erai:size']
      }));
    } catch (error) {
      throw new Error(`Error: ${error.message}`);
    }
  }
}