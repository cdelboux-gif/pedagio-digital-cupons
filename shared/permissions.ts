export const accessLevels = ["admin", "manager", "operator", "viewer"] as const;
export type AccessLevel = (typeof accessLevels)[number];
export const modules = ["dashboard", "partners", "coupons", "uses", "stores", "entities", "integrations", "access", "audit", "emails", "intelligence"] as const;
export type PermissionModule = (typeof modules)[number];
export type PermissionAction = "read" | "create" | "update" | "delete" | "status" | "manage";

const matrix: Record<AccessLevel, Partial<Record<PermissionModule, PermissionAction[]>>> = {
  admin: Object.fromEntries(modules.map(module => [module, ["read", "create", "update", "delete", "status", "manage"]])) as Partial<Record<PermissionModule, PermissionAction[]>>,
  manager: {
    dashboard: ["read"], partners: ["read", "create", "update", "delete", "status"], coupons: ["read", "create", "update", "delete", "status"], uses: ["read", "create"], stores: ["read", "create", "update", "delete", "status"], entities: ["read"], audit: ["read"], emails: ["read"], intelligence: ["read", "create", "update", "status", "manage"],
  },
  operator: {
    dashboard: ["read"], partners: ["read"], coupons: ["read"], uses: ["read", "create"], stores: ["read"], entities: ["read"], intelligence: ["read"],
  },
  viewer: {
    dashboard: ["read"], partners: ["read"], coupons: ["read"], uses: ["read"], stores: ["read"], entities: ["read"], intelligence: ["read"],
  },
};

export function canAccess(level: AccessLevel | null | undefined, module: PermissionModule, action: PermissionAction = "read") {
  if (!level) return false;
  return matrix[level]?.[module]?.includes(action) ?? false;
}

export function visibleModules(level: AccessLevel | null | undefined) {
  return modules.filter(module => canAccess(level, module, "read"));
}

export function permissionMatrix() {
  return matrix;
}
