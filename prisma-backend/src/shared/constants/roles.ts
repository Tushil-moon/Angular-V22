export const Roles = {
  SuperAdmin: "Super Admin",
  Admin: "Admin",
  Manager: "Manager",
  ProductManager: "Product Manager",
  InventoryManager: "Inventory Manager",
  OrderManager: "Order Manager",
  MarketingManager: "Marketing Manager",
  CustomerSupport: "Customer Support",
  Accountant: "Accountant",
  User: "User",
} as const;

export type RoleName = (typeof Roles)[keyof typeof Roles];
