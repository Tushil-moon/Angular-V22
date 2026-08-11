import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudList } from '../../shared/crud-api.util';
import type { AdminRole, ApiAdminRolePayload } from '../models/role.model';

export function mapApiAdminRole(p: ApiAdminRolePayload): AdminRole {
    return {
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        isActive: p.is_active ?? true,
        createdAt: p.created_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class AdminRoleApiService {
    private readonly http = inject(HttpClientService);

    list(filters: FilterOptions = {}): Observable<PaginatedResponse<AdminRole>> {
        return crudList(this.http, '/roles', mapApiAdminRole, filters);
    }

    create(name: string, description?: string): Observable<AdminRole | null> {
        return crudCreate(this.http, '/roles', { name, description }, mapApiAdminRole);
    }

    delete(id: string): Observable<void> {
        return crudDelete(this.http, `/roles/${id}`);
    }
}
