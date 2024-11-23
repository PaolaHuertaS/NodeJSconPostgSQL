export interface ParsedAnimeInfo {
    anime_title?: string;
    episode_number?: number;
    video_resolution?: string;
    release_group?: string;
    file_checksum?: string;
    subtitles?: string[];
    audio_term?: string;
}
  
export interface Episode {
    original_title: string;
    info: ParsedAnimeInfo;
    download: {
      link: string;
      size: string;
    };
    published: string;
}

