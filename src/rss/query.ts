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
     query ($genres: [String]) {
          Page(perPage: 10) {
            media(genre_in: $genres, type: ANIME, sort: POPULARITY_DESC) {
              id
              idMal
              title {
                romaji
                english
                native
              }
              description
              season
              seasonYear
              format
              status
              episodes
              duration
              genres
              coverImage {
                extraLarge
                medium
                color
              }
              bannerImage
              synonyms
              nextAiringEpisode {
                episode
                airingAt
              }
              startDate {
                year
                month
                day
              }
              trailer {
                id
                site
              }
            }
          }
        }`,
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
      ...animeBase  
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
      characters (page: 1, perPage: 5) {  
        edges {  
        role
        node {
          id
          name {
            full
            native
          }
          image {
            large
          }
        }
      }
    } 
  }
}   
`,

anime_episodio: `
${graphqlAnimeClase.animeBase()}
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      ...animeBase
      episodes
      status
      description
      nextAiringEpisode {
        episode
        airingAt
      }
    }
  }
`,

//query para updateanime
anime_actualizar: `
${graphqlAnimeClase.animeBase()}
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ...animeBase
      id
      status
      genres
      format
      seasonYear
      coverImage {
        extraLarge
        medium
        color
      }
      startDate {
        year
        month
        day
      }
      synonyms
    }
  }
`,

anime_topgenero: `
query ($genre: String, $limit: Int) {
      Page(page: 1, perPage: $limit) {
        media(
          genre: $genre,
          type: ANIME,
          sort: POPULARITY_DESC
        ) {
          id
          title {
            romaji
            english
            native
          }
          genres
          description
          averageScore
          popularity
          format
          episodes
          status
        }
      }
    }
`
};