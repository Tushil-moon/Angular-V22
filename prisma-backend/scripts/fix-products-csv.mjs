/**
 * Fixes products_100.csv for bulk import into this app.
 * - Normalizes type/status/visibility enums
 * - Maps brand_slug → acme (seed brand)
 * - Maps category_slugs → apparel (seed category)
 * - Converts whole-unit prices to USD decimals (599 → 5.99)
 */

import fs from 'node:fs';
import path from 'node:path';

const INPUT = process.argv[2] ?? path.join(process.env.USERPROFILE ?? '', 'Downloads', 'products_100.csv');
const OUTPUT = process.argv[3] ?? INPUT;
const BACKUP = INPUT.replace(/\.csv$/i, '.original.csv');

const VALID_BRAND = 'acme';
const VALID_CATEGORY = 'apparel';

function parseCsv(text) {
  const rows = [];
  let row = [];
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
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
      if (char === '\r') index += 1;
    } else if (char !== '\r') {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function escapeCsvField(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  const map = {
    active: 'DRAFT',
    published: 'PUBLISHED',
    publish: 'PUBLISHED',
    draft: 'DRAFT',
    archived: 'ARCHIVED',
    inactive: 'ARCHIVED',
  };
  return map[normalized] ?? 'DRAFT';
}

function normalizeType(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  const allowed = new Set(['SIMPLE', 'VARIABLE', 'DIGITAL', 'PHYSICAL', 'SUBSCRIPTION', 'BUNDLE']);
  return allowed.has(normalized) ? normalized : 'SIMPLE';
}

function normalizeVisibility(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  const allowed = new Set(['VISIBLE', 'HIDDEN', 'CATALOG_ONLY', 'SEARCH_ONLY']);
  return allowed.has(normalized) ? normalized : 'VISIBLE';
}

function normalizePrice(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;
  if (parsed >= 100) {
    return (parsed / 100).toFixed(2);
  }
  return parsed.toFixed(2);
}

function fixRow(record) {
  return {
    ...record,
    type: normalizeType(record.type),
    status: normalizeStatus(record.status),
    visibility: normalizeVisibility(record.visibility),
    brand_slug: VALID_BRAND,
    category_slugs: VALID_CATEGORY,
    price: normalizePrice(record.price),
    compare_at_price: normalizePrice(record.compare_at_price),
  };
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`File not found: ${INPUT}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT, 'utf8').replace(/^\uFEFF/, '');
  const matrix = parseCsv(raw);
  if (!matrix.length) {
    console.error('CSV is empty');
    process.exit(1);
  }

  const headers = matrix[0].map((header) => header.trim().toLowerCase());
  const dataRows = matrix.slice(1);

  if (OUTPUT === INPUT && !fs.existsSync(BACKUP)) {
    fs.copyFileSync(INPUT, BACKUP);
    console.log(`Backup saved: ${BACKUP}`);
  }

  const fixedRows = dataRows.map((cells) => {
    const record = {};
    for (const [index, header] of headers.entries()) {
      record[header] = cells[index] ?? '';
    }
    return fixRow(record);
  });

  const outputLines = [
    headers.join(','),
    ...fixedRows.map((row) => headers.map((header) => escapeCsvField(row[header])).join(',')),
  ];

  fs.writeFileSync(OUTPUT, `${outputLines.join('\n')}\n`, 'utf8');

  console.log(`Fixed ${fixedRows.length} products`);
  console.log(`Output: ${OUTPUT}`);
  console.log('Changes applied:');
  console.log(`  type: simple → SIMPLE`);
  console.log(`  status: active → DRAFT`);
  console.log(`  visibility: visible → VISIBLE`);
  console.log(`  brand_slug: * → ${VALID_BRAND}`);
  console.log(`  category_slugs: * → ${VALID_CATEGORY}`);
  console.log(`  price/compare_at_price: converted to USD decimals (e.g. 599 → 5.99)`);
}

main();
