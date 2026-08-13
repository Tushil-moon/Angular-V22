/**
 * Bulk product import dialog — CSV upload, inline edit, validation, and import.
 */

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
} from '@angular/core';
import { apiErrorMessage } from '@features/shared/admin-list.util';
import { ToastService } from '@services/toast.service';
import {
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    DialogComponent,
    IconComponent,
    LoaderComponent,
    SelectComponent,
    type SelectOption,
} from '@shared/components';
import { DialogRef } from '@shared/dialog/dialog-ref';

import type {
    ProductImportResult,
    ProductImportRowResult,
    ProductStatus,
} from '../models/product.model';
import { ProductApiService } from '../services/product-api.service';
import {
    downloadProductImportBlankTemplate,
    downloadProductImportSample,
    MAX_PRODUCT_IMPORT_ROWS,
    type ParsedProductImportRow,
    parseProductImportCsv,
    type ProductImportFieldKey,
} from '../utils/product-import-csv.util';

export type ProductImportDialogResult = 'imported';

type ImportPhase = 'upload' | 'preview' | 'results';

interface PreviewRow extends ParsedProductImportRow {
    serverStatus?: ProductImportRowResult['status'];
    serverErrors?: string[];
    serverFieldErrors?: Partial<Record<ProductImportFieldKey, string>>;
    productId?: string;
}

const DEFAULT_STATUS_OPTIONS: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
];

