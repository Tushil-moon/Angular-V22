/**
 * Contacts List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService, ContactService, DialogService } from '@services/index';
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
import {
  CONTACT_TABLE_COLUMNS,
  contactStatusBadgeClass,
  formatContactStatus,
} from '@shared/config/contacts-table.config';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { Contact, FilterOptions } from '@models/index';
import { ContactCreateDialogResult } from './contact-create-dialog.component';
import {
  ContactDetailDialogData,
  ContactDetailDialogResult,
} from './contact-detail-dialog.component';

interface ContactsPageResult {
  contacts: Contact[];
  total: number;
}

const EMPTY_PAGE: ContactsPageResult = { contacts: [], total: 0 };

@Component({
  selector: 'app-contacts-list',
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
          <h1 class="page-title">Contacts</h1>
          <p class="page-description">Manage leads, prospects, and customers</p>
        </div>
        <app-button class="w-full sm:w-auto" size="sm" (clicked)="openCreateDialog()">
          <app-icon name="plus" [size]="14" />
          Add contact
        </app-button>
      </div>

      @if (loadError()) {
        <p class="text-sm text-destructive">{{ loadError() }}</p>
      }

      <app-card>
        <app-card-header [row]="true">
          <div class="min-w-0 space-y-1">
            <app-card-title>All contacts</app-card-title>
            <app-card-description>{{ totalContacts() }} total contacts</app-card-description>
          </div>
          <app-search-input
            class="w-full sm:max-w-xs"
            placeholder="Search contacts..."
            [initialValue]="searchQuery()"
            (searchChange)="onSearch($event)"
          />
        </app-card-header>

        <app-card-body [flush]="true">
          <app-flex-table
            [columns]="columns"
            [loading]="isLoading()"
            [empty]="!isLoading() && contacts().length === 0"
            emptyTitle="No contacts found"
            emptyDescription="Try adjusting your search or add a new contact."
            [flush]="true"
            [skeletonRowCount]="5"
          >
            @for (contact of contacts(); track contact.id) {
              <app-flex-table-row [interactive]="true" (click)="openDetailDialog(contact)">
                <app-flex-table-cell column="name">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-foreground">{{ contact.fullName }}</p>
                    @if (contact.jobTitle) {
                      <p class="truncate text-xs text-muted-foreground">{{ contact.jobTitle }}</p>
                    }
                  </div>
                </app-flex-table-cell>
                <app-flex-table-cell column="company">
                  <span class="truncate text-muted-foreground">{{ contact.company || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="email">
                  <span class="truncate text-muted-foreground">{{ contact.email || '—' }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="status">
                  <span [class]="statusBadgeClass(contact.status)">
                    {{ formatStatus(contact.status) }}
                  </span>
                </app-flex-table-cell>
                <app-flex-table-cell column="deals">
                  <span class="text-muted-foreground">{{ contact.dealCount ?? 0 }}</span>
                </app-flex-table-cell>
                <app-flex-table-cell column="actions">
                  <app-button
                    variant="ghost"
                    size="sm"
                    type="button"
                    (clicked)="openDetailDialog(contact, $event)"
                  >
                    <app-icon name="eye" [size]="14" />
                    <span class="hidden sm:inline">View</span>
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
export class ContactsListComponent {
  private readonly authService = inject(AuthService);
  private readonly contactService = inject(ContactService);
  private readonly dialogService = inject(DialogService);

  readonly columns = CONTACT_TABLE_COLUMNS;
  readonly statusBadgeClass = contactStatusBadgeClass;
  readonly formatStatus = formatContactStatus;

  searchQuery = signal('');
  currentPage = signal(1);
  pageSize = signal(10);

  readonly contactsResource = resource({
    params: () => {
      if (!this.authService.isAuthenticated()) return undefined;
      return {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        search: this.searchQuery().trim(),
      };
    },
    loader: async ({ params, abortSignal }) => {
      if (!params) return EMPTY_PAGE;

      return runResourceLoader(
        async () => {
          throwIfAborted(abortSignal);
          const filters: FilterOptions = {
            page: params.page,
            pageSize: params.pageSize,
            search: params.search || undefined,
          };
          const result = await this.contactService.listContacts(filters);
          throwIfAborted(abortSignal);
          return { contacts: result.data, total: result.total } satisfies ContactsPageResult;
        },
        { fallback: EMPTY_PAGE, logMessage: 'Failed to fetch contacts:' },
      );
    },
  });

  readonly contacts = computed(() => this.contactsResource.value()?.contacts ?? []);
  readonly totalContacts = computed(() => this.contactsResource.value()?.total ?? 0);
  readonly isLoading = computed(() => this.contactsResource.isLoading());
  readonly loadError = computed(() => this.contactsResource.error()?.message ?? null);

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  async openCreateDialog(): Promise<void> {
    const ref = await this.dialogService.openLazy<
      import('./contact-create-dialog.component').ContactCreateDialogComponent,
      undefined,
      ContactCreateDialogResult
    >(() => import('./contact-create-dialog.component').then((m) => m.ContactCreateDialogComponent));

    ref.afterClosed().subscribe((result) => {
      if (result === 'created') void this.contactsResource.reload();
    });
  }

  async openDetailDialog(contact: Contact, event?: MouseEvent): Promise<void> {
    event?.stopPropagation();

    const ref = await this.dialogService.openLazy<
      import('./contact-detail-dialog.component').ContactDetailDialogComponent,
      ContactDetailDialogData,
      ContactDetailDialogResult
    >(
      () => import('./contact-detail-dialog.component').then((m) => m.ContactDetailDialogComponent),
      { data: { contactId: contact.id } },
    );

    ref.afterClosed().subscribe((result) => {
      if (result === 'deleted' || result === 'updated') void this.contactsResource.reload();
    });
  }
}
