import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";

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

export const dashboardService = {
  async getStats(userId: string, roles: string[]) {
    const isAdmin = roles.includes(Roles.Admin);

    const activeSessionsPromise = prisma.session.count({ where: { revokedAt: null } });
    const totalUsersPromise = isAdmin
      ? prisma.user.count({ where: { deletedAt: null } })
      : Promise.resolve(1);
    const totalRolesPromise = prisma.role.count();
    const recentLogsPromise = prisma.auditLog.findMany({
      where: isAdmin ? undefined : { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        action: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
    const databasePromise = prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);

    const [activeSessions, totalUsers, totalRoles, recentLogs, databaseOk] = await Promise.all([
      activeSessionsPromise,
      totalUsersPromise,
      totalRolesPromise,
      recentLogsPromise,
      databasePromise,
    ]);

    return {
      totalUsers,
      totalRoles,
      activeSessions,
      systemHealth: databaseOk ? 100 : 0,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        action: formatAction(log.action),
        description: log.user?.email
          ? `${log.user.email} · ${log.action.toLowerCase().replaceAll("_", " ")}`
          : log.action.toLowerCase().replaceAll("_", " "),
        time: relativeTime(log.createdAt),
        createdAt: log.createdAt,
      })),
    };
  },
};
