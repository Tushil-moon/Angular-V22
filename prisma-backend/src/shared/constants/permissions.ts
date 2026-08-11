export const Permissions = {
  ManageAll: "manage:all",

  ReadUsers: "read:users",
  ManageUsers: "manage:users",
  ReadRoles: "read:roles",
  ManageRoles: "manage:roles",
  ReadSessions: "read:sessions",
  ManageSessions: "manage:sessions",
  ReadAuditLogs: "read:audit_logs",

  ReadProducts: "read:products",
  ManageProducts: "manage:products",
  ReadCategories: "read:categories",
  ManageCategories: "manage:categories",
  ReadBrands: "read:brands",
  ManageBrands: "manage:brands",
  ReadCollections: "read:collections",
  ManageCollections: "manage:collections",
  ReadTags: "read:tags",
  ManageTags: "manage:tags",
  ReadMedia: "read:media",
  ManageMedia: "manage:media",

  ReadInventory: "read:inventory",
  ManageInventory: "manage:inventory",
  ReadWarehouses: "read:warehouses",
  ManageWarehouses: "manage:warehouses",
  ReadSuppliers: "read:suppliers",
  ManageSuppliers: "manage:suppliers",
  ReadPurchaseOrders: "read:purchase_orders",
  ManagePurchaseOrders: "manage:purchase_orders",

  ReadCustomers: "read:customers",
  ManageCustomers: "manage:customers",
  ReadOrders: "read:orders",
  ManageOrders: "manage:orders",
  CancelOrders: "cancel:orders",
  ReadPayments: "read:payments",
  ManagePayments: "manage:payments",
  ReadRefunds: "read:refunds",
  ManageRefunds: "manage:refunds",
  ReadShipping: "read:shipping",
  ManageShipping: "manage:shipping",

  ReadPromotions: "read:promotions",
  ManagePromotions: "manage:promotions",
  ReadCoupons: "read:coupons",
  ManageCoupons: "manage:coupons",
  ReadGiftCards: "read:gift_cards",
  ManageGiftCards: "manage:gift_cards",

  ReadReviews: "read:reviews",
  ManageReviews: "manage:reviews",
  ReadCms: "read:cms",
  ManageCms: "manage:cms",
  ReadNotifications: "read:notifications",
  ManageNotifications: "manage:notifications",

  ReadReports: "read:reports",
  ManageReports: "manage:reports",
  ReadAnalytics: "read:analytics",
  ManageSettings: "manage:settings",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSIONS = Object.values(Permissions);
