import { Controller, Get, Param, Query } from '@nestjs/common';
import { GraphqlService } from './graphql.service';


@Controller('graphql')
export class GraphqlController {
  constructor(private readonly graphqlService: GraphqlService) {}

  @Get('anime/:id')
  async getAnimeById(@Param('id') id: string) {
    return await this.graphqlService.getAnimeById(parseInt(id));
  }
  @Get('search')  
  async searchAnime(@Query('q') search: string) {
    return await this.graphqlService.searchAnime(search);
  }
}