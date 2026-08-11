/**
 * Promotion API — Observable client for /promotions
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { buildListParams, readFilter } from '../../shared/list-params.util';
import type {
    ApiPromotionPayload,
    CreatePromotionRequest,
    Promotion,
    PromotionListFilters,
    PromotionType,
} from '../models/promotion.model';

export function mapApiPromotion(payload: ApiPromotionPayload): Promotion {
    return {
        id: payload.id,
        name: payload.name,
        code: payload.code ?? null,
        type: (payload.type as PromotionType) ?? 'PERCENTAGE',
        value: toNumber(payload.value),
        startsAt: payload.starts_at ?? null,
        endsAt: payload.ends_at ?? null,
        usageLimit: payload.usage_limit ?? null,
        usageCount: payload.usage_count ?? 0,
        minSubtotal: payload.min_subtotal == null ? null : toNumber(payload.min_subtotal),
        stackable: Boolean(payload.stackable),
        enabled: payload.enabled ?? true,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class PromotionApiService {
    private readonly http = inject(HttpClientService);

    list(filters: PromotionListFilters = {}): Observable<PaginatedResponse<Promotion>> {
        const params = buildListParams(filters, {
            type: filters.type || undefined,
            enabled: filters.enabled === undefined ? undefined : String(filters.enabled),
        });

        return this.http
            .get<ApiPaginatedPayload<ApiPromotionPayload>>('/promotions', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiPromotion)));
    }

    listForShell(filters: FilterOptions): Observable<PaginatedResponse<Promotion>> {
        const enabledRaw = filters['enabled'];
        const enabled =
            enabledRaw === undefined
                ? undefined
                : enabledRaw === true || enabledRaw === 'true'
                  ? true
                  : enabledRaw === false || enabledRaw === 'false'
                    ? false
                    : undefined;
        return this.list({
            page: filters.page,
            pageSize: filters.pageSize,
            search: filters.search,
            type: readFilter(filters, 'type') as PromotionType | undefined,
            enabled,
        });
    }

    create(payload: CreatePromotionRequest): Observable<Promotion | null> {
        return this.http
            .post<ApiPromotionPayload>('/promotions', {
                name: payload.name,
                code: payload.code,
                type: payload.type,
                value: payload.value,
                enabled: payload.enabled ?? true,
            })
            .pipe(map((response) => (response.data ? mapApiPromotion(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/promotions/${id}`).pipe(map(() => undefined));
    }
}