const EDITABLE_COLUMNS: { key: ProductImportFieldKey; label: string; required?: boolean }[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'slug', label: 'Slug' },
    { key: 'price', label: 'Price', required: true },
    { key: 'sku', label: 'SKU', required: true },
    { key: 'brand_slug', label: 'Brand slug' },
    { key: 'category_slugs', label: 'Categories' },
    { key: 'status', label: 'Product status' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-product-import-dialog',
    imports: [
        DialogComponent,
        ButtonComponent,
        IconComponent,
        BadgeComponent,
        LoaderComponent,
        AlertComponent,
        SelectComponent,
    ],
    template: `
        <app-dialog
            title="Import products"
            description="Upload a CSV file to create products in bulk"
            titleIcon="upload"
            size="2xl"
            panelClass="dialog-panel-product"
            [showFooter]="true"
        >
            @if (phase() === 'preview' || phase() === 'results') {
                <div dialogHeaderExtra>
                    <app-badge variant="outline">{{ parsedRows().length }} rows</app-badge>
                    @if (serverValidated() && validRowCount() > 0) {
                        <app-badge variant="success">{{ validRowCount() }} valid</app-badge>
                    }
                    @if (serverValidated() && invalidRowCount() > 0) {
                        <app-badge variant="destructive">{{ invalidRowCount() }} need fixes</app-badge>
                    }
                </div>
            }

            @if (phase() === 'upload') {
                <div class="product-import-upload">
                    <section class="product-import-settings">
                        <div class="product-import-settings-copy">
                            <p class="product-import-settings-title">Import settings</p>
                            <p class="product-import-settings-desc">
                                Choose a default status for rows that omit the status column.
                            </p>
                        </div>
                        <app-select
                            id="import-default-status"
                            label="Default status"
                            [options]="defaultStatusOptions"
                            [value]="defaultStatus()"
                            (valueChange)="onDefaultStatusChange($event)"
                        />
                    </section>

                    <section class="product-import-downloads">
                        <div class="product-import-downloads-copy">
                            <p class="product-import-settings-title">Get started</p>
                            <p class="product-import-settings-desc">
                                Download a blank template or a sample file with example products.
                            </p>
                        </div>
                        <div class="product-import-downloads-actions">
                            <app-button
                                type="button"
                                variant="outline"
                                size="toolbar"
                                (clicked)="downloadBlankTemplate()"
                            >
                                <app-icon name="file-text" [size]="14" />
                                Blank template
                            </app-button>
                            <app-button
                                type="button"
                                variant="outline"
                                size="toolbar"
                                (clicked)="downloadSample()"
                            >
                                <app-icon name="arrow-down" [size]="14" />
                                Sample CSV
                            </app-button>
                        </div>
                    </section>

                    <div
                        class="product-import-dropzone"
                        [class.product-import-dropzone--active]="dragOver()"
                        (dragover)="onDragOver($event)"
                        (dragleave)="onDragLeave()"
                        (drop)="onDrop($event)"
                    >
                        <input
                            #fileInput
                            type="file"
                            accept=".csv,text/csv"
                            class="sr-only"
                            (change)="onFileSelected($event)"
                        />
                        <div class="product-import-dropzone-inner">
                            <div class="product-import-dropzone-icon">
                                <app-icon name="upload" [size]="28" />
                            </div>
                            <div>
                                <p class="product-import-dropzone-title">
                                    Drag and drop your CSV file here
                                </p>
                                <p class="product-import-dropzone-desc">
                                    Up to {{ maxRows }} products per import · UTF-8 CSV
                                </p>
                            </div>
                            <app-button
                                type="button"
                                variant="primary"
                                size="toolbar"
                                (clicked)="fileInput.click()"
                            >
                                Browse files
                            </app-button>
                        </div>
                    </div>

                    @if (fileErrors().length) {
                        <app-alert
                            type="danger"
                            title="Could not read file"
                            [message]="fileErrors().join(' ')"
                            [dismissible]="false"
                        />
                    }

                    <details class="product-import-help">
                        <summary>CSV column reference</summary>
                        <ul class="product-import-help-list">
                            <li><strong>name</strong> — required product title</li>
                            <li><strong>slug</strong> — URL slug (auto-generated from name if empty)</li>
                            <li><strong>price, sku</strong> — required for SIMPLE products</li>
                            <li><strong>brand_slug</strong> — must match a published brand</li>
                            <li><strong>category_slugs</strong> — comma-separated published category slugs</li>
                            <li><strong>status</strong> — DRAFT, PUBLISHED, or ARCHIVED</li>
                        </ul>
                    </details>
                </div>
            } @else if (phase() === 'preview') {
                <div class="product-import-preview">
                    <div class="product-import-preview-toolbar">
                        @if (fileName()) {
                            <p class="product-import-file-name">
                                <app-icon name="file-text" [size]="14" />
                                {{ fileName() }}
                            </p>
                        }
                        @if (validating()) {
                            <p class="product-import-inline-status" role="status" aria-live="polite">
                                <app-loader size="sm" [inline]="true" />
                                Validating {{ previewRows().length }} rows with server…
                            </p>
                        } @else {
                            <p class="product-import-preview-hint">
                                Rows are validated on the server. Edit inline, then re-validate before
                                importing.
                            </p>
                        }
                    </div>

                    @if (!validating()) {
                        @if (serverValidated() && invalidRowCount() > 0) {
                            <app-alert
                                type="warning"
                                title="Fix errors before importing"
                                [message]="validationSummary()"
                                [dismissible]="false"
                            />
                        } @else if (serverValidated() && validRowCount() > 0) {
                            <app-alert
                                type="success"
                                title="Server validation passed"
                                [message]="
                                    validRowCount() +
                                    ' product(s) passed backend validation and are ready to import.'
                                "
                                [dismissible]="false"
                            />
                        } @else if (serverValidationError()) {
                            <app-alert
                                type="danger"
                                title="Server validation failed"
                                [message]="serverValidationError()!"
                                [dismissible]="false"
                            />
                        }
                    }

                    <div
                        class="product-import-grid-wrap"
                        [class.product-import-grid-wrap--busy]="validating()"
                    >
                        <table class="product-import-grid">
                            <thead>
                                <tr>
                                    <th class="col-row">#</th>
                                    @for (col of editableColumns; track col.key) {
                                        <th>
                                            {{ col.label }}
                                            @if (col.required) {
                                                <span class="required-mark">*</span>
                                            }
                                        </th>
                                    }
                                    <th class="col-status">Validation</th>
                                    <th class="col-fix">What to fix</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of previewRows(); track row.rowNumber) {
                                    <tr [class.row-invalid]="rowIsInvalid(row)">
                                        <td class="col-row">{{ row.rowNumber }}</td>
                                        @for (col of editableColumns; track col.key) {
                                            <td>
                                                <input
                                                    type="text"
                                                    class="product-import-cell-input"
                                                    [class.product-import-cell-input--error]="
                                                        fieldError(row, col.key)
                                                    "
                                                    [value]="row.fields[col.key]"
                                                    [placeholder]="columnPlaceholder(col.key)"
                                                    [attr.aria-label]="
                                                        'Row ' +
                                                        row.rowNumber +
                                                        ' ' +
                                                        col.label
                                                    "
                                                    (input)="
                                                        onFieldEdit(
                                                            row.rowNumber,
                                                            col.key,
                                                            $event
                                                        )
                                                    "
                                                    (blur)="onFieldBlur(row.rowNumber)"
                                                />
                                                @if (fieldError(row, col.key); as err) {
                                                    <span class="product-import-cell-error">{{
                                                        err
                                                    }}</span>
                                                }
                                            </td>
                                        }
                                        <td class="col-status">
                                            <app-badge [variant]="rowBadgeVariant(row)">
                                                {{ rowStatusLabel(row) }}
                                            </app-badge>
                                        </td>
                                        <td class="col-fix">
                                            @if (validating()) {
                                                <span class="text-xs text-muted-foreground">—</span>
                                            } @else if (rowFixHints(row).length) {
                                                <ul class="product-import-fix-list">
                                                    @for (hint of rowFixHints(row); track hint) {
                                                        <li>{{ hint }}</li>
                                                    }
                                                </ul>
                                            } @else {
                                                <span class="text-xs text-muted-foreground"
                                                    >Ready</span
                                                >
                                            }
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            } @else {
                <div class="product-import-results">
                    <div class="product-import-summary">
                        <article class="product-import-summary-card">
                            <p class="product-import-summary-label">Imported</p>
                            <p class="product-import-summary-value product-import-summary-value--success">
                                {{ importResult()?.summary?.imported ?? 0 }}
                            </p>
                        </article>
                        <article class="product-import-summary-card">
                            <p class="product-import-summary-label">Failed</p>
                            <p class="product-import-summary-value product-import-summary-value--danger">
                                {{ importResult()?.summary?.failed ?? 0 }}
                            </p>
                        </article>
                        <article class="product-import-summary-card">
                            <p class="product-import-summary-label">Total rows</p>
                            <p class="product-import-summary-value">
                                {{ importResult()?.summary?.total ?? 0 }}
                            </p>
                        </article>
                    </div>

                    <div class="product-import-grid-wrap">
                        <table class="product-import-grid product-import-grid--results">
                            <thead>
                                <tr>
                                    <th class="col-row">#</th>
                                    <th>Product</th>
                                    <th class="col-status">Status</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (row of resultRows(); track row.row) {
                                    <tr>
                                        <td class="col-row">{{ row.row }}</td>
                                        <td>
                                            <p class="font-medium">{{ row.name }}</p>
                                            <p class="text-xs text-muted-foreground">{{ row.slug }}</p>
                                        </td>
                                        <td class="col-status">
                                            <app-badge [variant]="resultBadgeVariant(row.status)">
                                                {{ row.status }}
                                            </app-badge>
                                        </td>
                                        <td>
                                            @if (row.errors.length) {
                                                <ul class="product-import-fix-list">
                                                    @for (issue of row.errors; track issue) {
                                                        <li>{{ issue }}</li>
                                                    }
                                                </ul>
                                            } @else {
                                                <span class="text-xs text-muted-foreground">—</span>
                                            }
                                        </td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            }

            <div dialogFooter class="product-import-footer">
                <app-button type="button" variant="ghost" size="toolbar" (clicked)="close()">
                    {{ phase() === 'results' ? 'Close' : 'Cancel' }}
                </app-button>

                <div class="product-import-footer-actions">
                    @if (phase() === 'preview') {
                        <app-button
                            type="button"
                            variant="outline"
                            size="toolbar"
                            [disabled]="importing() || validating()"
                            (clicked)="resetUpload()"
                        >
                            Choose another file
                        </app-button>
                        <app-button
                            type="button"
                            variant="outline"
                            size="toolbar"
                            [disabled]="importing() || validating()"
                            (clicked)="validateImport(true)"
                        >
                            {{ validating() ? 'Validating…' : 'Re-validate' }}
                        </app-button>
                        <app-button
                            type="button"
                            variant="primary"
                            size="toolbar"
                            [disabled]="importing() || validating() || validRowCount() === 0 || !serverValidated()"
                            (clicked)="runImport()"
                        >
                            {{ importing() ? 'Importing…' : 'Import ' + validRowCount() + ' products' }}
                        </app-button>
                    }
                </div>
            </div>
        </app-dialog>
    `,
    styles: `
        .product-import-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            min-height: 12rem;
            padding: 2rem 0;
        }

        .product-import-inline-status {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8125rem;
            color: var(--muted-foreground);
        }

        .product-import-upload,
        .product-import-preview,
        .product-import-results {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .product-import-settings,
        .product-import-downloads {
            display: grid;
            gap: 1rem;
            padding: 1rem 1.25rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background: color-mix(in oklch, var(--muted) 25%, transparent);
        }

        @media (min-width: 640px) {
            .product-import-settings,
            .product-import-downloads {
                grid-template-columns: minmax(0, 1fr) minmax(12rem, 16rem);
                align-items: end;
            }

            .product-import-downloads {
                grid-template-columns: minmax(0, 1fr) auto;
            }
        }

        .product-import-settings-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--foreground);
        }

        .product-import-settings-desc {
            margin-top: 0.25rem;
            font-size: 0.8125rem;
            color: var(--muted-foreground);
            line-height: 1.45;
        }

        .product-import-downloads-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .product-import-dropzone {
            border: 2px dashed color-mix(in oklch, var(--border) 90%, transparent);
            border-radius: 0.875rem;
            background: color-mix(in oklch, var(--muted) 20%, transparent);
            transition:
                border-color 150ms ease,
                background-color 150ms ease,
                box-shadow 150ms ease;
        }

        .product-import-dropzone--active {
            border-color: var(--primary);
            background: color-mix(in oklch, var(--primary) 6%, transparent);
            box-shadow: 0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent);
        }

        .product-import-dropzone-inner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 2.5rem 1.5rem;
            text-align: center;
        }

        .product-import-dropzone-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 9999px;
            background: var(--muted);
            color: var(--muted-foreground);
        }

        .product-import-dropzone-title {
            font-size: 0.9375rem;
            font-weight: 600;
            color: var(--foreground);
        }

        .product-import-dropzone-desc {
            margin-top: 0.25rem;
            font-size: 0.8125rem;
            color: var(--muted-foreground);
        }

        .product-import-help {
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 0.875rem 1rem;
            font-size: 0.8125rem;
            color: var(--muted-foreground);
        }

        .product-import-help summary {
            cursor: pointer;
            font-weight: 600;
            color: var(--foreground);
        }

        .product-import-help-list {
            margin: 0.75rem 0 0;
            padding-left: 1.25rem;
            display: grid;
            gap: 0.35rem;
        }

        .product-import-preview-toolbar {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .product-import-file-name {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--foreground);
        }

        .product-import-preview-hint {
            font-size: 0.8125rem;
            color: var(--muted-foreground);
        }

        .product-import-grid-wrap {
            position: relative;
            overflow: auto;
            max-height: min(32rem, 55vh);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            transition: opacity 150ms ease;
        }

        .product-import-grid-wrap--busy {
            pointer-events: none;
            opacity: 0.72;
        }

        .product-import-grid-wrap--busy::after {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 2;
            border-radius: inherit;
            background: color-mix(in oklch, var(--background) 35%, transparent);
        }

        .product-import-grid {
            width: 100%;
            min-width: 56rem;
            border-collapse: collapse;
            font-size: 0.8125rem;
        }

        .product-import-grid th,
        .product-import-grid td {
            padding: 0.625rem 0.75rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            text-align: left;
        }

        .product-import-grid thead th {
            padding-bottom: 0.75rem;
        }

        .product-import-grid tbody td {
            padding-top: 0.75rem;
        }

        .product-import-grid thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--muted);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: var(--muted-foreground);
            white-space: nowrap;
        }

        .product-import-grid tbody tr:last-child td {
            border-bottom: none;
        }

        .product-import-grid tbody tr.row-invalid {
            background: color-mix(in oklch, var(--destructive) 4%, transparent);
        }

        .col-row {
            width: 2.5rem;
            color: var(--muted-foreground);
        }

        .col-status {
            width: 6.5rem;
            white-space: nowrap;
        }

        .col-fix {
            min-width: 12rem;
        }

        .required-mark {
            color: var(--destructive);
        }

        .product-import-cell-input {
            display: block;
            width: 100%;
            min-width: 5.5rem;
            padding: 0.375rem 0.5rem;
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            background: var(--background);
            font-size: 0.8125rem;
            color: var(--foreground);
        }

        .product-import-cell-input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent);
        }

        .product-import-cell-input--error {
            border-color: var(--destructive);
            background: color-mix(in oklch, var(--destructive) 4%, var(--background));
        }

        .product-import-cell-input--error:focus {
            box-shadow: 0 0 0 2px color-mix(in oklch, var(--destructive) 20%, transparent);
        }

        .product-import-cell-error {
            display: block;
            margin-top: 0.25rem;
            font-size: 0.6875rem;
            line-height: 1.35;
            color: var(--destructive);
        }

        .product-import-fix-list {
            margin: 0;
            padding-left: 1rem;
            color: var(--destructive);
            font-size: 0.6875rem;
            line-height: 1.4;
        }

        .product-import-summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.75rem;
        }

        .product-import-summary-card {
            padding: 1rem;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            background: color-mix(in oklch, var(--muted) 20%, transparent);
        }

        .product-import-summary-label {
            font-size: 0.6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--muted-foreground);
        }

        .product-import-summary-value {
            margin-top: 0.35rem;
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--foreground);
        }

        .product-import-summary-value--success {
            color: var(--chart-2, #16a34a);
        }

        .product-import-summary-value--danger {
            color: var(--destructive);
        }

        .product-import-footer {
            display: flex;
            width: 100%;
            flex-direction: column;
            gap: 0.75rem;
        }

        @media (min-width: 640px) {
            .product-import-footer {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
            }
        }

        .product-import-footer-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 0.5rem;
        }
    `,
})
export class ProductImportDialogComponent {
    private readonly dialogRef = inject(DialogRef<ProductImportDialogResult | null>);
    private readonly productApi = inject(ProductApiService);
    private readonly toast = inject(ToastService);

