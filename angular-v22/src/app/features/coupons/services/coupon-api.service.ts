/**
 * Coupon API — Observable client for /coupons
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { buildListParams, readFilter } from '../../shared/list-params.util';
import type {
    ApiCouponPayload,
    Coupon,
    CouponListFilters,
    CouponStatus,
    CreateCouponRequest,
} from '../models/coupon.model';

export function mapApiCoupon(payload: ApiCouponPayload): Coupon {
    return {
        id: payload.id,
        code: payload.code,
        promotionId: payload.promotion_id ?? null,
        status: (payload.status as CouponStatus) ?? 'ACTIVE',
        usageLimit: payload.usage_limit ?? null,
        usageCount: payload.usage_count ?? 0,
        perCustomerLimit: payload.per_customer_limit ?? null,
        startsAt: payload.starts_at ?? null,
        endsAt: payload.ends_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class CouponApiService {
    private readonly http = inject(HttpClientService);

    list(filters: CouponListFilters = {}): Observable<PaginatedResponse<Coupon>> {
        const params = buildListParams(filters, { status: filters.status || undefined });

        return this.http
            .get<ApiPaginatedPayload<ApiCouponPayload>>('/coupons', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiCoupon)));
    }

    listForShell(filters: FilterOptions): Observable<PaginatedResponse<Coupon>> {
        return this.list({
            page: filters.page,
            pageSize: filters.pageSize,
            search: filters.search,
            status: readFilter(filters, 'status') as CouponStatus | undefined,
        });
    }

    create(payload: CreateCouponRequest): Observable<Coupon | null> {
        return this.http
            .post<ApiCouponPayload>('/coupons', {
                code: payload.code,
                status: payload.status ?? 'ACTIVE',
            })
            .pipe(map((response) => (response.data ? mapApiCoupon(response.data) : null)));
    }

    delete(id: string): Observable<void> {
        return this.http.delete(`/coupons/${id}`).pipe(map(() => undefined));
    }
}
