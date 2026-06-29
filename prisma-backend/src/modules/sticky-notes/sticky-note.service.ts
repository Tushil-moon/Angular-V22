import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type {
  CreateStickyNoteInput,
  ListStickyNotesQuery,
  UpdateStickyNoteInput,
} from "./sticky-note.validation";

const noteSelect = {
  id: true,
  organizationId: true,
  userId: true,
  title: true,
  content: true,
  color: true,
  isPinned: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const stickyNoteService = {
  async listStickyNotes(query: ListStickyNotesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      userId: auth.userId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { content: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.stickyNote.findMany({
        where,
        select: noteSelect,
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
        skip,
        take: query.pageSize,
      }),
      prisma.stickyNote.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getStickyNoteById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const note = await prisma.stickyNote.findFirst({
      where: { id, organizationId, userId: auth.userId },
      select: noteSelect,
    });
    if (!note) throw new AppError(404, "Sticky note not found", "STICKY_NOTE_NOT_FOUND");
    return note;
  },

  async createStickyNote(input: CreateStickyNoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const maxOrder = await prisma.stickyNote.aggregate({
      where: { organizationId, userId: auth.userId },
      _max: { sortOrder: true },
    });
    return prisma.stickyNote.create({
      data: {
        organizationId,
        userId: auth.userId,
        title: input.title ?? null,
        content: input.content ?? "",
        color: input.color ?? "#fef08a",
        isPinned: input.isPinned ?? false,
        sortOrder: input.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      select: noteSelect,
    });
  },

  async updateStickyNote(id: string, input: UpdateStickyNoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.stickyNote.findFirst({
      where: { id, organizationId, userId: auth.userId },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "Sticky note not found", "STICKY_NOTE_NOT_FOUND");
    return prisma.stickyNote.update({
      where: { id },
      data: input,
      select: noteSelect,
    });
  },

  async deleteStickyNote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.stickyNote.findFirst({
      where: { id, organizationId, userId: auth.userId },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "Sticky note not found", "STICKY_NOTE_NOT_FOUND");
    await prisma.stickyNote.delete({ where: { id } });
  },
};
