export const userSelect = {
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

export const mapUser = (user: {
  roles: { role: { name: string } }[];
} & Record<string, unknown>) => ({
  ...user,
  roles: user.roles.map((entry) => entry.role.name),
});