    readonly maxRows = MAX_PRODUCT_IMPORT_ROWS;
    readonly defaultStatusOptions = DEFAULT_STATUS_OPTIONS;
    readonly editableColumns = EDITABLE_COLUMNS;

    readonly phase = signal<ImportPhase>('upload');
    readonly defaultStatus = signal<ProductStatus>('DRAFT');
    readonly fileName = signal('');
    readonly fileErrors = signal<string[]>([]);
    readonly dragOver = signal(false);
    readonly validating = signal(false);
    readonly serverValidated = signal(false);
    readonly serverValidationError = signal<string | null>(null);
    readonly importing = signal(false);
    readonly parsedRows = signal<ParsedProductImportRow[]>([]);
    readonly previewRows = signal<PreviewRow[]>([]);
    readonly importResult = signal<ProductImportResult | null>(null);

    private serverValidationTimer: ReturnType<typeof setTimeout> | null = null;
    private validationRequestId = 0;

    readonly validRowCount = computed(() => {
        if (!this.serverValidated()) return 0;
        return this.previewRows().filter((row) => row.serverStatus === 'valid').length;
    });

    readonly invalidRowCount = computed(() => {
        if (!this.serverValidated()) return 0;
        return this.previewRows().filter((row) => row.serverStatus !== 'valid').length;
    });

