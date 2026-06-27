import { prisma } from "../../config/prisma";
import { Permissions } from "../../shared/constants/permissions";
import type { AuthContext } from "../../shared/types/auth-context";
import { buildOwnerScopedWhere } from "../../shared/utils/access-control";
import { hasPermission } from "../../shared/utils/permission";
import type { SearchQuery } from "./search.validation";

export const searchService = {
  async globalSearch(query: SearchQuery, auth: AuthContext) {
    const term = query.q;
    const limit = query.limit;
    const results: Array<{
      type: string;
      id: string;
      title: string;
      subtitle: string | null;
      route: string;
    }> = [];

    const canReadContacts = hasPermission(auth.permissions, Permissions.ReadContacts);
    const canReadDeals = hasPermission(auth.permissions, Permissions.ReadDeals);
    const canReadCompanies = hasPermission(auth.permissions, Permissions.ReadCompanies);

    const searches = [];

    if (canReadContacts) {
      searches.push(
        prisma.contact
          .findMany({
            where: buildOwnerScopedWhere(auth, {
              deletedAt: null,
              OR: [
                { firstName: { contains: term, mode: "insensitive" as const } },
                { lastName: { contains: term, mode: "insensitive" as const } },
                { email: { contains: term, mode: "insensitive" as const } },
                { company: { contains: term, mode: "insensitive" as const } },
              ],
            }),
            take: limit,
            select: { id: true, firstName: true, lastName: true, email: true, status: true },
          })
          .then((rows) => {
            for (const row of rows) {
              results.push({
                type: "contact",
                id: row.id,
                title: `${row.firstName} ${row.lastName}`.trim(),
                subtitle: row.email,
                route: `/dashboard/contacts`,
              });
            }
          }),
      );
    }

    if (canReadDeals) {
      searches.push(
        prisma.deal
          .findMany({
            where: buildOwnerScopedWhere(auth, {
              deletedAt: null,
              OR: [
                { title: { contains: term, mode: "insensitive" as const } },
                { description: { contains: term, mode: "insensitive" as const } },
              ],
            }),
            take: limit,
            select: { id: true, title: true, stage: true },
          })
          .then((rows) => {
            for (const row of rows) {
              results.push({
                type: "deal",
                id: row.id,
                title: row.title,
                subtitle: row.stage,
                route: `/dashboard/deals`,
              });
            }
          }),
      );
    }

    if (canReadCompanies) {
      searches.push(
        prisma.company
          .findMany({
            where: buildOwnerScopedWhere(auth, {
              deletedAt: null,
              OR: [
                { name: { contains: term, mode: "insensitive" as const } },
                { domain: { contains: term, mode: "insensitive" as const } },
              ],
            }),
            take: limit,
            select: { id: true, name: true, domain: true },
          })
          .then((rows) => {
            for (const row of rows) {
              results.push({
                type: "company",
                id: row.id,
                title: row.name,
                subtitle: row.domain,
                route: `/dashboard/companies`,
              });
            }
          }),
      );
    }

    await Promise.all(searches);

    return results.slice(0, limit);
  },
};
