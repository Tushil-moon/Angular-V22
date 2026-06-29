/**
 * Sticky notes board — colored cards with rich text previews
 */

import { Component, computed, inject, resource, signal, ViewEncapsulation } from '@angular/core';
import type { StickyNote } from '@models/sticky-note.model';
import { AuthService, DialogService, PermissionService, StickyNoteService } from '@services/index';
import { ButtonComponent } from '@shared/components/button.component';
import { IconComponent } from '@shared/components/icon.component';
import { SearchInputComponent } from '@shared/components/search-input.component';
import { SkeletonComponent } from '@shared/components/skeleton.component';
import { Permissions } from '@shared/constants/permissions';
import { throwIfAborted } from '@shared/utils/abort-signal';
import { runResourceLoader } from '@shared/utils/resource-error';
import { richTextToPlainText, truncatePlainText } from '@utils/rich-text.util';

import {
    StickyNoteEditorDialogData,
    StickyNoteEditorDialogResult,
} from './sticky-note-editor-dialog.component';

@Component({
    selector: 'app-sticky-notes-board',
    imports: [ButtonComponent, IconComponent, SearchInputComponent, SkeletonComponent],
    template: `
        <div class="page-shell sticky-notes-page">
            <div class="page-toolbar">
                <div class="page-header">
                    <h1 class="page-title">Sticky notes</h1>
                    <p class="page-description">
                        Capture ideas with rich text — pinned notes stay at the top.
                    </p>
                </div>
                <div class="toolbar-actions">
                    <app-search-input
                        placeholder="Search notes..."
                        [initialValue]="searchQuery()"
                        (searchChange)="onSearch($event)"
                    />
                    @if (canManage()) {
                        <app-button size="sm" (clicked)="openEditor()">
                            <app-icon name="plus" [size]="14" />
                            New note
                        </app-button>
                    }
                </div>
            </div>

            @if (loadError()) {
                <p class="text-sm text-destructive">{{ loadError() }}</p>
            }

            @if (isLoading()) {
                <div class="sticky-notes-grid">
                    @for (_ of skeletonItems; track $index) {
                        <app-skeleton className="h-44 w-full rounded-xl" />
                    }
                </div>
            } @else if (notes().length === 0) {
                <div class="sticky-notes-empty">
                    <div class="sticky-notes-empty-icon">
                        <app-icon name="sticky-note" [size]="28" className="text-muted-foreground" />
                    </div>
                    <p class="text-lg font-semibold">No notes yet</p>
                    <p class="text-sm text-muted-foreground">
                        Create your first sticky note with bold, lists, links, and more.
                    </p>
                    @if (canManage()) {
                        <app-button size="sm" class="mt-4" (clicked)="openEditor()">
                            <app-icon name="plus" [size]="14" />
                            Create note
                        </app-button>
                    }
                </div>
            } @else {
                <div class="sticky-notes-grid">
                    @for (note of notes(); track note.id) {
                        <article
                            class="sticky-note-card"
                            [style.background]="note.color"
                            [class.sticky-note-pinned]="note.isPinned"
                            tabindex="0"
                            role="button"
                            (click)="openEditor(note)"
                            (keydown.enter)="openEditor(note)"
                        >
                            <div class="sticky-note-fold" aria-hidden="true"></div>
                            @if (note.isPinned) {
                                <app-icon
                                    name="pin"
                                    [size]="14"
                                    className="sticky-note-pin-icon"
                                />
                            }
                            <h2 class="sticky-note-title">
                                {{ note.title?.trim() || 'Untitled note' }}
                            </h2>
                            <div class="sticky-note-preview">
                                {{ preview(note) }}
                            </div>
                            <p class="sticky-note-meta">{{ formatDate(note.updatedAt) }}</p>
                        </article>
                    }
                </div>
            }
        </div>
    `,
    styleUrl: './sticky-notes-board.component.scss',
    encapsulation: ViewEncapsulation.None,
})
export class StickyNotesBoardComponent {
    private readonly authService = inject(AuthService);
    private readonly stickyNoteService = inject(StickyNoteService);
    private readonly dialogService = inject(DialogService);
    private readonly permissionService = inject(PermissionService);

    readonly skeletonItems = Array.from({ length: 6 }, (_, i) => i);
    readonly searchQuery = signal('');

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly notesResource = resource({
        params: () => {
            if (!this.authService.isAuthenticated()) return undefined;
            return { search: this.searchQuery().trim() || undefined };
        },
        loader: async ({ params, abortSignal }) => {
            if (!params) return [] as StickyNote[];

            return runResourceLoader(
                async () => {
                    throwIfAborted(abortSignal);
                    const result = await this.stickyNoteService.list({
                        search: params.search,
                        pageSize: 100,
                    });
                    return result.data;
                },
                { fallback: [], logMessage: 'Failed to load sticky notes:' },
            );
        },
    });

    readonly notes = computed(() => this.notesResource.value() ?? []);
    readonly isLoading = computed(() => this.notesResource.isLoading());
    readonly loadError = computed(() => this.notesResource.error()?.message ?? null);

    onSearch(query: string): void {
        this.searchQuery.set(query);
    }

    preview(note: StickyNote): string {
        const plain = richTextToPlainText(note.content);
        return truncatePlainText(plain || 'Empty note', 160);
    }

    formatDate(value?: string): string {
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
    }

    async openEditor(note?: StickyNote): Promise<void> {
        if (!note && !this.canManage()) return;

        const ref = await this.dialogService.openLazy<
            import('./sticky-note-editor-dialog.component').StickyNoteEditorDialogComponent,
            StickyNoteEditorDialogData,
            StickyNoteEditorDialogResult
        >(
            () =>
                import('./sticky-note-editor-dialog.component').then(
                    (m) => m.StickyNoteEditorDialogComponent,
                ),
            { data: { note } },
        );

        ref.afterClosed().subscribe((result) => {
            if (result) this.notesResource.reload();
        });
    }
}
