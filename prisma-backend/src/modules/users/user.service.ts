import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { hashPassword } from "../../shared/utils/crypto";
import { mapUser, userSelect } from "../../shared/utils/user-mapper";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "./user.validation";

const ensureRole = async (name: string) =>
  prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });

export const userService = {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    return user ? mapUser(user) : null;
  },

  async listUsers(query: ListUsersQuery) {
    const search = query.search?.trim() ?? "";
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: userSelect,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(mapUser),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelect,
    });

    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    return mapUser(user);
  },

  async createUser(input: CreateUserInput) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, input.phone ? { phone: input.phone } : undefined].filter(Boolean) as {
          email?: string;
          phone?: string;
        }[],
        deletedAt: null,
      },
    });

    if (existing) throw new AppError(409, "User already exists", "USER_EXISTS");

    const userRole = await ensureRole(Roles.User);
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone: input.phone,
          passwordHash,
          roles: { create: { roleId: userRole.id } },
        },
        select: userSelect,
      });

      await tx.account.upsert({
        where: { provider_providerAccountId: { provider: "EMAIL", providerAccountId: email } },
        update: { userId: created.id },
        create: { userId: created.id, provider: "EMAIL", providerAccountId: email },
      });

      return created;
    });

    return mapUser(user);
  },

  async updateUser(id: string, input: UpdateUserInput) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: input.email?.toLowerCase(),
        phone: input.phone,
        status: input.status,
      },
      select: userSelect,
    });

    return mapUser(updated);
  },

  async deleteUser(id: string, actorId: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    if (user.id === actorId) {
      throw new AppError(400, "You cannot delete your own account", "CANNOT_DELETE_SELF");
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "DELETED",
      },
    });
  },
};
