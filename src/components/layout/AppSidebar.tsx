
// src/components/layout/AppSidebar.tsx
"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { LayoutGrid, ShoppingCart, FileText as ReportIconOriginal, Package, BookUser, ReceiptText, ClipboardList, Warehouse, Layers, ListChecks, NotebookPen, ClipboardSignature, Activity, FileText, BarChart3, ShieldCheck, UserCheck, UserPlus, PackagePlus, UserCircle, CheckSquare, Factory, TestTube2, Archive, PlusCircle, PackageCheck, History, Settings, Users, KeyRound, Building2 } from 'lucide-react'; 
import Logo from './Logo';
import type { UserRole } from '@/lib/users'; 
import { getCurrentUserPermissionRoles } from '@/lib/auth';
import { useEffect, useState, useMemo } from 'react';
import { getModuleVisibility, allModules } from '@/lib/settings';

// ====================================================================================
// HOW TO MANAGE NAVIGATION
// ====================================================================================
// This file controls the navigation links shown in the sidebar for different users.
// To change the navigation, you can edit the `allNavItems` array below.
//
// Each item in the array is an object with:
// - href: The URL path for the link (e.g., '/dashboard').
// - label: The text that appears for the link (e.g., 'Main Dashboard').
// - icon: The icon component to display (from lucide-react).
// - roles: An array of UserRole types who can see this link. These are internal
//          permission roles like 'Admin', 'Finance', 'SalesCoordinator', etc.
// - module: The high-level module this link belongs to (for visibility toggling).
// ====================================================================================


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  module: (typeof allModules)[number];
}

const dashboardsToRemove = ['/dashboard', '/inventory-dashboard', '/production', '/store', '/laboratory'];

// Define all navigation items with their internal permission roles and module key
const allNavItems: NavItem[] = [
  // General Dashboards
  { href: '/dashboard', label: 'Main Dashboard', icon: LayoutGrid, roles: ['Admin', 'Finance', 'SalesCoordinator'], module: 'Sales' }, 
  { href: '/inventory-dashboard', label: 'Finish Bay', icon: Archive, roles: ['Inventory'], module: 'Inventory' },
  { href: '/production', label: 'Production Dashboard', icon: Factory, roles: ['Production'], module: 'Production' },
  { href: '/store', label: 'Store Dashboard', icon: Warehouse, roles: ['Store'], module: 'Store' },
  { href: '/laboratory', label: 'Laboratory', icon: TestTube2, roles: ['Laboratory'], module: 'Laboratory' },
  
  // Core Modules (Common)
  { href: '/activities', label: 'Overall Activities', icon: Activity, roles: ['Admin', 'Finance', 'SalesCoordinator', 'Purchases', 'Store', 'Production', 'Inventory', 'Laboratory'], module: 'Sales'},
  { href: '/invoices', label: 'Invoices', icon: FileText, roles: ['Admin', 'SalesCoordinator'], module: 'Sales' }, 

  // Inventory Role Links
  { href: '/products', label: 'Products Catalog', icon: Package, roles: ['Admin', 'Inventory'], module: 'Inventory' }, 
  { href: '/products/stock-management', label: 'Product Stock Mgt.', icon: Layers, roles: ['Admin', 'Inventory'], module: 'Inventory' },
  { href: '/products/stock-management/add', label: 'Add Product Stock', icon: PlusCircle, roles: ['Admin', 'Inventory'], module: 'Inventory' },
  { href: '/products/stock-management/log', label: 'Product Stock Log', icon: ListChecks, roles: ['Admin', 'Inventory'], module: 'Inventory' },
  { href: '/inventory-dashboard/pending-approvals', label: 'Pending Approvals', icon: PackageCheck, roles: ['Admin', 'Inventory'], module: 'Inventory' },
  { href: '/inventory-dashboard/submission-history', label: 'Submission History', icon: History, roles: ['Admin', 'Inventory'], module: 'Inventory' },


  // Sales Coordinator Specific
  { href: '/sales', label: 'All Sales Records', icon: ShoppingCart, roles: ['Admin', 'SalesCoordinator'], module: 'Sales' }, 
  { href: '/ledger-accounts', label: 'Ledger Accounts', icon: BookUser, roles: ['Admin', 'Finance', 'SalesCoordinator'], module: 'Finance' },

  // Finance Specific
  { href: '/receipts', label: 'Receipts', icon: ReceiptText, roles: ['Admin', 'Finance'], module: 'Finance' },
  { href: '/receipts/activity-log', label: 'Receipt Log', icon: ListChecks, roles: ['Admin', 'Finance'], module: 'Finance' },
  { href: '/credit-notes', label: 'Credit Notes', icon: NotebookPen, roles: ['Admin', 'Finance'], module: 'Finance' },
  
  // Purchases, Store Specific
  { href: '/purchases', label: 'Purchase Orders', icon: ClipboardList, roles: ['Admin', 'Purchases'], module: 'Purchases' },
  { href: '/purchases/suppliers', label: 'Manage Suppliers', icon: Users, roles: ['Admin', 'Purchases'], module: 'Purchases' },
  { href: '/store/usage', label: 'Material Usage', icon: ClipboardSignature, roles: ['Admin', 'Store', 'Production'], module: 'Store' },
  
  // Production & Laboratory
  { href: '/production/new-batch', label: 'New Production Batch', icon: PlusCircle, roles: ['Admin', 'Production'], module: 'Production' },
  { href: '/production/quality-assurance', label: 'Quality Assurance', icon: TestTube2, roles: ['Admin', 'Production'], module: 'Production' },
  { href: '/laboratory/tests', label: 'View All Tests', icon: ListChecks, roles: ['Admin', 'Laboratory'], module: 'Laboratory' },
  { href: '/laboratory/suppliers', label: 'Manage Suppliers', icon: UserCircle, roles: ['Admin', 'Laboratory'], module: 'Laboratory' },

  // Admin Specific
  { href: '/admin/user-management', label: 'User Management', icon: Users, roles: ['Admin'], module: 'Admin' },
  { href: '/settings/change-password', label: 'Change Password', icon: KeyRound, roles: ['Admin', 'Finance', 'SalesCoordinator', 'Production', 'Store', 'Inventory', 'Laboratory', 'Purchases'], module: 'Admin' },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['Admin'], module: 'Admin' },
];

