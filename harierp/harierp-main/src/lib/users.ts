
// src/lib/users.ts

export type UserRole = 
  | 'DirectorGeneral' 
  | 'GeneralManager' 
  | 'FinanceManager' 
  | 'SalesManager' 
  | 'Laboratory' 
  | 'ProductionManager'
  // Keep internal permission roles for mapping
  | 'Admin'
  | 'Finance'
  | 'SalesCoordinator'
  | 'Production'
  | 'Store'
  | 'Inventory'
  | 'Purchases';


export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string; // Password can be optional on the type, but present in mock data
}

// This mock data is now the source of truth for client-side authentication.
// The password for all users is 'password123'
export const mockUsers: User[] = [
  { id: 'dg_user', name: 'Director General', role: 'DirectorGeneral', password: 'password123' },
  { id: 'gm_user', name: 'General Manager', role: 'GeneralManager', password: 'password123' },
  { id: 'finance_manager', name: 'Finance Manager', role: 'FinanceManager', password: 'password123' },
  { id: 'sales_manager', name: 'Sales Manager', role: 'SalesManager', password: 'password123' },
  { id: 'lab_personnel', name: 'Laboratory Personnel', role: 'Laboratory', password: 'password123' },
  { id: 'production_manager', name: 'Production Manager', role: 'ProductionManager', password: 'password123' },
];

// Map high-level roles to an internal 'Admin' role for permission checking.
// This simplifies access control logic in components.
export const rolePermissionMap: { [key in UserRole]?: UserRole[] } = {
    DirectorGeneral: ['Admin'],
    GeneralManager: ['Admin'],
    FinanceManager: ['Finance'],
    SalesManager: ['SalesCoordinator'], // Mapping to existing permission sets
    Laboratory: ['Laboratory'],
    ProductionManager: ['Production', 'Store', 'Inventory', 'Purchases'],
};
