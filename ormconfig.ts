import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'pg-261f372e-paonico11-a758.l.aivencloud.com',
  port: 23584,
  username: 'avnadmin',
  password: 'AVNS_45IjXrwFDcUCLByHI_v',
  database: 'defaultdb',
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: true,
});