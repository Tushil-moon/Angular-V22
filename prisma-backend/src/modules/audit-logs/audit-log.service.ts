import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { ListAuditLogsQuery } from "./audit-log.validation";

export const auditLogService = {
  async listAuditLogs(query: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action as AuditAction } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.resource ? { resource: query.resource } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          userId: true,
          action: true,
          resource: true,
          resourceId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },
};
