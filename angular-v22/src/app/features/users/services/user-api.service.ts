import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudList } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type { AdminUser, ApiAdminUserPayload } from '../models/user.model';

export function mapApiAdminUser(p: ApiAdminUserPayload): AdminUser {
    return {
        id: p.id,
        email: p.email ?? '',
        status: p.status ?? 'ACTIVE',
        emailVerified: Boolean(p.email_verified),
        createdAt: p.created_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<AdminUser>> {
        return crudList(this.http, '/users', mapApiAdminUser, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    create(email: string, password: string): Observable<AdminUser | null> {
        return crudCreate(this.http, '/users', { email, password }, mapApiAdminUser);
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/users/${id}`);
    }
}
