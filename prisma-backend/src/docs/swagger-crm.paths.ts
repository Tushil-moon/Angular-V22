/** CRM OpenAPI path definitions — merged into swagger.ts */
export const crmSwaggerPaths = {
  "/contacts": {
    get: {
      summary: "List contacts",
      tags: ["CRM - Contacts"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Paginated contacts" } },
    },
    post: {
      summary: "Create contact",
      tags: ["CRM - Contacts"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Contact created" } },
    },
  },
  "/contacts/{id}": {
    get: {
      summary: "Get contact",
      tags: ["CRM - Contacts"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Contact" } },
    },
    patch: {
      summary: "Update contact",
      tags: ["CRM - Contacts"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Contact updated" } },
    },
    delete: {
      summary: "Delete contact",
      tags: ["CRM - Contacts"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Contact deleted" } },
    },
  },
  "/deals": {
    get: {
      summary: "List deals",
      tags: ["CRM - Deals"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Paginated deals" } },
    },
    post: {
      summary: "Create deal",
      tags: ["CRM - Deals"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Deal created" } },
    },
  },
  "/deals/pipeline": {
    get: {
      summary: "Pipeline summary by stage",
      tags: ["CRM - Deals"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Pipeline stages" } },
    },
  },
  "/deals/board": {
    get: {
      summary: "Kanban board columns",
      tags: ["CRM - Deals"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Board columns" } },
    },
  },
  "/companies": {
    get: {
      summary: "List companies",
      tags: ["CRM - Companies"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Paginated companies" } },
    },
    post: {
      summary: "Create company",
      tags: ["CRM - Companies"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Company created" } },
    },
  },
  "/activities": {
    get: {
      summary: "List activities",
      tags: ["CRM - Activities"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Paginated activities" } },
    },
    post: {
      summary: "Create activity",
      tags: ["CRM - Activities"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Activity created" } },
    },
  },
  "/activities/{id}": {
    get: {
      summary: "Get activity",
      tags: ["CRM - Activities"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Activity" } },
    },
    patch: {
      summary: "Update activity",
      tags: ["CRM - Activities"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Activity updated" } },
    },
    delete: {
      summary: "Delete activity",
      tags: ["CRM - Activities"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Activity deleted" } },
    },
  },
  "/tags": {
    get: {
      summary: "List tags",
      tags: ["CRM - Tags"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Tags" } },
    },
    post: {
      summary: "Create tag",
      tags: ["CRM - Tags"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Tag created" } },
    },
  },
  "/search": {
    get: {
      summary: "Global search",
      tags: ["CRM - Search"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Search results" } },
    },
  },
  "/dashboard/stats": {
    get: {
      summary: "Dashboard statistics",
      tags: ["CRM - Dashboard"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Dashboard stats" } },
    },
  },
  "/saved-views": {
    get: {
      summary: "List saved views",
      tags: ["CRM - Saved Views"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Saved views" } },
    },
    post: {
      summary: "Create saved view",
      tags: ["CRM - Saved Views"],
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Saved view created" } },
    },
  },
  "/organizations/current": {
    get: {
      summary: "Current organization",
      tags: ["Organizations"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Organization" } },
    },
  },
  "/organizations/current/members": {
    get: {
      summary: "List organization members",
      tags: ["Organizations"],
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Members" } },
    },
  },
} as const;