    readonly resultRows = computed(() => this.importResult()?.results ?? []);

    readonly validationSummary = computed(() => {
        if (!this.serverValidated()) return '';

        const invalid = this.previewRows().filter((row) => row.serverStatus !== 'valid');
        if (!invalid.length) return '';

        const parts: string[] = [];
        const missingName = invalid.filter((row) => row.serverFieldErrors?.['name']).length;
        const missingSku = invalid.filter((row) => row.serverFieldErrors?.['sku']).length;
        const missingPrice = invalid.filter((row) => row.serverFieldErrors?.['price']).length;
        const badBrand = invalid.filter((row) => row.serverFieldErrors?.['brand_slug']).length;
        const badCategory = invalid.filter((row) => row.serverFieldErrors?.['category_slugs']).length;

        if (missingName) parts.push(`${missingName} row(s) missing name`);
        if (missingPrice) parts.push(`${missingPrice} row(s) missing price`);
        if (missingSku) parts.push(`${missingSku} row(s) missing SKU`);
        if (badBrand) parts.push(`${badBrand} row(s) have unknown brand slugs`);
        if (badCategory) parts.push(`${badCategory} row(s) have invalid categories`);

        if (parts.length === 0) {
            return `${invalid.length} row(s) have validation errors. Edit the highlighted fields below.`;
        }

        return `${invalid.length} row(s) need fixes: ${parts.join('; ')}.`;
    });

