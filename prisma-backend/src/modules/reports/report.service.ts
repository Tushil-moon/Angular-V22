import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateReportInput, ListReportsQuery } from "./report.validation";

const reportSelect = {
  id: true,
  storeId: true,
  requestedById: true,
  type: true,
  status: true,
  params: true,
  resultUrl: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReportJobSelect;

export const reportService = {
  async list(query: ListReportsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ReportJobWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const sortMap: Record<string, Prisma.ReportJobOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      completed_at: { completedAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.reportJob.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: reportSelect,
      }),
      prisma.reportJob.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const job = await prisma.reportJob.findFirst({
      where: { id, storeId },
      select: reportSelect,
    });
    if (!job) throw new AppError(404, "Report job not found", "REPORT_NOT_FOUND");
    return job;
  },

  async create(input: CreateReportInput, requestedById?: string) {
    const storeId = await getDefaultStoreId();
    const now = new Date();

    // Stub async processing: create then immediately mark COMPLETED
    // (schema has QUEUED as the pending-like initial status, not PENDING)
    return prisma.reportJob.create({
      data: {
        storeId,
        requestedById: requestedById ?? null,
        type: input.type,
        params:
          input.params === undefined || input.params === null
            ? Prisma.JsonNull
            : (input.params as Prisma.InputJsonValue),
        status: "COMPLETED",
        resultUrl: input.resultUrl ?? null,
        startedAt: now,
        completedAt: now,
      },
      select: reportSelect,
    });
  },
};
