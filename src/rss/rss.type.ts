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
  genres?: string[];        
  synopsis?: string;       
  status?: string;         
  duration?: string;       
  rating?: number;         
}

export interface AnimeRecommendation {
  mediaRecommendation: AnilistAnime;
};

export interface AnilistAnime {
  id: number;
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  genres: string[];
  description: string;
  status: string;
  episodes: number;
  duration: number;
  averageScore?: number;
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
  };
  coverImage: {
    large?: string;
    extraLarge?: string;
  };
  bannerImage?: string;
  recommendations?: {
    nodes: AnimeRecommendation[];
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

export interface AnimeEpisodeDetails {
  idAnilist: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  duration: number | null;
  coverImage: {
    extraLarge: string;
  };
  bannerImage: string | null;
  episode: {
    tvdbShowId: number;
    tvdbId: number;
    seasonNumber: number;
    episodeNumber: number;
    absoluteEpisodeNumber: number;
    title: {
      ja: string;
      en: string;
      'x-jat': string;
    };
    airDate: string;
    airDateUtc: string;
    runtime: number;
    image?: string;
    episode: string;
    anidbEid: number;
    length: number;
    airdate: string;
    overview?: string;
    rating?: string;
  } | null;
  torrent: {
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
  };
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
  };
  statistics?: any;
  similar?: any[];
  genres?: string[];
  status?: string;
}




