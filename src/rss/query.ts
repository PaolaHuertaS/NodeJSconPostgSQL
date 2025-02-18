import { GraphQLAnime } from './graphsql.service';

//esto contendrá todas nuestras querys, que después podremos llamar, donde
//insertamos el fragmento base y de esta manera lo tome en cuenta, 
//con ${GraphQLAnime} -> es el nombre de nuestra clase en graphql.service -> ya no pq no me sirvió
export const query_anime = {
  anime_detalles: `
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
    }

    query ($search: String) {
      Media (search: $search, type: ANIME) {
        ...animeBase
        description
        duration
        averageScore
      }
    }
  `,

//en las demás querys también se ponen el fragmento base, y de ahí añadimos lo que deseemos
  anime_recomendaciones: `
    ${GraphQLAnime}
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        recommendations(page: 1, perPage: 10) {
          nodes {
            mediaRecommendation {
              ...animeBase
              averageScore
            }
          }
        }
      }
    }
  `,
//nodes en este caso es para un array de resultados, de está manera me dará varios c:
//anime de temporada, todos tienen un formato similar, inician con anime seguido de guion bajo y de ahí una palabra descriptiva
  anime_tempo: `
    ${GraphQLAnime}
    query ($season: MediaSeason, $year: Int) {
      Page(page: 1, perPage: 10) {
        media(season: $season, seasonYear: $year, type: ANIME) {
          ...animeBase
          nextAiringEpisode {
            episode
            airingAt
          }
        }
      }
    }
  `
};