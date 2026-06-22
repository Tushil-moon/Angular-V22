/**
 * Contacts List Page
 */

import { Component, computed, inject, resource, signal } from '@angular/core';
import { Contact, FilterOptions } from '@models/index';
import { AuthService, ContactService, DialogService, PermissionService } from '@services/index';
import {
    ButtonComponent,
    CardBodyComponent,
    CardComponent,
    CardDescriptionComponent,
    CardHeaderComponent,
    CardTitleComponent,
    FlexTableCellComponent,
    FlexTableComponent,
    FlexTableRowComponent,
    IconComponent,
    SearchInputComponent,
} from '@shared/components';
import { TagBadgesComponent } from '@shared/components/tag-badges.component';
import {
    CONTACT_TABLE_COLUMNS,
    contactStatusBadgeClass,
    formatContactStatus,
} from '@shared/config/contacts-table.config';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { asOptionalString } from '@utils/form-display.util';

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
        TagBadgesComponent,
    ],
    template: `
        <div class="page-shell page-shell-fill">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Contacts</h1>
                    <p class="page-description">Manage leads, prospects, and customers</p>
                </div>
                @if (canManage()) {
                    <app-button size="sm" (clicked)="openCreateDialog()">
                        <app-icon name="plus" [size]="14" />
                        Add contact
                    </app-button>
                }
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            <app-card [fill]="true">
                <app-card-header [row]="true">
                    <div class="min-w-0 space-y-1">
                        <app-card-title>All contacts</app-card-title>
                        <app-card-description
                            >{{ totalContacts() }} total contacts</app-card-description
                        >
                    </div>
                    <div class="card-toolbar">
                        <app-search-input
                            placeholder="Search contacts..."
                            [initialValue]="searchQuery()"
                            (searchChange)="onSearch($event)"
                        />
                    </div>
                </app-card-header>

                <app-card-body [flush]="true" [fill]="true">
                    <app-flex-table
                        [columns]="columns"
                        [fill]="true"
                        [loading]="isLoading()"
                        [empty]="!isLoading() && contacts().length === 0"
                        emptyTitle="No contacts found"
                        emptyDescription="Try adjusting your search or add a new contact."
                        [flush]="true"
                        [skeletonRowCount]="5"
                    >
                        @for (contact of contacts(); track contact.id) {
                            <app-flex-table-row
                                [interactive]="true"
                                (click)="openDetailDialog(contact)"
                            >
                                <app-flex-table-cell column="name">
                                    <div class="min-w-0 space-y-1">
                                        <p class="truncate font-medium text-foreground">
                                            {{ contact.fullName }}
                                        </p>
                                        @if (contact.jobTitle) {
                                            <p class="truncate text-xs text-muted-foreground">
                                                {{ contact.jobTitle }}
                                            </p>
                                        }
                                        @if (contact.tags?.length) {
                                            <app-tag-badges [tags]="contact.tags" />
                                        }
                                    </div>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="company">
                                    <span class="truncate text-muted-foreground">{{
                                        contact.companyRef?.name || contact.company || '—'
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="email">
                                    <span class="truncate text-muted-foreground">{{
                                        contact.email || '—'
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="status">
                                    <span [class]="statusBadgeClass(contact.status)">
                                        {{ formatStatus(contact.status) }}
                                    </span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="deals">
                                    <span class="tabular-nums text-muted-foreground">{{
                                        contact.dealCount ?? 0
                                    }}</span>
                                </app-flex-table-cell>
                                <app-flex-table-cell column="actions">
                                    <app-button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        (clicked)="openDetailDialog(contact, $event)"
                                    >
                                        <span class="sr-only">View contact</span>
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
export class ContactsListComponent {
    private readonly authService = inject(AuthService);
    private readonly contactService = inject(ContactService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageContacts),
    );

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
                search: this.searchQuery().trim() || undefined,
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
                        search: asOptionalString(params.search),
                    };
                    const result = await this.contactService.listContacts(filters);
                    throwIfAborted(abortSignal);
                    return {
                        contacts: result.data,
                        total: result.total,
                    } satisfies ContactsPageResult;
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
        >(() =>
            import('./contact-create-dialog.component').then((m) => m.ContactCreateDialogComponent),
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'created') this.contactsResource.reload();
        });
    }

    async openDetailDialog(contact: Contact, event?: MouseEvent): Promise<void> {
        event?.stopPropagation();

        const ref = await this.dialogService.openLazy<
            import('./contact-detail-dialog.component').ContactDetailDialogComponent,
            ContactDetailDialogData,
            ContactDetailDialogResult
        >(
            () =>
                import('./contact-detail-dialog.component').then(
                    (m) => m.ContactDetailDialogComponent,
                ),
            { data: { contactId: contact.id } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result === 'deleted' || result === 'updated')
                this.contactsResource.reload();
        });
    }
}
