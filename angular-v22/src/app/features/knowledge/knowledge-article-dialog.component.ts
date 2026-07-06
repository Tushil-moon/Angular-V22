/**
 * Knowledge Article Dialog — edit, publish, preview metadata
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { KnowledgeArticle } from '@models/enterprise.model';
import { KnowledgeService, PermissionService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';

export interface KnowledgeArticleDialogData {
    articleId?: string;
}

export type KnowledgeArticleDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-knowledge-article-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
        BadgeComponent,
    ],
    template: `
        <app-dialog
            [title]="data.articleId ? 'Edit article' : 'New article'"
            description="Create help-center content for customers and agents."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="article-title" label="Title" formControlName="title" [required]="true" />
                    <app-input id="article-category" label="Category" formControlName="category" />
                    <app-input id="article-slug" label="Slug" formControlName="slug" />
                    <app-textarea id="article-summary" label="Summary" formControlName="summary" />
                    <app-textarea id="article-body" label="Body" formControlName="body" [required]="true" />

                    @if (article(); as item) {
                        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                            <app-badge [variant]="item.published ? 'default' : 'secondary'">
                                {{ item.published ? 'Published' : 'Draft' }}
                            </app-badge>
                            @if (item.viewCount !== null && item.viewCount !== undefined) {
                                <span class="text-xs text-muted-foreground">{{ item.viewCount }} views</span>
                            }
                            @if (item.publishedAt) {
                                <span class="text-xs text-muted-foreground">
                                    Published {{ formatDate(item.publishedAt) }}
                                </span>
                            }
                        </div>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (article()?.id && canManage()) {
                    <app-button variant="destructive" type="button" [disabled]="submitting()" (clicked)="deleteArticle()">
                        Delete
                    </app-button>
                    @if (article()?.published) {
                        <app-button variant="outline" type="button" [disabled]="submitting()" (clicked)="unpublish()">
                            Unpublish
                        </app-button>
                    } @else {
                        <app-button variant="secondary" type="button" [disabled]="submitting()" (clicked)="publish()">
                            Publish
                        </app-button>
                    }
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save article
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class KnowledgeArticleDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly knowledgeService = inject(KnowledgeService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<KnowledgeArticleDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<KnowledgeArticleDialogResult>);

    readonly article = signal<KnowledgeArticle | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);
    readonly formatDate = formatEnterpriseDate;

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageActivities),
    );

    readonly form = this.fb.group({
        title: ['', Validators.required],
        category: [''],
        slug: [''],
        summary: [''],
        body: ['', Validators.required],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        if (!this.data.articleId) {
            this.loading.set(false);
            return;
        }

        this.loading.set(true);
        try {
            const item = await this.knowledgeService.getById(this.data.articleId);
            if (item) {
                this.article.set(item);
                this.form.patchValue({
                    title: item.title,
                    category: item.category ?? '',
                    slug: item.slug ?? '',
                    summary: item.summary ?? '',
                    body: item.body,
                });
                if (!this.canManage()) this.form.disable();
            }
        } catch {
            this.toastService.show({
                title: 'Load failed',
                description: 'Could not load article.',
                variant: 'destructive',
            });
        } finally {
            this.loading.set(false);
        }
    }

    private buildPayload(): Record<string, unknown> {
        const value = this.form.getRawValue();
        return {
            title: value.title,
            category: value.category || undefined,
            slug: value.slug || undefined,
            summary: value.summary || undefined,
            body: value.body,
        };
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        try {
            const payload = this.buildPayload();
            const saved = this.data.articleId
                ? await this.knowledgeService.update(this.data.articleId, payload)
                : await this.knowledgeService.create({ ...payload, published: false });

            if (saved) {
                this.toastService.success('Saved', 'Article saved.');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.show({
                title: 'Save failed',
                description: 'Could not save article.',
                variant: 'destructive',
            });
        } finally {
            this.submitting.set(false);
        }
    }

    async publish(): Promise<void> {
        const id = this.article()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.knowledgeService.publish(id);
            this.toastService.success('Published', 'Article is live.');
            this.dialogRef.close('updated');
        } finally {
            this.submitting.set(false);
        }
    }

    async unpublish(): Promise<void> {
        const id = this.article()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.knowledgeService.unpublish(id);
            this.toastService.success('Unpublished', 'Article moved to draft.');
            this.dialogRef.close('updated');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteArticle(): Promise<void> {
        const id = this.article()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.knowledgeService.delete(id);
            this.toastService.success('Deleted', 'Article removed.');
            this.dialogRef.close('deleted');
        } finally {
            this.submitting.set(false);
        }
    }
}
