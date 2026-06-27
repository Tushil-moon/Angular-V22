import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import type { AuthContext } from "../../shared/types/auth-context";
import { buildActivityScopeWhere, buildOwnerScopedWhere } from "../../shared/utils/access-control";
import { hasPermission } from "../../shared/utils/permission";
import { Permissions } from "../../shared/constants/permissions";

const formatAction = (action: string) =>
  action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const relativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const openDealStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;

export const dashboardService = {
  async getStats(auth: AuthContext) {
    const canViewAllUsers = hasPermission(auth.permissions, Permissions.ManageUsers);
    const contactWhere = buildOwnerScopedWhere(auth, { deletedAt: null });
    const openDealWhere = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      stage: { in: [...openDealStages] },
    });
    const activityWhere = buildActivityScopeWhere(auth);

    const activeSessionsPromise = prisma.session.count({ where: { revokedAt: null } });
    const totalUsersPromise = canViewAllUsers
      ? prisma.user.count({ where: { deletedAt: null } })
      : Promise.resolve(1);
    const totalRolesPromise = hasPermission(auth.permissions, Permissions.ReadRoles)
      ? prisma.role.count()
      : Promise.resolve(0);
    const totalContactsPromise = prisma.contact.count({ where: contactWhere });
    const openDealsPromise = prisma.deal.count({ where: openDealWhere });
    const pipelineValuePromise = prisma.deal.aggregate({
      where: openDealWhere,
      _sum: { value: true },
    });
    const recentLogsPromise = canViewAllUsers
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            action: true,
            createdAt: true,
            user: { select: { email: true } },
          },
        })
      : prisma.auditLog.findMany({
          where: { userId: auth.userId },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            action: true,
            createdAt: true,
            user: { select: { email: true } },
          },
        });
    const recentCrmPromise = prisma.activity.findMany({
      where: activityWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        subject: true,
        createdAt: true,
        user: { select: { email: true } },
        contact: { select: { firstName: true, lastName: true } },
        deal: { select: { title: true } },
      },
    });
    const pipelinePromise = prisma.deal.groupBy({
      by: ["stage"],
      where: openDealWhere,
      _count: { _all: true },
      _sum: { value: true },
    });
    const databasePromise = prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

    const [
      activeSessions,
      totalUsers,
      totalRoles,
      totalContacts,
      openDeals,
      pipelineValueAgg,
      recentLogs,
      recentCrm,
      pipelineGroups,
      databaseOk,
    ] = await Promise.all([
      activeSessionsPromise,
      totalUsersPromise,
      totalRolesPromise,
      totalContactsPromise,
      openDealsPromise,
      pipelineValuePromise,
      recentLogsPromise,
      recentCrmPromise,
      pipelinePromise,
      databasePromise,
    ]);

    const auditActivity = recentLogs.map((log) => ({
      id: `audit-${log.id}`,
      action: formatAction(log.action),
      description: log.user?.email
        ? `${log.user.email} · ${log.action.toLowerCase().replaceAll("_", " ")}`
        : log.action.toLowerCase().replaceAll("_", " "),
      time: relativeTime(log.createdAt),
      createdAt: log.createdAt,
    }));

    const crmActivity = recentCrm.map((item) => {
      const context = item.deal?.title
        ? item.deal.title
        : item.contact
          ? `${item.contact.firstName} ${item.contact.lastName}`.trim()
          : "CRM";
      return {
        id: item.id,
        action: `${item.type.charAt(0)}${item.type.slice(1).toLowerCase()}: ${item.subject}`,
        description: `${item.user.email ?? "User"} · ${context}`,
        time: relativeTime(item.createdAt),
        createdAt: item.createdAt,
      };
    });

    const recentActivity = [...crmActivity, ...auditActivity]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
      .map(({ id, action, description, time }) => ({ id, action, description, time }));

    const pipeline = openDealStages.map((stage) => {
      const row = pipelineGroups.find((g) => g.stage === stage);
      return {
        stage,
        count: row?._count._all ?? 0,
        value: Number(row?._sum.value ?? 0),
      };
    });

    return {
      totalUsers,
      totalRoles,
      activeSessions: auth.roles.includes(Roles.Admin) ? activeSessions : 1,
      systemHealth: databaseOk ? 100 : 0,
      totalContacts,
      openDeals,
      pipelineValue: Number(pipelineValueAgg._sum.value ?? 0),
      pipeline,
      recentActivity,
    };
  },
};
