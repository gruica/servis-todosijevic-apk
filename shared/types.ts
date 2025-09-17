// User role types based on schema.ts
export const USER_ROLES = [
  'admin',
  'technician', 
  'customer',
  'business_partner',
  'business',
  'supplier_complus',
  'supplier_beko'
] as const;

export type UserRole = typeof USER_ROLES[number];

// Type guard for user roles
export function isValidUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

// Supplier role utility types
export type SupplierRole = 'supplier_complus' | 'supplier_beko';
export const SUPPLIER_ROLES: SupplierRole[] = ['supplier_complus', 'supplier_beko'];

export function isSupplierRole(role: string): role is SupplierRole {
  return SUPPLIER_ROLES.includes(role as SupplierRole);
}

// Role groups for easy checking
export const ADMIN_ROLES: UserRole[] = ['admin'];
export const TECHNICIAN_ROLES: UserRole[] = ['technician'];
export const CUSTOMER_ROLES: UserRole[] = ['customer'];
export const BUSINESS_PARTNER_ROLES: UserRole[] = ['business_partner', 'business'];
export const SUPPLIER_ROLES_ALL: SupplierRole[] = ['supplier_complus', 'supplier_beko'];

// Permission checking utilities
export function hasAdminAccess(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function hasTechnicianAccess(role: UserRole): boolean {
  return TECHNICIAN_ROLES.includes(role);
}

export function hasSupplierAccess(role: UserRole): boolean {
  return isSupplierRole(role);
}

export function hasBusinessPartnerAccess(role: UserRole): boolean {
  return BUSINESS_PARTNER_ROLES.includes(role);
}