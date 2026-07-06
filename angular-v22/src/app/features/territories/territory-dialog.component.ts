/**
 * Territory Dialog
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Territory } from '@models/enterprise.model';
import { PermissionService, TerritoryService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    ButtonComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface TerritoryDialogData {
    territoryId?: string;
}

export type TerritoryDialogResult = 'saved' | 'deleted' | 'updated';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-territory-dialog',
    host: { class: 'contents' },
    imports: [
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        TextareaComponent,
    ],
    template: `
        <app-dialog
            [title]="data.territoryId ? 'Territory details' : 'New territory'"
            description="Define sales territories and routing rules."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="territory-name" label="Name" formControlName="name" [required]="true" />
                    <app-textarea
                        id="territory-rules"
                        label="Rules (JSON)"
                        formControlName="rulesJson"
                        placeholder='{"regions":["US-West"]}'
                    />
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (territory()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteTerritory()"
                    >
                        Delete
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save territory
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class TerritoryDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly territoryService = inject(TerritoryService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<TerritoryDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<TerritoryDialogResult>);

    readonly territory = signal<Territory | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        rulesJson: ['{}'],
    });

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.territoryId) {
                const item = await this.territoryService.getById(this.data.territoryId);
                this.territory.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        rulesJson: '{}',
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load territory');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            let rules: Record<string, unknown> = {};
            try {
                rules = JSON.parse(raw.rulesJson || '{}') as Record<string, unknown>;
            } catch {
                this.toastService.error('Rules must be valid JSON');
                return;
            }

            const payload = { name: raw.name, rules };

            if (this.territory()?.id) {
                await this.territoryService.update(this.territory()!.id, payload);
                this.toastService.success('Territory updated');
                this.dialogRef.close('updated');
            } else {
                await this.territoryService.create(payload);
                this.toastService.success('Territory created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save territory');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteTerritory(): Promise<void> {
        const id = this.territory()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.territoryService.delete(id);
            this.toastService.success('Territory deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete territory');
        } finally {
            this.submitting.set(false);
        }
    }
}
