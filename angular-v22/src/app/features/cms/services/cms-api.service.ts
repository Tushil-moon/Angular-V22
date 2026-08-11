import { inject, Injectable } from '@angular/core';
import type { FilterOptions, PaginatedResponse } from '@models/index';
import { HttpClientService } from '@services/http-client.service';
import type { Observable } from 'rxjs';

import { crudCreate, crudDelete, crudList } from '../../shared/crud-api.util';
import { readFilter } from '../../shared/list-params.util';
import type {
    ApiCmsBannerPayload,
    ApiCmsMenuPayload,
    ApiCmsPagePayload,
    CmsBanner,
    CmsMenu,
    CmsPage,
    CmsPageStatus,
} from '../models/cms.model';

export function mapApiCmsPage(p: ApiCmsPagePayload): CmsPage {
    return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: (p.status as CmsPageStatus) ?? 'DRAFT',
        createdAt: p.created_at ?? '',
        updatedAt: p.updated_at ?? '',
    };
}

export function mapApiCmsBanner(p: ApiCmsBannerPayload): CmsBanner {
    return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle ?? null,
        enabled: Boolean(p.enabled),
        position: p.position ?? null,
        sortOrder: p.sort_order ?? 0,
        createdAt: p.created_at ?? '',
    };
}

export function mapApiCmsMenu(p: ApiCmsMenuPayload): CmsMenu {
    return {
        id: p.id,
        name: p.name,
        handle: p.handle,
        createdAt: p.created_at ?? '',
        updatedAt: p.updated_at ?? '',
    };
}

@Injectable({ providedIn: 'root' })
export class CmsApiService {
    private readonly http = inject(HttpClientService);

    listPages(filters: FilterOptions = {}): Observable<PaginatedResponse<CmsPage>> {
        return crudList(this.http, '/cms/pages', mapApiCmsPage, filters, {
            status: readFilter(filters, 'status'),
        });
    }

    createPage(body: { title: string; slug: string }): Observable<CmsPage | null> {
        return crudCreate(this.http, '/cms/pages', { ...body, status: 'DRAFT' }, mapApiCmsPage);
    }

    deletePage(id: string): Observable<void> {
        return crudDelete(this.http, `/cms/pages/${id}`);
    }

    listBanners(filters: FilterOptions = {}): Observable<PaginatedResponse<CmsBanner>> {
        const enabledRaw = filters['enabled'];
        const enabled =
            enabledRaw === undefined
                ? undefined
                : enabledRaw === true || enabledRaw === 'true'
                  ? 'true'
                  : enabledRaw === false || enabledRaw === 'false'
                    ? 'false'
                    : undefined;
        return crudList(this.http, '/cms/banners', mapApiCmsBanner, filters, { enabled });
    }

    createBanner(body: { title: string }): Observable<CmsBanner | null> {
        return crudCreate(this.http, '/cms/banners', { ...body, enabled: true }, mapApiCmsBanner);
    }

    deleteBanner(id: string): Observable<void> {
        return crudDelete(this.http, `/cms/banners/${id}`);
    }

    listMenus(filters: FilterOptions = {}): Observable<PaginatedResponse<CmsMenu>> {
        return crudList(this.http, '/cms/menus', mapApiCmsMenu, filters);
    }

    createMenu(body: { name: string; handle: string }): Observable<CmsMenu | null> {
        return crudCreate(this.http, '/cms/menus', body, mapApiCmsMenu);
    }

    deleteMenu(id: string): Observable<void> {
        return crudDelete(this.http, `/cms/menus/${id}`);
    }
}
