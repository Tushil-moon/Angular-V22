import { AppError } from "../../shared/errors/app-error";
import { mapProduct } from "../../shared/utils/quote-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { productRepository } from "./product.repository";
import { buildProductListWhere } from "./product.utils";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./product.validation";

export const productService = {
  async listProducts(query: ListProductsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildProductListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      productRepository.findMany(where, skip, query.pageSize),
      productRepository.count(where),
    ]);

    return { data: data.map(mapProduct), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getProductById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const product = await productRepository.findById({ id, organizationId });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
    return mapProduct(product);
  },

  async createProduct(input: CreateProductInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await productRepository.findBySku(organizationId, input.sku);
    if (existing) {
      throw new AppError(409, "SKU already exists", "PRODUCT_SKU_EXISTS");
    }

    const product = await productRepository.create({
      organization: { connect: { id: organizationId } },
      sku: input.sku,
      name: input.name,
      description: input.description,
      unitPrice: input.unitPrice,
      currency: input.currency ?? "USD",
      category: input.category,
      status: input.status ?? "ACTIVE",
    });

    return mapProduct(product);
  },

  async updateProduct(id: string, input: UpdateProductInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await productRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    if (input.sku && input.sku !== existing.sku) {
      const duplicate = await productRepository.findBySku(organizationId, input.sku);
      if (duplicate) throw new AppError(409, "SKU already exists", "PRODUCT_SKU_EXISTS");
    }

    const product = await productRepository.update(id, {
      sku: input.sku,
      name: input.name,
      description: input.description,
      unitPrice: input.unitPrice,
      currency: input.currency,
      category: input.category,
      status: input.status,
    });

    return mapProduct(product);
  },

  async deleteProduct(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await productRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
    await productRepository.delete(id);
  },
};
