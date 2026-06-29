import { inject, Injectable } from '@angular/core';
import { SavedView, SavedViewEntityType, SavedViewFilters } from '@models/index';
import { ApiSavedViewPayload, mapApiSavedView } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

export interface CreateSavedViewInput {
    entityType: SavedViewEntityType;
    name: string;
    filters: SavedViewFilters;
    isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SavedViewService {
    private readonly httpClient = inject(HttpClientService);

    async listSavedViews(entityType: SavedViewEntityType): Promise<SavedView[]> {
        const response = await this.httpClient.get<ApiSavedViewPayload[]>('/saved-views', {
            params: { entityType },
        });
        return response.data?.map(mapApiSavedView) ?? [];
    }

    async createSavedView(input: CreateSavedViewInput): Promise<SavedView | null> {
        const response = await this.httpClient.post<ApiSavedViewPayload>('/saved-views', input);
        return response.data ? mapApiSavedView(response.data) : null;
    }

    async deleteSavedView(id: string): Promise<void> {
        await this.httpClient.delete(`/saved-views/${id}`);
    }

    async updateSavedView(
        id: string,
        input: Partial<CreateSavedViewInput>,
    ): Promise<SavedView | null> {
        const response = await this.httpClient.patch<ApiSavedViewPayload>(
            `/saved-views/${id}`,
            input,
        );
        return response.data ? mapApiSavedView(response.data) : null;
    }
}
