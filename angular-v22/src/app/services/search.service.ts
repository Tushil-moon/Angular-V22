import { inject, Injectable } from '@angular/core';
import { SearchResult } from '@models/index';
import { mapApiSearchResult } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class SearchService {
    private readonly httpClient = inject(HttpClientService);

    async search(query: string, limit = 20): Promise<SearchResult[]> {
        const response = await this.httpClient.get<
            { type: string; id: string; title: string; subtitle: string | null; route: string }[]
        >('/search', { params: { q: query, limit } });
        return response.data?.map(mapApiSearchResult) ?? [];
    }
}
