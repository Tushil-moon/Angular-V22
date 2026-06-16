import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import { asyncHandler } from "../../shared/utils/async-handler";
import { hashPassword } from "../../shared/utils/crypto";
import { sendCreated, sendSuccess } from "../../shared/utils/response";

const userSelect = {
  id: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  roles: { include: { role: true } },
} as const;

const mapUser = (user: {
  roles: { role: { name: string } }[];
} & Record<string, unknown>) => ({
  ...user,
  roles: user.roles.map((entry) => entry.role.name),
});

const ensureRole = async (name: string) =>
  prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: userSelect,
  });

  return sendSuccess(res, user ? mapUser(user) : null);
});

export const listUsers = asyncHandler(async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });

  const data = users.map(mapUser);

  return sendSuccess(res, {
    data,
    total: data.length,
    page: 1,
    pageSize: data.length,
    totalPages: 1,
    hasMore: false,
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userSelect,
  });

  if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

  return sendSuccess(res, mapUser(user));
});

export const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, req.body.phone ? { phone: req.body.phone } : undefined].filter(Boolean) as {
        email?: string;
        phone?: string;
      }[],
      deletedAt: null,
    },
  });

  if (existing) throw new AppError(409, "User already exists", "USER_EXISTS");

  const userRole = await ensureRole(Roles.User);
  const passwordHash = await hashPassword(req.body.password);

  const user = await prisma.user.create({
    data: {
      email,
      phone: req.body.phone,
      passwordHash,
      roles: { create: { roleId: userRole.id } },
    },
    select: userSelect,
  });

  if (email) {
    await prisma.account.upsert({
      where: { provider_providerAccountId: { provider: "EMAIL", providerAccountId: email } },
      update: { userId: user.id },
      create: { userId: user.id, provider: "EMAIL", providerAccountId: email },
    });
  }

  return sendCreated(res, mapUser(user), "User created");
});

export const updateUser = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email: req.body.email?.toLowerCase(),
      phone: req.body.phone,
      status: req.body.status,
    },
    select: userSelect,
  });

  return sendSuccess(res, mapUser(updated), "User updated");
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

  if (user.id === req.user!.id) {
    throw new AppError(400, "You cannot delete your own account", "CANNOT_DELETE_SELF");
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: "DELETED",
    },
  });

  return sendSuccess(res, null, "User deleted");
});
