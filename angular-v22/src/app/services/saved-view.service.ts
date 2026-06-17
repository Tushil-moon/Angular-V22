import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { SavedView } from '@models/index';
import { mapApiSavedView } from '@utils/api-mappers';

@Injectable({ providedIn: 'root' })
export class SavedViewService {
  private readonly httpClient = inject(HttpClientService);

  async listViews(entityType: SavedView['entityType']): Promise<SavedView[]> {
    const response = await this.httpClient.get<
      Array<{
        id: string;
        user_id: string;
        entity_type: string;
        name: string;
        filters: Record<string, unknown>;
        sort?: Record<string, unknown> | null;
        columns?: string[] | null;
        is_default: boolean;
        created_at?: string;
        updated_at?: string;
      }>
    >('/saved-views', { params: { entityType } });
    return response.data?.map(mapApiSavedView) ?? [];
  }

  async createView(payload: Record<string, unknown>): Promise<SavedView | null> {
    const response = await this.httpClient.post<Parameters<typeof mapApiSavedView>[0]>(
      '/saved-views',
      payload,
    );
    return response.data ? mapApiSavedView(response.data) : null;
  }

  async deleteView(id: string): Promise<void> {
    await this.httpClient.delete(`/saved-views/${id}`);
  }
}