    onDefaultStatusChange(value: string): void {
        this.defaultStatus.set(value as ProductStatus);
        if (this.phase() === 'preview' && this.previewRows().length) {
            this.serverValidated.set(false);
            this.validateWithBackend(false);
        }
    }

    downloadBlankTemplate(): void {
        downloadProductImportBlankTemplate();
    }

    downloadSample(): void {
        downloadProductImportSample();
    }

    columnPlaceholder(key: ProductImportFieldKey): string {
        switch (key) {
            case 'category_slugs':
                return 'apparel, sale';
            case 'brand_slug':
                return 'acme';
            case 'status':
                return 'DRAFT';
            default:
                return '';
        }
    }

    fieldError(row: PreviewRow, key: ProductImportFieldKey): string | undefined {
        if (row.serverStatus === 'valid' || row.serverStatus === 'imported') {
            return undefined;
        }
        return row.serverFieldErrors?.[key];
    }

    rowFixHints(row: PreviewRow): string[] {
        if (row.serverStatus === 'valid' || row.serverStatus === 'imported') {
            return [];
        }

        const hints = new Set<string>();
        for (const error of row.serverErrors ?? []) hints.add(error);
        for (const message of Object.values(row.serverFieldErrors ?? {})) {
            if (message) hints.add(message);
        }
        return [...hints];
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragOver.set(true);
    }

