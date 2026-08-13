/**
 * CSV parsing and templates for bulk product import.
 * Row validation is performed entirely on the server.
 */

import { PRODUCT_IMPORT_MAX_ROWS } from '../models/product.model';

export const MAX_PRODUCT_IMPORT_ROWS = PRODUCT_IMPORT_MAX_ROWS;

export const PRODUCT_IMPORT_HEADERS = [
    'name',
    'slug',
    'description',
    'short_description',
    'type',
    'status',
    'visibility',
    'brand_slug',
    'category_slugs',
    'price',
    'compare_at_price',
    'sku',
    'track_inventory',
    'initial_stock',
    'image_url',
    'image_alt',
] as const;

export type ProductImportFieldKey = (typeof PRODUCT_IMPORT_HEADERS)[number];

export const PRODUCT_IMPORT_EDITABLE_FIELDS: ProductImportFieldKey[] = [
    'name',
    'slug',
    'price',
    'sku',
    'brand_slug',
    'category_slugs',
    'type',
    'status',
    'compare_at_price',
    'initial_stock',
    'image_url',
];

export interface ParsedProductImportRow {
    rowNumber: number;
    fields: Record<string, string>;
}

function normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function escapeCsvField(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

function createEmptyFields(): Record<string, string> {
    return Object.fromEntries(PRODUCT_IMPORT_HEADERS.map((header) => [header, '']));
}

export function createImportFieldsFromRecord(record: Record<string, string>): Record<string, string> {
    const fields = createEmptyFields();
    for (const header of PRODUCT_IMPORT_HEADERS) {
        fields[header] = record[header]?.trim() ?? '';
    }
    return fields;
}

export function buildProductImportBlankTemplateCsv(): string {
    return `${PRODUCT_IMPORT_HEADERS.join(',')}\n`;
}

export function buildProductImportSampleCsv(): string {
    const header = PRODUCT_IMPORT_HEADERS.join(',');
    const rows = [
        [
            'Classic Cotton Tee',
            'classic-cotton-tee',
            'Soft everyday cotton t-shirt',
            'Comfortable cotton tee',
            'SIMPLE',
            'DRAFT',
            'VISIBLE',
            'acme',
            'apparel,t-shirts',
            '29.99',
            '39.99',
            'TEE-001',
            'true',
            '100',
            'https://example.com/images/tee.jpg',
            'Classic Cotton Tee',
        ],
        [
            'Wireless Headphones',
            'wireless-headphones',
            'Noise cancelling over-ear headphones',
            'Premium audio',
            'SIMPLE',
            'DRAFT',
            'VISIBLE',
            '',
            'electronics',
            '149.99',
            '199.99',
            'HP-200',
            'true',
            '50',
            '',
            'Wireless Headphones',
        ],
        [
            'Gift Card $50',
            'gift-card-50',
            'Digital store credit',
            'Redeem online',
            'DIGITAL',
            'DRAFT',
            'VISIBLE',
            '',
            '',
            '50.00',
            '',
            'GC-50',
            'false',
            '0',
            '',
            'Gift Card',
        ],
    ];
    return `${header}\n${rows.map((row) => row.map(escapeCsvField).join(',')).join('\n')}\n`;
}

function downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function downloadProductImportBlankTemplate(): void {
    downloadCsv(buildProductImportBlankTemplateCsv(), 'product-import-template.csv');
}

export function downloadProductImportSample(): void {
    downloadCsv(buildProductImportSampleCsv(), 'product-import-sample.csv');
}

/** @deprecated Use downloadProductImportSample */
export function downloadProductImportTemplate(): void {
    downloadProductImportSample();
}

export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        const next = text[index + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                field += '"';
                index += 1;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n' || (char === '\r' && next === '\n')) {
            row.push(field);
            if (row.some((cell) => cell.trim())) {
                rows.push(row);
            }
            row = [];
            field = '';
            if (char === '\r') {
                index += 1;
            }
        } else if (char !== '\r') {
            field += char;
        }
    }

    row.push(field);
    if (row.some((cell) => cell.trim())) {
        rows.push(row);
    }

    return rows;
}

export function parseProductImportCsv(text: string): {
    rows: ParsedProductImportRow[];
    fileErrors: string[];
} {
    const trimmed = text.replace(/^\uFEFF/, '').trim();
    if (!trimmed) {
        return { rows: [], fileErrors: ['CSV file is empty'] };
    }

    const matrix = parseCsv(trimmed);
    if (!matrix.length) {
        return { rows: [], fileErrors: ['CSV file is empty'] };
    }

    const headers = matrix[0].map(normalizeHeader);
    const hasNameColumn = headers.includes('name');
    if (!hasNameColumn) {
        return { rows: [], fileErrors: ['CSV must include a "name" column'] };
    }

    const dataRows = matrix.slice(1);
    if (!dataRows.length) {
        return { rows: [], fileErrors: ['CSV file has headers but no product rows'] };
    }

    if (dataRows.length > MAX_PRODUCT_IMPORT_ROWS) {
        return {
            rows: [],
            fileErrors: [`Import limited to ${MAX_PRODUCT_IMPORT_ROWS} products per file`],
        };
    }

    const rows: ParsedProductImportRow[] = [];
    for (const [index, cells] of dataRows.entries()) {
        const record: Record<string, string> = {};
        for (const [columnIndex, header] of headers.entries()) {
            record[header] = cells[columnIndex]?.trim() ?? '';
        }

        const isBlank = Object.values(record).every((value) => !value.trim());
        if (isBlank) continue;

        rows.push({
            rowNumber: index + 2,
            fields: createImportFieldsFromRecord(record),
        });
    }

    if (!rows.length) {
        return { rows: [], fileErrors: ['No product rows found in CSV file'] };
    }

    return { rows, fileErrors: [] };
}
