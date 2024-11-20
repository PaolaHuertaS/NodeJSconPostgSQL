import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { join } from 'path';
import { readFileSync } from 'fs';
import { GraphqlModule } from './graphql/graphql.module';
import { RssModule } from './rss/rss.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'pg-261f372e-paonico11-a758.l.aivencloud.com',
      port: 23584,
      username: 'avnadmin',
      password: 'AVNS_45IjXrwFDcUCLByHI_v',
      database: 'defaultdb',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      ssl: {
        ca: readFileSync(join(process.cwd(), 'ca.pem')).toString(),
        rejectUnauthorized: true
      }
    }),
    BookModule,
    GraphqlModule,
    RssModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