    onDragLeave(): void {
        this.dragOver.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragOver.set(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) {
            this.readFile(file);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            this.readFile(file);
        }
        input.value = '';
    }

    onFieldEdit(rowNumber: number, key: ProductImportFieldKey, event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.serverValidated.set(false);
        this.updateRowField(rowNumber, key, value);
    }

    onFieldBlur(_rowNumber: number): void {
        this.scheduleServerValidation();
    }

    resetUpload(): void {
        this.clearServerValidationTimer();
        this.phase.set('upload');
        this.fileName.set('');
        this.fileErrors.set([]);
        this.parsedRows.set([]);
        this.previewRows.set([]);
        this.importResult.set(null);
        this.serverValidated.set(false);
        this.serverValidationError.set(null);
    }

    close(): void {
        if (this.phase() === 'results' && (this.importResult()?.summary?.imported ?? 0) > 0) {
            this.dialogRef.close('imported');
            return;
        }
        this.dialogRef.close(null);
    }

    validateImport(showToast = false): void {
        this.validateWithBackend(showToast);
    }

    runImport(): void {
        const products = this.collectImportableRows();
        if (!products.length) {
            this.toast.error('No valid rows to import — fix highlighted fields and re-validate');
            return;
        }

        this.importing.set(true);
        this.productApi
            .importProducts({
                products,
                dryRun: false,
                defaultStatus: this.defaultStatus(),
            })
            .subscribe({
            next: (result) => {
                const merged = this.mergeImportResults(result);
                this.importResult.set(merged);
                this.phase.set('results');
                this.importing.set(false);

                const { imported, failed } = merged.summary;
                if (imported > 0 && failed === 0) {
                    this.toast.success(`Imported ${imported} products`);
                } else if (imported > 0) {
                    this.toast.success(`Imported ${imported} products (${failed} failed)`);
                } else {
                    this.toast.error('Import failed for all rows');
                }
            },
            error: (error: unknown) => {
                this.importing.set(false);
                this.toast.error(apiErrorMessage(error, 'Import failed'));
            },
        });
    }

