import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { toNumber } from '../../shared/format.util';
import { crudCreate, crudGet, crudList, crudPatch, noopDelete } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type {
    ApiGiftCardPayload,
    CreateGiftCardRequest,
    GiftCard,
    GiftCardStatus,
} from '../models/gift-card.model';

export function mapApiGiftCard(payload: ApiGiftCardPayload): GiftCard {
    return {
        id: payload.id,
        code: payload.code,
        initialBalance: toNumber(payload.initial_balance),
        balance: toNumber(payload.balance),
        currencyCode: payload.currency_code ?? 'USD',
        status: (payload.status as GiftCardStatus) ?? 'ACTIVE',
        expiresAt: payload.expires_at ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class GiftCardApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<GiftCard>> {
        return crudList(this.http, '/gift-cards', mapApiGiftCard, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    getById(id: string): Observable<GiftCard | null> {
        return crudGet(this.http, `/gift-cards/${id}`, mapApiGiftCard);
    }

    create(payload: CreateGiftCardRequest): Observable<GiftCard | null> {
        return crudCreate(this.http, '/gift-cards', payload, mapApiGiftCard);
    }

    update(id: string, payload: Partial<CreateGiftCardRequest>): Observable<GiftCard | null> {
        return crudPatch(this.http, `/gift-cards/${id}`, payload, mapApiGiftCard);
    }

    delete = noopDelete;
}
