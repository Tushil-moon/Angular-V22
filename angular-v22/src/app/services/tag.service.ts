import { Injectable, inject } from '@angular/core';
import { HttpClientService } from './http-client.service';
import { CrmTag } from '@models/index';
import { mapApiTag, ApiTagPayload } from '@utils/api-mappers';

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
}
