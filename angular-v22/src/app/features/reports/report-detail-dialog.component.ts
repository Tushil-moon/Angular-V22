/**
 * Report Detail Dialog — entity config, preview run, CSV export, run history
 */

import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Report, ReportRun } from '@models/enterprise.model';
import { PermissionService, type ReportRunResult,ReportService } from '@services/index';
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

import { formatEnterpriseDate } from '../enterprise/enterprise-list.util';
import { formatEnterpriseStatus } from '../enterprise/enterprise-ui.util';

export interface ReportDetailDialogData {
    reportId?: string;
}

export type ReportDetailDialogResult = 'saved' | 'deleted' | 'updated';

const ENTITY_OPTIONS: SelectOption[] = [
    { value: 'deals', label: 'Deals' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'leads', label: 'Leads' },
    { value: 'cases', label: 'Cases' },
    { value: 'activities', label: 'Activities' },
    { value: 'campaigns', label: 'Campaigns' },
];

const CHART_OPTIONS: SelectOption[] = [
    { value: 'TABLE', label: 'Table' },
    { value: 'BAR', label: 'Bar chart' },
    { value: 'LINE', label: 'Line chart' },
    { value: 'PIE', label: 'Pie chart' },
    { value: 'KPI', label: 'KPI' },
];

const GROUP_BY_FIELDS: Record<string, SelectOption[]> = {
    deals: [{ value: 'stage', label: 'Stage' }],
    contacts: [{ value: 'status', label: 'Status' }],
    leads: [{ value: 'stage', label: 'Stage' }],
    cases: [
        { value: 'status', label: 'Status' },
        { value: 'priority', label: 'Priority' },
    ],
    activities: [
        { value: 'type', label: 'Type' },
        { value: 'status', label: 'Status' },
    ],
    campaigns: [
        { value: 'status', label: 'Status' },
        { value: 'type', label: 'Type' },
    ],
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-report-detail-dialog',
    host: { class: 'contents' },
    imports: [
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
            [title]="data.reportId ? 'Report details' : 'New report'"
            description="Define entity, grouping, and preview analytics results."
            size="lg"
            [showFooter]="true"
        >
            @if (loading()) {
                <div class="dialog-loading"><app-loader /></div>
            } @else {
                <form [formGroup]="form" class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <app-input id="report-name" label="Name" formControlName="name" [required]="true" />
                        <app-select
                            id="report-entity"
                            label="Entity"
                            formControlName="entityType"
                            [options]="entityOptions"
                        />
                    </div>
                    <app-textarea id="report-description" label="Description" formControlName="description" />

                    <div class="grid gap-4 sm:grid-cols-3">
                        <app-select
                            id="report-chart"
                            label="Chart type"
                            formControlName="chartType"
                            [options]="chartOptions"
                        />
                        <app-select
                            id="report-group-by"
                            label="Group by"
                            formControlName="groupBy"
                            [options]="groupByOptions()"
                        />
                        <app-input
                            id="report-limit"
                            label="Row limit"
                            type="number"
                            formControlName="limit"
                        />
                    </div>

                    <app-checkbox id="report-shared" label="Share with organization" formControlName="isShared" />

                    @if (report(); as item) {
                        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                            <app-badge variant="secondary">{{ formatStatus(item.entityType) }}</app-badge>
                            @if (item.lastRunAt) {
                                <span class="text-xs text-muted-foreground">
                                    Last run {{ formatDate(item.lastRunAt) }}
                                </span>
                            }
                        </div>
                    }

                    @if (preview(); as result) {
                        <div class="space-y-2 border-t border-border pt-4">
                            <p class="text-sm font-medium">Preview ({{ result.run.rowCount }} rows)</p>
                            <div class="max-h-48 overflow-auto rounded-md border">
                                <table class="w-full text-sm">
                                    <thead class="bg-muted/50">
                                        <tr>
                                            @for (col of result.result.columns; track col.key) {
                                                <th class="px-3 py-2 text-left font-medium">{{ col.label }}</th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (row of result.result.rows.slice(0, 10); track $index) {
                                            <tr class="border-t">
                                                @for (col of result.result.columns; track col.key) {
                                                    <td class="px-3 py-2">{{ row[col.key] ?? '—' }}</td>
                                                }
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    }

                    @if (runs().length) {
                        <div class="space-y-2 border-t border-border pt-4">
                            <p class="text-sm font-medium">Recent runs</p>
                            @for (run of runs(); track run.id) {
                                <div class="rounded-md border px-3 py-2 text-sm">
                                    <div class="flex items-center justify-between gap-2">
                                        <span>{{ formatStatus(run.status) }}</span>
                                        <span class="text-xs text-muted-foreground">{{
                                            formatDate(run.completedAt ?? run.createdAt)
                                        }}</span>
                                    </div>
                                    <p class="text-xs text-muted-foreground">{{ run.rowCount }} rows</p>
                                </div>
                            }
                        </div>
                    }
                </form>
            }

            <div dialogFooter class="flex flex-wrap gap-2">
                @if (report()?.id && canManage()) {
                    <app-button
                        variant="destructive"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="deleteReport()"
                    >
                        Delete
                    </app-button>
                    <app-button
                        variant="secondary"
                        type="button"
                        [disabled]="submitting() || running()"
                        (clicked)="runPreview()"
                    >
                        @if (running()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Run preview
                        }
                    </app-button>
                    <app-button
                        variant="outline"
                        type="button"
                        [disabled]="submitting()"
                        (clicked)="exportCsv()"
                    >
                        Export CSV
                    </app-button>
                }
                <app-button variant="outline" type="button" (clicked)="close()">Cancel</app-button>
                @if (canManage()) {
                    <app-button type="button" [disabled]="submitting() || loading()" (clicked)="save()">
                        @if (submitting()) {
                            <app-loader size="sm" [inline]="true" />
                        } @else {
                            Save report
                        }
                    </app-button>
                }
            </div>
        </app-dialog>
    `,
})
export class ReportDetailDialogComponent implements OnInit {
    private readonly fb = inject(NonNullableFormBuilder);
    private readonly reportService = inject(ReportService);
    private readonly permissionService = inject(PermissionService);
    private readonly toastService = inject(ToastService);
    readonly data = inject<ReportDetailDialogData>(DIALOG_DATA);
    private readonly dialogRef = inject(DialogRef<ReportDetailDialogResult>);

    readonly entityOptions = ENTITY_OPTIONS;
    readonly chartOptions = CHART_OPTIONS;

    readonly report = signal<Report | null>(null);
    readonly runs = signal<ReportRun[]>([]);
    readonly preview = signal<ReportRunResult | null>(null);
    readonly loading = signal(true);
    readonly submitting = signal(false);
    readonly running = signal(false);

    readonly canManage = computed(() =>
        this.permissionService.hasPermission(Permissions.ManageDeals),
    );

    readonly groupByOptions = computed((): SelectOption[] => {
        const entity = this.form.controls.entityType.value;
        return GROUP_BY_FIELDS[entity] ?? [];
    });

    readonly form = this.fb.group({
        name: ['', Validators.required],
        description: [''],
        entityType: ['deals', Validators.required],
        chartType: ['TABLE'],
        groupBy: [''],
        limit: [100],
        isShared: [false],
    });

    readonly formatDate = formatEnterpriseDate;
    readonly formatStatus = formatEnterpriseStatus;

    ngOnInit(): void {
        void this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    private async load(): Promise<void> {
        this.loading.set(true);
        try {
            if (this.data.reportId) {
                const [item, runsPage] = await Promise.all([
                    this.reportService.getReport(this.data.reportId),
                    this.reportService.listReportRuns(this.data.reportId, { pageSize: 5 }),
                ]);
                this.report.set(item);
                this.runs.set(runsPage.data);
                if (item) {
                    const config = item.config ?? {};
                    this.form.patchValue({
                        name: item.name,
                        description: item.description ?? '',
                        entityType: item.entityType,
                        chartType: item.chartType ?? 'TABLE',
                        groupBy: (config['groupBy'] as string) ?? '',
                        limit: Number(config['limit'] ?? 100),
                        isShared: item.isShared ?? false,
                    });
                }
            }
        } catch {
            this.toastService.error('Failed to load report');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        if (this.form.invalid) return;
        this.submitting.set(true);
        try {
            const raw = this.form.getRawValue();
            const payload = {
                name: raw.name,
                description: raw.description || undefined,
                entityType: raw.entityType,
                chartType: raw.chartType,
                isShared: raw.isShared,
                config: {
                    groupBy: raw.groupBy || undefined,
                    limit: raw.limit || undefined,
                },
            };

            if (this.report()?.id) {
                await this.reportService.updateReport(this.report()!.id, payload);
                this.toastService.success('Report updated');
                this.dialogRef.close('updated');
            } else {
                await this.reportService.createReport(payload);
                this.toastService.success('Report created');
                this.dialogRef.close('saved');
            }
        } catch {
            this.toastService.error('Failed to save report');
        } finally {
            this.submitting.set(false);
        }
    }

    async deleteReport(): Promise<void> {
        const id = this.report()?.id;
        if (!id) return;
        this.submitting.set(true);
        try {
            await this.reportService.deleteReport(id);
            this.toastService.success('Report deleted');
            this.dialogRef.close('deleted');
        } catch {
            this.toastService.error('Failed to delete report');
        } finally {
            this.submitting.set(false);
        }
    }

    async runPreview(): Promise<void> {
        const id = this.report()?.id;
        if (!id) return;
        this.running.set(true);
        try {
            await this.saveQuiet();
            const result = await this.reportService.runReport(id);
            if (result) {
                this.preview.set(result);
                this.toastService.success('Report executed');
                const runsPage = await this.reportService.listReportRuns(id, { pageSize: 5 });
                this.runs.set(runsPage.data);
            }
        } catch {
            this.toastService.error('Failed to run report');
        } finally {
            this.running.set(false);
        }
    }

    async exportCsv(): Promise<void> {
        const id = this.report()?.id;
        if (!id) return;
        try {
            const csv = await this.reportService.exportCsv(id);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.report()?.name ?? 'report'}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            this.toastService.error('Failed to export CSV');
        }
    }

    private async saveQuiet(): Promise<void> {
        if (this.form.invalid || !this.report()?.id) return;
        const raw = this.form.getRawValue();
        await this.reportService.updateReport(this.report()!.id, {
            name: raw.name,
            description: raw.description || undefined,
            entityType: raw.entityType,
            chartType: raw.chartType,
            isShared: raw.isShared,
            config: {
                groupBy: raw.groupBy || undefined,
                limit: raw.limit || undefined,
            },
        });
    }
}
