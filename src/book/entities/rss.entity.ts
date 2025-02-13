// src/entities/anime.entity.ts -> rss.entity.ts

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Anime') 
export class Anime {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  idAnilist: number

  @Column({ nullable: true })
  idMal: number

  @Column({ type: 'json' })
  title: {
    romaji: string
    english: string
    native: string
  }
  @Column({ type: 'text', nullable: true })
  description: string
  @Column({ default: false })
  descriptionTranslated: boolean
  @Column({ nullable: true })
  season: string
  @Column({ nullable: true })
  seasonYear: number
  @Column({ nullable: true })
  format: string
  @Column({ nullable: true })
  status: string
  @Column({ nullable: true })
  episodes: number
  @Column({ nullable: true })
  duration: number
  @Column({ type: 'simple-array' })
  genres: string[]
  @Column({ type: 'json' })
  coverImage: {
    extraLarge: string
    medium: string
    color: string
  }
  @Column({ nullable: true })
  bannerImage: string
  @Column({ type: 'simple-array' })
  synonyms: string[]
  @Column({ type: 'json', nullable: true })
  nextAiringEpisode: {
    airingAt: number
    episode: number
  }
  @Column({ type: 'json' })
  startDate: {
    year: number
    month: number
    day: number
  }
  @Column({ type: 'json', nullable: true })
  trailer: {
    id: string
    site: string
  }
}