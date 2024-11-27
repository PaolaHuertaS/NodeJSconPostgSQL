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
