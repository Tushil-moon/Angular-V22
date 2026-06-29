import { inject, Injectable } from '@angular/core';
import { CrmTag } from '@models/index';
import { ApiTagPayload, mapApiTag } from '@utils/api-mappers';

import { HttpClientService } from './http-client.service';

@Injectable({ providedIn: 'root' })
export class TagService {
    private readonly httpClient = inject(HttpClientService);

    async listTags(search?: string): Promise<CrmTag[]> {
        const response = await this.httpClient.get<ApiTagPayload[]>('/tags', {
            params: search ? { search } : undefined,
        });
        return response.data?.map(mapApiTag) ?? [];
    }

    async createTag(name: string, color?: string): Promise<CrmTag | null> {
        const response = await this.httpClient.post<ApiTagPayload>('/tags', { name, color });
        return response.data ? mapApiTag(response.data) : null;
    }

    async updateTag(id: string, name?: string, color?: string): Promise<CrmTag | null> {
        const response = await this.httpClient.patch<ApiTagPayload>(`/tags/${id}`, { name, color });
        return response.data ? mapApiTag(response.data) : null;
    }

    async deleteTag(id: string): Promise<void> {
        await this.httpClient.delete(`/tags/${id}`);
    }
}
