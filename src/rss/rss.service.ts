import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Anime } from '../book/entities/rss.entity';
import { query_anime } from './query';
import { si } from 'nyaapi';
const anitomyscript = require('anitomyscript');

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
      return data.episodes?.[episode] || null;
    } catch (error) {
      console.error("Error obteniendo datos de Anizip:", error);
      return null;
    }
  }

  async fetchRssData(RSS_URL: string, animeTitle: string, episodeNumber: number): Promise<any> {
    try {
      const response = await fetch(RSS_URL); 
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
      const searchTerm = `${animeTitle} ${episodeNumber}`;
      const results = await si.search(searchTerm, {
        category: '1_2',
        sort: 'seeders'  
      }, 5); 
 
      return results.filter(torrent => {
        try {
          const parsedTitle = anitomyscript.sync(torrent.name);
          return parseInt(parsedTitle.episode_number) === episodeNumber;
        } catch (e) {
          return false;
        }
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
      return ;
    }
  }

  
}