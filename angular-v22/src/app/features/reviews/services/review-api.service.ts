/**
 * Review API — Observable client for /reviews
 */

import { inject, Injectable } from '@angular/core';
import type { PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import { type ApiPaginatedPayload, mapApiPaginated } from '@utils/api-mappers';
import { map, Observable } from 'rxjs';

import { buildListParams } from '../../shared/list-params.util';
import type {
    ApiReviewPayload,
    Review,
    ReviewListFilters,
    ReviewStatus,
} from '../models/review.model';

export function mapApiReview(payload: ApiReviewPayload): Review {
    return {
        id: payload.id,
        productId: payload.product_id ?? null,
        productName: payload.product?.name ?? null,
        rating: payload.rating ?? 0,
        title: payload.title ?? null,
        body: payload.body ?? null,
        status: (payload.status as ReviewStatus) ?? 'PENDING',
        isVerifiedPurchase: Boolean(payload.is_verified_purchase),
        adminReply: payload.admin_reply ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({
    providedIn: 'root',
})
export class ReviewApiService {
    private readonly http = inject(HttpClientService);

    list(filters: ReviewListFilters = {}): Observable<PaginatedResponse<Review>> {
        const params = buildListParams(filters, { status: filters.status || undefined });

        return this.http
            .get<ApiPaginatedPayload<ApiReviewPayload>>('/reviews', { params })
            .pipe(map((response) => mapApiPaginated(response.data, mapApiReview)));
    }

    updateStatus(id: string, status: ReviewStatus): Observable<Review | null> {
        return this.http
            .patch<ApiReviewPayload>(`/reviews/${id}`, { status })
            .pipe(map((response) => (response.data ? mapApiReview(response.data) : null)));
    }
}
