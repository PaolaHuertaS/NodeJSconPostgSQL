// src/entities/anime.entity.ts -> rss.entity.ts

import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Anime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idAnilist: number;

  @Column({ nullable: true })
  idMal: number;

  @Column('json')
  title: {
    romaji: string;
    english: string;
    native: string;
  };

  @Column('text', { nullable: true })
  description: string;

  @Column('json', { nullable: true })
  coverImage: {
    extraLarge: string;
    medium: string;
    color: string;
  };

  @Column({ nullable: true })
  bannerImage: string;

  @Column('simple-array')
  genres: string[];

  @Column({ nullable: true })
  episodes: number;

  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  status: string;
}