export interface ParsedAnimeInfo {
  title: string;
  link: string;
  pubDate: string;
  resolution: string;
  linkType: string;
  size: string;
  infoHash: string;
  subtitles: string;
  category: string;
  episode: number;
  isHevc: boolean;
  hasNetflixSubs: boolean;
}

export interface Episode {
  original_title: string;
  info: ParsedAnimeInfo;
  download: {
    link: string | null;
    size: string | null;
  };
  published: string;
}

export interface EnhancedAnimeInfo {
  anime: AnilistAnime;
  episode: number;
  torrent: {
    link: string;
    size: string;
  };
}

export interface AnilistAnime {
  id: number;
  title: {
    romaji: string;
    english: string;
  };
}

export interface RssAnimeInfo {
  anime: AnilistAnime;
  episode: number;
  torrent: {
    link: string;
    size: string;
  };
}
