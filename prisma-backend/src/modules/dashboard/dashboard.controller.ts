import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";

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

export const getDashboardStats = asyncHandler(async (req, res) => {
  const isAdmin = req.user!.roles.includes(Roles.Admin);

  const activeSessions = await prisma.session.count({ where: { revokedAt: null } });

  let totalUsers = 1;
  let totalRoles = 0;

  if (isAdmin) {
    [totalUsers, totalRoles] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.role.count(),
    ]);
  } else {
    totalRoles = await prisma.role.count();
  }

  const recentLogs = await prisma.auditLog.findMany({
    where: isAdmin ? undefined : { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: { select: { email: true } },
    },
  });

  let databaseOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseOk = false;
  }

  return sendSuccess(res, {
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
  });
});
