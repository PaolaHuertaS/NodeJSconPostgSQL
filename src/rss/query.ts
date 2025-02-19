import { GraphQLAnime } from './graphsql.service';

const graphqlAnimeClase = new GraphQLAnime();
//se creó un objeto de tipo string en graphql.service, donde se llama animeBase, ahi contiene una query que siempre va a retornar
//este es string, así que todo lo va a recibir en cadena c:

//esto contendrá todas nuestras querys, que después podremos llamar, donde
//insertamos el fragmento base y de esta manera lo tome en cuenta, 
//con ${GraphQLAnime} -> es el nombre de nuestra clase en graphql.service -> ya no pq no me sirvió -> ya sirvió 
export const query_anime = {
  anime_detalles: `
  ${graphqlAnimeClase.animeBase()}
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
    ${graphqlAnimeClase.animeBase()}
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        recommendations(page: 1, perPage: 10) {
          nodes {
            mediaRecommendation {
              ...animeBase
              averageScore
              genres               
              seasonYear
            }
          }
        }
      }
    }
  `,
//nodes en este caso es para un array de resultados, de está manera me dará varios c:
//anime de temporada, todos tienen un formato similar, inician con anime seguido de guion bajo y de ahí una palabra descriptiva
  anime_tempo: `
    ${graphqlAnimeClase.animeBase()}
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
,
//si tenia el .animebase pero lo quite
  anime_trending: `
    query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
        }
        status
      }
    }
  }
`,

  anime_findanilist: `
    ${graphqlAnimeClase.animeBase()}
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        duration
    }
  }
`,

  anime_todo:  `
    ${graphqlAnimeClase.animeBase()}
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        duration
        status
        nextAiringEpisode {
          episode
          airingAt
        }
           startDate {
            year
             month
              day
        }
           endDate {
            year
             month
              day
        }
        status
      }
        rankings {
         id
          rank
            type
              context
      }
      characters(page: 1, perPage: 5) {
        nodes {
          id
          name {
            full
            native
             }
          image {
              large
             }
            role
        }
      }
    }
`
};