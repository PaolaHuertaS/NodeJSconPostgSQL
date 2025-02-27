import { Injectable } from '@nestjs/common';

//info a visitar: https://graphql.org/learn/mutations/

@Injectable()
export class GraphQLAnime {
  //url que se usará en todo el código,asi se podra reutilizar
  private readonly API_URL = 'https://graphql.anilist.co';

  //método base
  //fragment es una palabra de graphQ que se supone le indica que es un codigo reutilizable, y de ahí seguido va el nombre q puede ser cualquiera
  // y on Media es el tipo al que debe especificarse que es, esobligatorio en GraphQL decir a qué tipo pertenece el fragmento
  public animeBase(): string {
    return `
    fragment animeBase on Media {
      id
        title {
          romaji
          english
          native
          }
          coverImage {
             large
            }
          bannerImage  
          status
          episodes
          genres
          description  
          popularity      
          season        
          startDate {  
                year
                month
                day
  }
}`;
  }
}
