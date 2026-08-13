import type { CreateProductInput } from "./product.validation";
import { createProductSchema } from "./product.validation";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PRODUCT_TYPES = new Set([
  "SIMPLE",
  "VARIABLE",
  "DIGITAL",
  "PHYSICAL",
  "SUBSCRIPTION",
  "BUNDLE",
]);

const PRODUCT_STATUSES = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const PRODUCT_VISIBILITIES = new Set(["VISIBLE", "HIDDEN", "CATALOG_ONLY", "SEARCH_ONLY"]);

export type ProductImportFieldKey =
  | "name"
  | "slug"
  | "description"
  | "short_description"
  | "type"
  | "status"
  | "visibility"
  | "brand_slug"
  | "category_slugs"
  | "price"
  | "compare_at_price"
  | "sku"
  | "track_inventory"
  | "initial_stock"
  | "image_url"
  | "image_alt";

export interface ProductImportLookupContext {
  brandsBySlug: ReadonlyMap<string, string>;
  categoriesBySlug: ReadonlyMap<string, string>;
}

export interface CsvRowParseResult {
  product: CreateProductInput | null;
  errors: string[];
  fieldErrors: Partial<Record<ProductImportFieldKey, string>>;
  name: string;
  slug: string;
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 255);

const parseBoolean = (value: string): boolean | undefined => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return undefined;
};

const parseNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const splitList = (value: string): string[] =>
  value
    .split(/[|;]/)
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter(Boolean);

const addFieldError = (
  fieldErrors: Partial<Record<ProductImportFieldKey, string>>,
  errors: string[],
  field: ProductImportFieldKey,
  message: string,
): void => {
  if (!fieldErrors[field]) {
    fieldErrors[field] = message;
  }
  errors.push(message);
};

const zodPathToField = (path: (string | number)[]): ProductImportFieldKey | undefined => {
  const key = String(path[0] ?? "");
  const map: Record<string, ProductImportFieldKey> = {
    name: "name",
    slug: "slug",
    description: "description",
    shortDescription: "short_description",
    type: "type",
    status: "status",
    visibility: "visibility",
    brandId: "brand_slug",
    categoryIds: "category_slugs",
    price: "price",
    compareAtPrice: "compare_at_price",
    sku: "sku",
    trackInventory: "track_inventory",
    initialStock: "initial_stock",
    primaryImage: "image_url",
  };
  if (key === "primaryImage" && path[1] === "url") return "image_url";
  if (key === "primaryImage" && path[1] === "altText") return "image_alt";
  return map[key];
};

const mergeZodErrors = (
  fieldErrors: Partial<Record<ProductImportFieldKey, string>>,
  errors: string[],
  product: CreateProductInput,
): void => {
  const parsed = createProductSchema.safeParse(product);
  if (parsed.success) return;

  for (const issue of parsed.error.issues) {
    const field = zodPathToField(issue.path.map(String));
    const message = issue.message;
    if (field) {
      addFieldError(fieldErrors, errors, field, message);
    } else {
      errors.push(message);
    }
  }
};

