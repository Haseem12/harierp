"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PackagePlus, Layers, UserCircle, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUserPermissionRoles } from '@/lib/auth';
import { useEffect, useState, useMemo } from 'react';
import type { UserRole } from '@/lib/users';
import { getModuleVisibility, allModules } from '@/lib/settings';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[]; // Internal permission roles
  module: (typeof allModules)[number];
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutGrid, roles: ['Admin', 'Finance', 'SalesCoordinator'], module: 'Sales' },
  { href: '/production', label: 'Home', icon: LayoutGrid, roles: ['Production'], module: 'Production' },
  { href: '/store', label: 'Home', icon: LayoutGrid, roles: ['Store'], module: 'Store' },
  { href: '/inventory-dashboard', label: 'Home', icon: LayoutGrid, roles: ['Inventory'], module: 'Inventory' },
  { href: '/laboratory', label: 'Home', icon: LayoutGrid, roles: ['Laboratory'], module: 'Laboratory' },
  { href: '/sales', label: 'Sales', icon: PackagePlus, roles: ['SalesCoordinator', 'Admin'], module: 'Sales' }, 
  { href: '/products', label: 'Products', icon: Layers, roles: ['Inventory', 'Admin'], module: 'Inventory' }, 
  { href: '/settings', label: 'Profile', icon: UserCircle, roles: ['Admin'], module: 'Admin' },
];

export default function BottomNavigationBar() {
  const pathname = usePathname();
  const [currentUserPermissions, setCurrentUserPermissions] = useState<UserRole[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentUserPermissions(getCurrentUserPermissionRoles());
  }, []);

  const navItems = useMemo(() => {
    if (!isMounted) return [];
    
    return allNavItems.filter(item => {
      if (!getModuleVisibility(item.module)) {
        return false; // Hide if module is disabled
      }
      if (currentUserPermissions.includes('Admin')) return true;
      return item.roles.some(requiredRole => currentUserPermissions.includes(requiredRole));
    });
  }, [isMounted, currentUserPermissions]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card text-card-foreground shadow-lg md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href) && item.href !== '/dashboard');
          return (
            <Link key={item.label + item.href} href={item.href} passHref>
              <div className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors w-16",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
              )}>
                <item.icon className="h-6 w-6" />
                <span className={cn("text-xs mt-0.5", isActive ? "font-medium" : "")}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