    rowIsInvalid(row: PreviewRow): boolean {
        if (this.validating() || !this.serverValidated()) return false;
        return row.serverStatus !== 'valid';
    }

    rowStatusLabel(row: PreviewRow): string {
        if (this.validating()) return 'Checking…';
        if (row.serverStatus === 'valid') return 'Valid';
        if (row.serverStatus === 'failed') return 'Invalid';
        if (!this.serverValidated()) return 'Pending';
        return 'Pending';
    }

    rowBadgeVariant(row: PreviewRow): 'success' | 'destructive' | 'outline' {
        if (this.validating()) return 'outline';
        if (row.serverStatus === 'valid') return 'success';
        if (row.serverStatus === 'failed') return 'destructive';
        return 'outline';
    }

    resultBadgeVariant(status: ProductImportRowResult['status']): 'success' | 'destructive' | 'outline' {
        if (status === 'imported' || status === 'valid') return 'success';
        if (status === 'failed') return 'destructive';
        return 'outline';
    }

    private collectRowsForServerValidation(): Array<{ row: number; fields: Record<string, string> }> {
        return this.previewRows().map((row) => ({
            row: row.rowNumber,
            fields: row.fields,
        }));
    }

    private collectImportableRows(): Array<{ row: number; fields: Record<string, string> }> {
        return this.previewRows()
            .filter((row) => row.serverStatus === 'valid')
            .map((row) => ({
                row: row.rowNumber,
                fields: row.fields,
            }));
    }

    private validateWithBackend(showToast = false): void {
        this.clearServerValidationTimer();

        const products = this.collectRowsForServerValidation();
        if (!products.length) {
            this.serverValidated.set(false);
            this.serverValidationError.set(null);
            if (showToast) {
                this.toast.error('No rows could be sent for server validation');
            }
            return;
        }

        const requestId = ++this.validationRequestId;

        this.validating.set(true);
        this.serverValidated.set(false);
        this.serverValidationError.set(null);
        this.resetRowValidationState();

        this.productApi
            .importProducts({
                products,
                dryRun: true,
                defaultStatus: this.defaultStatus(),
            })
            .subscribe({
                next: (result) => {
                    if (requestId !== this.validationRequestId) return;

                    this.applyServerValidation(result);
                    this.validating.set(false);
                    this.serverValidated.set(true);
                    if (showToast) {
                        const invalid = result.summary.failed;
                        if (invalid === 0) {
                            this.toast.success(
                                `All ${result.summary.valid} rows passed server validation`,
                            );
                        } else {
                            this.toast.error(`${invalid} row(s) failed server validation`);
                        }
                    }
                },
                error: (error: unknown) => {
                    if (requestId !== this.validationRequestId) return;

                    this.validating.set(false);
                    this.serverValidated.set(false);
                    const message = apiErrorMessage(error, 'Server validation failed');
                    this.serverValidationError.set(message);
                    this.toast.error(message);
                },
            });
    }

