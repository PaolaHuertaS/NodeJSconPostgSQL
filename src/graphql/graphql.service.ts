import { Injectable } from '@nestjs/common';

@Injectable()
export class GraphqlService {
  private readonly apiUrl = 'https://graphql.anilist.co';

  async getAnimeById(id: number) {
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          episodes
          genres
          averageScore
        }
      }
    `;

    const variables = { id };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`GraphQL Query Error: ${error.message}`);
    }
  }

  async searchAnime(search: string) {
    const query = `
      query ($search: String) {
        Page (page: 1, perPage: 10) {
          media (search: $search, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            episodes
            averageScore
            genres
          }
        }
      }
    `;

    const variables = { search };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`GraphQL Query Error: ${error.message}`);
    }
  }
}