const moduleIcons: Record<(typeof allModules)[number], React.ElementType> = {
  Sales: ShoppingCart,
  Finance: ReceiptText,
  Production: Factory,
  Store: Warehouse,
  Inventory: Archive,
  Laboratory: TestTube2,
  Purchases: ClipboardList,
  Admin: Settings
};


export default function AppSidebar() {
  const pathname = usePathname();
  const [currentUserPermissions, setCurrentUserPermissions] = useState<UserRole[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const permissions = getCurrentUserPermissionRoles();
    setCurrentUserPermissions(permissions);
    setIsAdmin(permissions.includes('Admin'));
  }, []);

  const navItemsByModule = useMemo(() => {
    if (!isMounted || currentUserPermissions.length === 0) return {};
    
    let itemsToDisplay = allNavItems.filter(item => {
      if (!getModuleVisibility(item.module)) return false;
      if (isAdmin) return true;
      return item.roles.some(requiredRole => currentUserPermissions.includes(requiredRole));
    });
    
    if (!isAdmin) {
      let primaryDashboardHref: string | undefined;
      if (currentUserPermissions.includes('Finance') || currentUserPermissions.includes('SalesCoordinator')) primaryDashboardHref = '/dashboard';
      else if (currentUserPermissions.includes('Inventory')) primaryDashboardHref = '/inventory-dashboard';
      else if (currentUserPermissions.includes('Production')) primaryDashboardHref = '/production';
      else if (currentUserPermissions.includes('Store')) primaryDashboardHref = '/store';
      else if (currentUserPermissions.includes('Laboratory')) primaryDashboardHref = '/laboratory';
      
      if (primaryDashboardHref) {
        itemsToDisplay = itemsToDisplay.filter(item => 
            !dashboardsToRemove.includes(item.href) || item.href === primaryDashboardHref
        );
        const primaryDashboardIndex = itemsToDisplay.findIndex(item => item.href === primaryDashboardHref);
        if (primaryDashboardIndex > 0) {
            const [primaryDashboard] = itemsToDisplay.splice(primaryDashboardIndex, 1);
            itemsToDisplay.unshift(primaryDashboard);
        }
      }
    }

    const grouped: Record<string, NavItem[]> = {};
    for (const item of itemsToDisplay) {
        if (!grouped[item.module]) {
            grouped[item.module] = [];
        }
        grouped[item.module].push(item);
    }
    return grouped;
  }, [isMounted, currentUserPermissions, isAdmin]);

  if (!isMounted) {
    return (
      <Sidebar collapsible="icon" side="left" className="border-r">
        <SidebarHeader className="p-4"><Logo className="text-sidebar-foreground" /></SidebarHeader>
        <SidebarContent />
      </Sidebar>
    );
  }
  
  return (
    <Sidebar collapsible="icon" side="left" className="border-r">
      <SidebarHeader className="p-4"><Logo className="text-sidebar-foreground" text="Hari Industries" /></SidebarHeader>
      <SidebarContent>
        {isAdmin ? (
          <Accordion type="multiple" className="w-full">
            {allModules.filter(module => navItemsByModule[module]?.length > 0).map(module => {
              const Icon = moduleIcons[module] || Building2;
              return (
                <AccordionItem value={module} key={module} className="border-b-0">
                  <AccordionTrigger className="px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md text-sidebar-foreground/80 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{module}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-4">
                    <SidebarMenu>
                      {navItemsByModule[module].map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== '/' && !dashboardsToRemove.includes(item.href) && pathname.startsWith(item.href))} tooltip={item.label}>
                              <span> 
                                <item.icon />
                                <span>{item.label}</span>
                              </span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <SidebarMenu>
            {Object.values(navItemsByModule).flat().map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || (item.href !== '/' && !dashboardsToRemove.includes(item.href) && pathname.startsWith(item.href))} tooltip={item.label}>
                    <span> 
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
