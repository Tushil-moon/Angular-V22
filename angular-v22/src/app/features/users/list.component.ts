/**
 * Users List Page Component
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService, DialogService, PermissionService } from '@services/index';
import { HttpClientService } from '@services/http-client.service';
import {
  CardComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardDescriptionComponent,
  CardBodyComponent,
  ButtonComponent,
  IconComponent,
  SearchInputComponent,
  FlexTableComponent,
  FlexTableRowComponent,
  FlexTableCellComponent,
} from '@shared/components';
import { USER_TABLE_COLUMNS } from '@shared/config/users-table.config';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { UserCreateDialogResult } from './user-create-dialog.component';
import { UserDetailDialogData, UserDetailDialogResult } from './user-detail-dialog.component';
import { User, FilterOptions } from '@models/index';
import { Permissions } from '@shared/constants/permissions';
import { mapApiUser, mapApiPaginated, ApiUserPayload, ApiPaginatedPayload } from '@utils/api-mappers';
import { formatUserDate } from './user.utils';

interface UsersPageResult {
  users: User[];
  total: number;
}

const EMPTY_USERS_PAGE: UsersPageResult = { users: [], total: 0 };

@Component({
  selector: 'app-users-list',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardBodyComponent,
    ButtonComponent,
    IconComponent,
    SearchInputComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    FlexTableCellComponent,
  ],
  template: `
    <div class="page-shell">
      <div class="page-toolbar">
        <div class="page-header">
          <h1 class="page-title">Users</h1>
          <p class="page-description">Manage user accounts and permissions</p>
        </div>
        @if (canManage()) {
        <app-button class="w-full sm:w-auto" size="sm" (clicked)="openCreateDialog()">
          <app-icon name="plus" [size]="14" />
          Add user
        </app-button>
        }
      </div>

      @if (loadError()) {
        <p class="text-sm text-destructive">{{ loadError() }}</p>
      }

      <app-card>
        <app-card-header [row]="true">
          <div class="min-w-0 space-y-1">
            <app-card-title>All users</app-card-title>
            <app-card-description>{{ totalUsers() }} total users</app-card-description>
          </div>
          <div class="card-toolbar">
            <app-search-input
              placeholder="Search users..."
              [initialValue]="searchQuery()"
              (searchChange)="onSearch($event)"
            />
          </div>
        </app-card-header>

        <app-card-body [flush]="true">
          <app-flex-table
            [columns]="columns"
            [loading]="isLoading()"
            [empty]="!isLoading() && users().length === 0"
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search or add a new user."
            [flush]="true"
            [skeletonRowCount]="5"
          >
            @for (user of users(); track user.id) {
              <app-flex-table-row [interactive]="true" (click)="openDetailDialog(user)">
                <app-flex-table-cell column="email">
                  <span class="truncate font-medium text-foreground">{{ user.email || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="phone">
                  <span class="truncate text-muted-foreground">{{ user.phone || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="status">
                  <span [class]="user.isActive ? 'badge badge-success' : 'badge badge-danger'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </app-flex-table-cell>
                <app-flex-table-cell column="verified">
                  <span [class]="user.emailVerified ? 'badge badge-success' : 'badge badge-warning'">
                    {{ user.emailVerified ? 'Verified' : 'Pending' }}
                  </span>
                </app-flex-table-cell>
                <app-flex-table-cell column="createdAt">
                  <span class="truncate text-muted-foreground">{{
                    formatUserDate(user.createdAt)
                  }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="actions">
                  <app-button
                    variant="ghost"
                    size="icon"
                    type="button"
                    (clicked)="openDetailDialog(user, $event)"
                  >
                    <span class="sr-only">View user</span>
                    <app-icon name="eye" [size]="16" />
                  </app-button>
                </app-flex-table-cell>
              </app-flex-table-row>
            }
          </app-flex-table>
        </app-card-body>
      </app-card>
    </div>
  `,
})
export class UsersListComponent {
  private readonly authService = inject(AuthService);
  private readonly httpClient = inject(HttpClientService);
  private readonly dialogService = inject(DialogService);
  private readonly permissionService = inject(PermissionService);

  readonly canManage = computed(() => this.permissionService.hasPermission(Permissions.ManageUsers));

  readonly columns = USER_TABLE_COLUMNS;
  readonly formatUserDate = formatUserDate;

  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(10);

  readonly usersResource = resource({
    params: () => {
      if (!this.authService.isAuthenticated()) {
        return undefined;
      }

      return {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        search: this.searchQuery().trim(),
      };
    },
    loader: async ({ params, abortSignal }) => {
      if (!params) {
        return EMPTY_USERS_PAGE;
      }

      return runResourceLoader(
        async () => {
          throwIfAborted(abortSignal);

          const filters: FilterOptions = {
            page: params.page,
            pageSize: params.pageSize,
            search: params.search || undefined,
          };

          const response = await this.httpClient.get<ApiPaginatedPayload<ApiUserPayload>>('/users', {
            params: filters,
          });

          throwIfAborted(abortSignal);

          if (!response.data) {
            return EMPTY_USERS_PAGE;
          }

          const page = mapApiPaginated(response.data, mapApiUser);

          return {
            users: page.data,
            total: page.total,
          } satisfies UsersPageResult;
        },
        {
          fallback: EMPTY_USERS_PAGE,
          logMessage: 'Failed to fetch users:',
        },
      );
    },
  });

  readonly users = computed(() => {
    if (!this.usersResource.hasValue()) {
      return [];
    }

    return this.usersResource.value()?.users ?? [];
  });

  readonly totalUsers = computed(() => {
    if (!this.usersResource.hasValue()) {
      return 0;
    }

    return this.usersResource.value()?.total ?? 0;
  });

  readonly isLoading = computed(() => this.usersResource.isLoading());

  readonly loadError = computed(() => {
    const error = this.usersResource.error();
    return error?.message ?? null;
  });

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  async openCreateDialog(): Promise<void> {
    const ref = await this.dialogService.openLazy<
      import('./user-create-dialog.component').UserCreateDialogComponent,
      undefined,
      UserCreateDialogResult
    >(() => import('./user-create-dialog.component').then((m) => m.UserCreateDialogComponent));

    ref.afterClosed().subscribe((result) => {
      if (result === 'created') {
        void this.usersResource.reload();
      }
    });
  }

  async openDetailDialog(user: User, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();

    const ref = await this.dialogService.openLazy<
      import('./user-detail-dialog.component').UserDetailDialogComponent,
      UserDetailDialogData,
      UserDetailDialogResult
    >(
      () => import('./user-detail-dialog.component').then((m) => m.UserDetailDialogComponent),
      { data: { userId: user.id } },
    );

    ref.afterClosed().subscribe((result) => {
      if (result === 'deleted' || result === 'updated') {
        void this.usersResource.reload();
      }
    });
  }
}
