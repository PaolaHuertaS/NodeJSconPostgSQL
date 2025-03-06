export interface AnimeTitle {
  romaji: string;
  english: string | null;
  native: string | null;
}

export interface TorrentInfo {
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

export interface EpisodeInfo {
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
}

export interface ParsedAnimeInfo extends TorrentInfo {}

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
}

export interface AnilistAnime {
  id: number;
  title: AnimeTitle;
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
  title: AnimeTitle;
  duration: number | null;
  coverImage: {
    extraLarge: string;
  };
  bannerImage: string | null;
  episode: EpisodeInfo | null;
  torrent: TorrentInfo;
  nextAiringEpisode?: {
    episode: number;
    airingAt: number;
  };
  statistics?: any; 
  similar?: any[]; 
  genres?: string[];
  status?: string;
}