const resolveCategoryIds = (
  raw: string,
  lookup: ProductImportLookupContext,
  fieldErrors: Partial<Record<ProductImportFieldKey, string>>,
  errors: string[],
  requireKnownSlugs: boolean,
): string[] => {
  const slugs = splitList(raw);
  if (!slugs.length) return [];

  const ids: string[] = [];
  for (const slug of slugs) {
    const normalized = slug.toLowerCase();
    const id = lookup.categoriesBySlug.get(normalized);
    if (!id) {
      if (requireKnownSlugs) {
        addFieldError(
          fieldErrors,
          errors,
          "category_slugs",
          `Unknown category slug "${slug}" — use published category slugs from your catalog`,
        );
      }
      continue;
    }
    if (!ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
};

export const buildImportLookupMaps = (
  brands: ReadonlyArray<{ id: string; slug: string }>,
  categories: ReadonlyArray<{ id: string; slug: string }>,
): ProductImportLookupContext => {
  const brandsBySlug = new Map<string, string>();
  for (const brand of brands) {
    brandsBySlug.set(brand.slug.toLowerCase(), brand.id);
  }

  const categoriesBySlug = new Map<string, string>();
  for (const category of categories) {
    categoriesBySlug.set(category.slug.toLowerCase(), category.id);
  }

  return { brandsBySlug, categoriesBySlug };
};

export const parseCsvRowToProduct = (
  fields: Record<string, string>,
  lookup: ProductImportLookupContext,
  defaultStatus: CreateProductInput["status"] = "DRAFT",
): CsvRowParseResult => {
  const fieldErrors: Partial<Record<ProductImportFieldKey, string>> = {};
  const errors: string[] = [];

  const name = fields["name"]?.trim() ?? "";
  if (!name) {
    addFieldError(fieldErrors, errors, "name", "Name is required");
  }

  const slugInput = fields["slug"]?.trim() ?? "";
  const slug = slugInput || (name ? slugify(name) : "");
  if (!slug) {
    addFieldError(fieldErrors, errors, "slug", "Slug is required — use lowercase letters, numbers, and hyphens");
  } else if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    addFieldError(
      fieldErrors,
      errors,
      "slug",
      "Slug must use lowercase letters, numbers, and hyphens only",
    );
  }

  const typeRaw = (fields["type"]?.trim().toUpperCase() || "SIMPLE") as CreateProductInput["type"];
  if (!PRODUCT_TYPES.has(typeRaw)) {
    addFieldError(
      fieldErrors,
      errors,
      "type",
      "Invalid type — use SIMPLE, VARIABLE, DIGITAL, PHYSICAL, SUBSCRIPTION, or BUNDLE",
    );
  }

  const statusRaw = (fields["status"]?.trim().toUpperCase() || defaultStatus) as CreateProductInput["status"];
  if (!PRODUCT_STATUSES.has(statusRaw)) {
    addFieldError(fieldErrors, errors, "status", "Invalid status — use DRAFT, PUBLISHED, or ARCHIVED");
  }

  const visibilityRaw = (fields["visibility"]?.trim().toUpperCase() ||
    "VISIBLE") as CreateProductInput["visibility"];
  if (!PRODUCT_VISIBILITIES.has(visibilityRaw)) {
    addFieldError(
      fieldErrors,
      errors,
      "visibility",
      "Invalid visibility — use VISIBLE, HIDDEN, CATALOG_ONLY, or SEARCH_ONLY",
    );
  }

  const brandSlug = fields["brand_slug"]?.trim().toLowerCase() ?? "";
  let brandId: string | null = null;
  if (brandSlug) {
    brandId = lookup.brandsBySlug.get(brandSlug) ?? null;
    if (!brandId && statusRaw === "PUBLISHED") {
      addFieldError(
        fieldErrors,
        errors,
        "brand_slug",
        `Unknown brand slug "${fields["brand_slug"]}" — check published brand slugs`,
      );
    }
  }

  const categoryIds = resolveCategoryIds(
    fields["category_slugs"] ?? "",
    lookup,
    fieldErrors,
    errors,
    statusRaw === "PUBLISHED",
  );

  const price = parseNumber(fields["price"] ?? "");
  const compareAtPrice = parseNumber(fields["compare_at_price"] ?? "");
  if (price !== undefined && price < 0) {
    addFieldError(fieldErrors, errors, "price", "Price cannot be negative");
  }
  if (compareAtPrice !== undefined && compareAtPrice < 0) {
    addFieldError(fieldErrors, errors, "compare_at_price", "Compare-at price cannot be negative");
  }
  if (price !== undefined && compareAtPrice !== undefined && compareAtPrice < price) {
    addFieldError(
      fieldErrors,
      errors,
      "compare_at_price",
      "Compare-at price must be greater than or equal to price",
    );
  }

  const sku = fields["sku"]?.trim() ?? "";
  if (typeRaw === "SIMPLE" && !sku) {
    addFieldError(fieldErrors, errors, "sku", "SKU is required for SIMPLE products");
  }
  if (typeRaw === "SIMPLE" && price === undefined) {
    addFieldError(fieldErrors, errors, "price", "Price is required for SIMPLE products");
  }

  const trackInventory = parseBoolean(fields["track_inventory"] ?? "");
  const initialStock = parseNumber(fields["initial_stock"] ?? "");
  if (initialStock !== undefined && initialStock < 0) {
    addFieldError(fieldErrors, errors, "initial_stock", "Initial stock cannot be negative");
  }

  if (statusRaw === "PUBLISHED" && categoryIds.length === 0) {
    addFieldError(
      fieldErrors,
      errors,
      "category_slugs",
      "Published products need at least one valid category slug",
    );
  }

  const imageUrl = fields["image_url"]?.trim() ?? "";
  const imageAlt = fields["image_alt"]?.trim() || name;

  if (errors.length || !name || !slug) {
    return {
      product: null,
      errors,
      fieldErrors,
      name: name || "—",
      slug: slug || slugInput || "—",
    };
  }

  const product: CreateProductInput = {
    name,
    slug,
    description: fields["description"]?.trim() || undefined,
    shortDescription: fields["short_description"]?.trim() || undefined,
    type: typeRaw,
    status: statusRaw,
    visibility: visibilityRaw,
    brandId,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    price,
    compareAtPrice: compareAtPrice ?? undefined,
    sku: sku || undefined,
    trackInventory,
    initialStock,
  };

  if (imageUrl) {
    product.primaryImage = {
      url: imageUrl,
      altText: imageAlt,
    };
  }

  mergeZodErrors(fieldErrors, errors, product);

  if (errors.length) {
    return { product: null, errors, fieldErrors, name, slug };
  }

  return { product, errors: [], fieldErrors: {}, name, slug };
};