    private resetRowValidationState(): void {
        this.previewRows.update((rows) =>
            rows.map((row) => ({
                ...row,
                serverStatus: undefined,
                serverErrors: undefined,
                serverFieldErrors: undefined,
            })),
        );
    }

    private updateRowField(
        rowNumber: number,
        key: ProductImportFieldKey,
        value: string,
    ): void {
        this.previewRows.update((rows) =>
            rows.map((row) => {
                if (row.rowNumber !== rowNumber) return row;
                return {
                    ...row,
                    fields: { ...row.fields, [key]: value },
                    serverStatus: undefined,
                    serverErrors: undefined,
                    serverFieldErrors: undefined,
                };
            }),
        );
    }

    private scheduleServerValidation(): void {
        this.clearServerValidationTimer();
        if (this.phase() !== 'preview' || this.validating()) return;

        this.serverValidationTimer = setTimeout(() => {
            this.validateWithBackend(false);
        }, 600);
    }

    private clearServerValidationTimer(): void {
        if (this.serverValidationTimer) {
            clearTimeout(this.serverValidationTimer);
            this.serverValidationTimer = null;
        }
    }

    private readFile(file: File): void {
        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
            this.fileErrors.set(['Please upload a CSV file']);
            return;
        }

        void file
            .text()
            .then((text) => this.processCsv(text, file.name))
            .catch(() => {
                this.fileErrors.set(['Failed to read the selected file']);
            });
    }

    private processCsv(text: string, name: string): void {
        const parsed = parseProductImportCsv(text);
        if (parsed.fileErrors.length) {
            this.fileErrors.set(parsed.fileErrors);
            this.parsedRows.set([]);
            this.previewRows.set([]);
            return;
        }

        this.fileErrors.set([]);
        this.fileName.set(name);
        this.parsedRows.set(parsed.rows);
        this.previewRows.set(parsed.rows.map((row) => ({ ...row })));
        this.phase.set('preview');
        this.serverValidated.set(false);
        this.serverValidationError.set(null);
        this.validateWithBackend(false);
    }

    private applyServerValidation(result: ProductImportResult): void {
        const byRow = new Map(result.results.map((row) => [row.row, row]));
        this.previewRows.update((rows) =>
            rows.map((row) => {
                const server = byRow.get(row.rowNumber);
                if (!server) {
                    return {
                        ...row,
                        serverStatus: 'failed' as const,
                        serverErrors: ['Row was not validated by server'],
                        serverFieldErrors: {},
                    };
                }

                if (server.status === 'valid' || server.status === 'imported') {
                    return {
                        ...row,
                        serverFieldErrors: {},
                        serverStatus: server.status,
                        serverErrors: [],
                        productId: server.productId,
                    };
                }

                return {
                    ...row,
                    serverStatus: server.status,
                    serverErrors: server.errors,
                    serverFieldErrors: (server.fieldErrors ?? {}) as Partial<
                        Record<ProductImportFieldKey, string>
                    >,
                };
            }),
        );
    }

    private mergeImportResults(result: ProductImportResult): ProductImportResult {
        const serverByRow = new Map(result.results.map((row) => [row.row, row]));
        const mergedResults = this.previewRows().map((row) => {
            const server = serverByRow.get(row.rowNumber);
            if (server) {
                return server;
            }

            return {
                row: row.rowNumber,
                slug: row.fields['slug'] || '—',
                name: row.fields['name'] || '—',
                status: 'failed' as const,
                errors: this.rowFixHints(row).length
                    ? this.rowFixHints(row)
                    : ['Row was skipped because it failed validation'],
            };
        });

        const imported = mergedResults.filter((row) => row.status === 'imported').length;
        const failed = mergedResults.filter((row) => row.status === 'failed').length;

        return {
            dryRun: false,
            summary: {
                total: mergedResults.length,
                imported,
                failed,
                valid: imported,
            },
            results: mergedResults,
        };
    }
}
