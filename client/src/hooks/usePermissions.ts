import { useTenantStore, Resource, UserRole, defaultRolePermissions } from '../store/tenantStore';

export function usePermissions() {
  const { activeTenant, activeRole } = useTenantStore();

  const can = (resource: Resource, action: string): boolean => {
    // SUPER_ADMIN (SaaS owner) has view & delete privileges for governance
    if (activeRole === 'SUPER_ADMIN') {
      return action === 'delete' || action === 'read' || action === 'export';
    }

    // If TENANT_ADMIN, always return true
    if (activeRole === 'TENANT_ADMIN') {
      return true;
    }

    // Lookup activeTenant.rolePermissions
    const permissions = activeTenant?.rolePermissions || defaultRolePermissions;
    const roleConfig = permissions[activeRole];
    if (!roleConfig) return false;

    const resourceConfig = roleConfig[resource];
    if (!resourceConfig) return false;

    // Evaluate dynamic value from settings config
    const hasPermission = (resourceConfig as any)[action];
    return !!hasPermission;
  };

  return { can };
}
