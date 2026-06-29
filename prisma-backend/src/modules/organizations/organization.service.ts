import crypto from "node:crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import type {
  CreateOrganizationInput,
  InviteMemberInput,
  UpdateOrganizationInput,
} from "./organization.validation";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const mapOrganization = (org: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  timezone: org.timezone,
  currency: org.currency,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,
});

const mapMembership = (membership: {
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  };
}) => ({
  organizationId: membership.organizationId,
  role: membership.role,
  joinedAt: membership.joinedAt,
  organization: mapOrganization(membership.organization),
});

export const organizationService = {
  async listOrganizations(userId: string) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            currency: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return memberships.map(mapMembership);
  },

  async getCurrentOrganization(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: auth.userId,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            timezone: true,
            currency: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new AppError(404, "Organization not found", "ORGANIZATION_NOT_FOUND");
    }

    return mapMembership(membership);
  },

  async createOrganization(input: CreateOrganizationInput, userId: string) {
    const slug = input.slug?.trim() || slugify(input.name);
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(409, "Organization slug already exists", "SLUG_EXISTS");
    }

    const organization = await prisma.organization.create({
      data: {
        name: input.name.trim(),
        slug,
        timezone: input.timezone?.trim() || "UTC",
        currency: input.currency?.toUpperCase() || "USD",
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return mapOrganization(organization);
  },

  async updateCurrentOrganization(input: UpdateOrganizationInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    if (!auth.organizationRole || !["OWNER", "ADMIN"].includes(auth.organizationRole)) {
      throw new AppError(403, "Organization admin access required", "FORBIDDEN");
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone.trim() } : {}),
        ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return mapOrganization(organization);
  },

  async listMembers(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, status: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
    }));
  },

  async inviteMember(input: InviteMemberInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    if (!auth.organizationRole || !["OWNER", "ADMIN"].includes(auth.organizationRole)) {
      throw new AppError(403, "Organization admin access required", "FORBIDDEN");
    }

    const email = input.email.trim().toLowerCase();
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: { email },
      },
    });
    if (existingMember) {
      throw new AppError(409, "User is already a member", "MEMBER_EXISTS");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        email,
        role: input.role ?? "MEMBER",
        tokenHash,
        invitedById: auth.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...invite,
      token,
    };
  },

  async listPendingInvites(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    if (!auth.organizationRole || !["OWNER", "ADMIN"].includes(auth.organizationRole)) {
      throw new AppError(403, "Organization admin access required", "FORBIDDEN");
    }

    const invites = await prisma.organizationInvite.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return invites;
  },

  async revokeInvite(inviteId: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    if (!auth.organizationRole || !["OWNER", "ADMIN"].includes(auth.organizationRole)) {
      throw new AppError(403, "Organization admin access required", "FORBIDDEN");
    }

    const invite = await prisma.organizationInvite.findFirst({
      where: { id: inviteId, organizationId, acceptedAt: null },
    });

    if (!invite) {
      throw new AppError(404, "Invite not found", "INVITE_NOT_FOUND");
    }

    await prisma.organizationInvite.delete({ where: { id: inviteId } });
  },

  async acceptInvite(token: string, userId: string, userEmail?: string | null) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invite = await prisma.organizationInvite.findFirst({
      where: {
        tokenHash,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invite) {
      throw new AppError(404, "Invite not found or expired", "INVITE_NOT_FOUND");
    }

    if (userEmail && invite.email !== userEmail.trim().toLowerCase()) {
      throw new AppError(403, "Invite email does not match your account", "FORBIDDEN");
    }

    await prisma.$transaction([
      prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId,
          },
        },
        update: { role: invite.role },
        create: {
          organizationId: invite.organizationId,
          userId,
          role: invite.role,
        },
      }),
      prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    const organization = await prisma.organization.findUnique({
      where: { id: invite.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return organization ? mapOrganization(organization) : null;
  },

  async removeMember(organizationId: string, targetUserId: string, auth: AuthContext) {
    const resolvedOrgId = requireOrganizationContext(auth);
    if (organizationId !== resolvedOrgId) {
      throw new AppError(403, "Organization context mismatch", "FORBIDDEN");
    }

    if (!auth.organizationRole || !["OWNER", "ADMIN"].includes(auth.organizationRole)) {
      throw new AppError(403, "Organization admin access required", "FORBIDDEN");
    }

    if (targetUserId === auth.userId) {
      throw new AppError(400, "You cannot remove yourself", "INVALID_OPERATION");
    }

    const target = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });

    if (!target) {
      throw new AppError(404, "Member not found", "MEMBER_NOT_FOUND");
    }

    if (target.role === "OWNER") {
      throw new AppError(400, "Cannot remove organization owner", "INVALID_OPERATION");
    }

    await prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId,
        },
      },
    });
  },
};
