/**
 * Dashboard Layout Dialog — widget builder with report picker
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { DashboardLayout, Report } from '@models/enterprise.model';
import { PermissionService, ReportService } from '@services/index';
import { ToastService } from '@services/toast.service';
import {
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    DialogComponent,
    InputComponent,
    LoaderComponent,
    SelectComponent,
    SelectOption,
    TextareaComponent,
} from '@shared/components';
import { Permissions } from '@shared/constants/permissions';
import { DIALOG_DATA, DialogRef } from '@shared/dialog';

export interface DashboardLayoutDialogData {
    layoutId?: string;
}

export type DashboardLayoutDialogResult = 'saved' | 'deleted' | 'updated';

interface LayoutWidget {
    id: string;
    type: string;
    title: string;
    reportId: string;
}

const WIDGET_TYPE_OPTIONS: SelectOption[] = [
    { value: 'kpi', label: 'KPI' },
    { value: 'chart', label: 'Chart' },
    { value: 'table', label: 'Table' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-layout-dialog',
    host: { class: 'contents' },
    imports: [
        FormsModule,
        ReactiveFormsModule,
        DialogComponent,
        ButtonComponent,
        LoaderComponent,
        InputComponent,
        SelectComponent,
        TextareaComponent,
        BadgeComponent,
        CheckboxComponent,
    ],
    template: `
        <app-dialog
            [title]="data.layoutId ? 'Dashboard layout' : 'New dashboard layout'"
            description="Arrange widgets linked to saved reports."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <app-input id="layout-name" label="Name" formControlName="name" [required]="true" />
                    <app-textarea id="layout-description" label="Description" formControlName="description" />

                    <div class="flex flex-wrap gap-4">
                        <app-checkbox id="layout-default" label="Default layout" formControlName="isDefault" />
                        <app-checkbox id="layout-shared" label="Share with organization" formControlName="isShared" />
                    </div>

                    <div class="space-y-3 border-t border-border pt-4">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-medium">Widgets</p>
                            @if (canManage()) {
                                <app-button variant="outline" size="sm" type="button" (clicked)="addWidget()">
                                    Add widget
                                </app-button>
                            }
                        </div>

                        @for (widget of widgets(); track widget.id) {
                            <div class="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                                <app-input
                                    [id]="'widget-title-' + widget.id"
                                    label="Title"
                                    [ngModel]="widget.title"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateWidget(widget.id, 'title', $event)"
                                />
                                <app-select
                                    [id]="'widget-type-' + widget.id"
                                    label="Type"
                                    [options]="widgetTypeOptions"
                                    [ngModel]="widget.type"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateWidget(widget.id, 'type', $event)"
                                />
                                <app-select
                                    [id]="'widget-report-' + widget.id"
                                    label="Report"
                                    [options]="reportOptions()"
                                    [ngModel]="widget.reportId"
                                    [ngModelOptions]="{ standalone: true }"
                                    (ngModelChange)="updateWidget(widget.id, 'reportId', $event)"
                                />
                                @if (canManage()) {
                                    <div class="flex items-end">
                                        <app-button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            (clicked)="removeWidget(widget.id)"
                                        >
                                            Remove
                                        </app-button>
                                    </div>
                                }
                            </div>
                        }

                        @if (widgets().length === 0) {
                            <p class="text-sm text-muted-foreground">No widgets yet. Add one to build your dashboard.</p>
                        }
                    </div>

                    @if (layout(); as item) {
                        <app-badge variant="secondary">{{ widgets().length }} widgets</app-badge>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (layout()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteLayout()"
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
                            Save layout
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class DashboardLayoutDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly reportService = inject(ReportService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<DashboardLayoutDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<DashboardLayoutDialogResult>);

    readonly widgetTypeOptions = WIDGET_TYPE_OPTIONS;

    readonly layout = signal<DashboardLayout | null>(null);
    readonly reports = signal<Report[]>([]);
    readonly widgets = signal<LayoutWidget[]>([]);
    readonly loading = signal(true);
    readonly submitting = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly reportOptions = computed((): SelectOption[] =>
        this.reports().map((report) => ({ value: report.id, label: report.name })),
    );

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        isDefault: [false],
        isShared: [false],
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
            const reportsPage = await this.reportService.listReports({ pageSize: 100 });
            this.reports.set(reportsPage.data);

            if (this.data.layoutId) {
                const item = await this.reportService.getLayout(this.data.layoutId);
                this.layout.set(item);
                if (item) {
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        isDefault: item.isDefault ?? false,
                        isShared: item.isShared ?? false,
                    });
                    this.widgets.set(this.parseWidgets(item.widgets ?? []));
                }
            }
        } catch {
            this.toastService.error('Failed to load layout');
        } finally {
            this.loading.set(false);
        }
    }

    addWidget(): void {
        this.widgets.update((items) => [
            ...items,
            {
                id: crypto.randomUUID(),
                type: 'kpi',
                title: 'New widget',
                reportId: this.reports()[0]?.id ?? '',
            },
        ]);
    }

    removeWidget(id: string): void {
        this.widgets.update((items) => items.filter((widget) => widget.id !== id));
    }

    updateWidget(id: string, field: keyof LayoutWidget, value: string): void {
        this.widgets.update((items) =>
            items.map((widget) => (widget.id === id ? { ...widget, [field]: value } : widget)),
        );
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload = {
                name: raw.name,
                description: raw.description || undefined,
                isDefault: raw.isDefault,
                isShared: raw.isShared,
                widgets: this.widgets().map(({ id, type, title, reportId }) => ({
                    id,
                    type,
                    title,
                    reportId: reportId || undefined,
                })),
            };

            if (this.layout()?.id) {
                await this.reportService.updateLayout(this.layout()!.id, payload);
                this.toastService.success('Layout updated');
                this.dialogRef.close('updated');
            } else {
                await this.reportService.createLayout(payload);
                this.toastService.success('Layout created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save layout');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteLayout(): Promise<void> {
        const id = this.layout()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.reportService.deleteLayout(id);
            this.toastService.success('Layout deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete layout');
        } finally {
            this.submitting.set(false);
        }
    }

    private parseWidgets(raw: Record<string, unknown>[]): LayoutWidget[] {
        return raw.map((widget) => ({
            id: this.widgetField(widget, 'id', crypto.randomUUID()),
            type: this.widgetField(widget, 'type', 'kpi'),
            title: this.widgetField(widget, 'title', 'Widget'),
            reportId: this.widgetField(widget, 'reportId', '') || this.widgetField(widget, 'report_id', ''),
        }));
    }

    private widgetField(widget: Record<string, unknown>, key: string, fallback: string): string {
        const value = widget[key];
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        return fallback;
    }
}
