/**
 * Supplier API — Observable client for /suppliers
 */

import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudGet, crudList, crudPatch } from '../../shared/crud-api.util';
import type {
    ApiSupplierPayload,
    CreateSupplierRequest,
    Supplier,
    UpdateSupplierRequest,
} from '../models/supplier.model';

export function mapApiSupplier(payload: ApiSupplierPayload): Supplier {
    return {
        id: payload.id,
        name: payload.name,
        code: payload.code ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        website: payload.website ?? null,
        contactName: payload.contact_name ?? null,
        notes: payload.notes ?? null,
        createdAt: payload.created_at ?? '',
        updatedAt: payload.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class SupplierApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<Supplier>> {
        return crudList(this.http, '/suppliers', mapApiSupplier, filters);
    }

    getById(id: string): Observable<Supplier | null> {
        return crudGet(this.http, `/suppliers/${id}`, mapApiSupplier);
    }

    create(payload: CreateSupplierRequest): Observable<Supplier | null> {
        return crudCreate(this.http, '/suppliers', payload, mapApiSupplier);
    }

    update(id: string, payload: UpdateSupplierRequest): Observable<Supplier | null> {
        return crudPatch(this.http, `/suppliers/${id}`, payload, mapApiSupplier);
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/suppliers/${id}`);
    }
}
