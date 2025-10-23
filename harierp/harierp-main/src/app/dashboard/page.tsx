
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  DollarSign, ShoppingCart, FileText, Package, Users, Activity, 
  AlertCircle, RefreshCw, ReceiptText, ListChecks, NotebookPen, BookUser, LayoutGrid 
} from "lucide-react";
import type { Sale, Invoice, Product as ProductType } from '@/types';
import type { UserRole } from '@/lib/users';
import { getCurrentUserRole } from '@/lib/auth';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DashboardActivity {
  id: string; 
  originalId: string; 
  date: Date;
  type: 'Sale' | 'Invoice';
  title: string;
  subtitle: string;
  amount?: number;
  icon: React.ElementType;
  iconColorClass: string;
  link?: string;
}

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [recentActivities, setRecentActivities] = useState<DashboardActivity[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    console.log("[Dashboard Fetch] Starting fetch...");
    try {
      const [salesRes, invoicesRes, productsRes] = await Promise.all([
        fetch('https://sajfoods.net/busa-api/database/get_sales.php'),
        fetch('https://sajfoods.net/busa-api/database/get_invoices.php'),
        fetch('https://sajfoods.net/busa-api/database/get_products.php')
      ]);

      // Process Sales
      if (!salesRes.ok) {
          const errorText = await salesRes.text().catch(() => `Sales fetch failed: ${salesRes.statusText}`);
          console.error("[Dashboard Fetch] Sales API Error Response Text:", errorText.substring(0, 500));
          throw new Error(`Sales fetch failed: ${salesRes.status} - ${errorText.substring(0,100)}`);
      }
      const salesResult = await salesRes.json();
      console.log("[Dashboard Fetch] Sales API Response:", salesResult);
      if (salesResult.success && Array.isArray(salesResult.data)) {
        setSales(salesResult.data.map((s: any) => {
          const saleId = (s.id !== null && s.id !== undefined) ? String(s.id) : `fallback_sale_${Math.random().toString(36).substring(2, 9)}`;
          const customerNameStr = (s.customer && typeof s.customer === 'object' && s.customer.name) ? String(s.customer.name) : (s.customerName ? String(s.customerName) : 'N/A');
          const saleDateStr = s.saleDate || s.createdAt;
          const createdAtStr = s.createdAt || s.saleDate;

          return {
            ...s,
            id: saleId,
            saleDate: saleDateStr ? (isValid(parseISO(String(saleDateStr).replace(" ", "T"))) ? parseISO(String(saleDateStr).replace(" ", "T")) : new Date()) : new Date(),
            createdAt: createdAtStr ? (isValid(parseISO(String(createdAtStr).replace(" ", "T"))) ? parseISO(String(createdAtStr).replace(" ", "T")) : new Date()) : new Date(),
            customer: { ...(s.customer || {}), name: customerNameStr, id: s.customerId || s.customer?.id },
            totalAmount: Number(s.totalAmount) || 0,
          };
        }));
      } else {
        console.warn("Failed to fetch sales or data format incorrect for sales:", salesResult.message);
        setSales([]);
      }

      // Process Invoices
      if (!invoicesRes.ok) {
          const errorText = await invoicesRes.text().catch(() => `Invoices fetch failed: ${invoicesRes.statusText}`);
          console.error("[Dashboard Fetch] Invoices API Error Response Text:", errorText.substring(0, 500));
          throw new Error(`Invoices fetch failed: ${invoicesRes.status} - ${errorText.substring(0,100)}`);
      }
      const invoicesResult = await invoicesRes.json();
      console.log("[Dashboard Fetch] Invoices API Response:", invoicesResult);
      if (invoicesResult.success && Array.isArray(invoicesResult.data)) {
        setInvoices(invoicesResult.data.map((i: any) => {
          const invoiceId = (i.id !== null && i.id !== undefined) ? String(i.id) : `fallback_inv_${Math.random().toString(36).substring(2, 9)}`;
          const customerNameStr = (i.customer && typeof i.customer === 'object' && i.customer.name) ? String(i.customer.name) : (i.customerName ? String(i.customerName) : 'N/A');
          const issueDateStr = i.issueDate || i.createdAt;
          const createdAtStrInv = i.createdAt || i.issueDate;
          return {
            ...i,
            id: invoiceId,
            issueDate: issueDateStr ? (isValid(parseISO(String(issueDateStr).replace(" ", "T"))) ? parseISO(String(issueDateStr).replace(" ", "T")) : new Date()) : new Date(),
            createdAt: createdAtStrInv ? (isValid(parseISO(String(createdAtStrInv).replace(" ", "T"))) ? parseISO(String(createdAtStrInv).replace(" ", "T")) : new Date()) : new Date(),
            customer: { ...(i.customer || {}), name: customerNameStr, id: i.customerId || i.customer?.id },
            totalAmount: Number(i.totalAmount) || 0,
          };
        }));
      } else {
        console.warn("Failed to fetch invoices or data format incorrect for invoices:", invoicesResult.message);
        setInvoices([]);
      }
      
      // Process Products
      if (!productsRes.ok) {
          const errorText = await productsRes.text().catch(() => `Products fetch failed: ${productsRes.statusText}`);
          console.error("[Dashboard Fetch] Products API Error Response Text:", errorText.substring(0, 500));
          throw new Error(`Products fetch failed: ${productsRes.status} - ${errorText.substring(0,100)}`);
      }
      const productsResult = await productsRes.json();
      console.log("[Dashboard Fetch] Products API Response:", productsResult);
      let productsDataToSet: ProductType[] = [];
      if (productsResult.success && Array.isArray(productsResult.data)) { 
          productsDataToSet = productsResult.data;
      } else if (Array.isArray(productsResult)) { 
          productsDataToSet = productsResult;
      } else {
          console.warn("Failed to fetch products or data format incorrect for products:", productsResult.message || "Unexpected product data format.");
      }
      setProducts(productsDataToSet.map((p: any) => {
        const productId = (p.id !== null && p.id !== undefined) ? String(p.id) : `fallback_prod_${Math.random().toString(36).substring(2, 9)}`;
        const createdAtStrProd = p.createdAt;
        return {
          ...p,
          id: productId,
          createdAt: createdAtStrProd ? (isValid(parseISO(String(createdAtStrProd).replace(" ", "T"))) ? parseISO(String(createdAtStrProd).replace(" ", "T")) : new Date()) : new Date(),
          stock: Number(p.stock) || 0,
          lowStockThreshold: Number(p.lowStockThreshold) || 0,
          priceTiers: typeof p.priceTiers === 'string' ? JSON.parse(p.priceTiers || '[]') : (p.priceTiers || []) 
        };
      }));

    } catch (err: any) {
      console.error("[Dashboard Fetch] Overall fetch error:", err);
      setError(err.message || "Failed to fetch dashboard data.");
      toast({ title: "Error", description: err.message || "Could not load dashboard data.", variant: "destructive" });
      setSales([]);
      setInvoices([]);
      setProducts([]);
    } finally {
      setIsLoading(false);
      console.log("[Dashboard Fetch] Fetch process completed.");
    }
  };
  
  useEffect(() => {
    setIsMounted(true);
    setCurrentUserRole(getCurrentUserRole());
    fetchData();
  }, [toast]); // Removed fetchData from dependencies to prevent re-fetch on every render if not careful

  const summaryStats = useMemo(() => {
    const totalRevenue = sales
      .filter(s => s.status === 'Completed')
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    
    const totalSalesCount = sales.length;

    const pendingInvoicesCount = invoices.filter(
      i => i.status === 'Draft' || i.status === 'Sent' || i.status === 'Overdue'
    ).length;

    const lowStockItemsCount = products.filter(
      p => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 0)
    ).length;

    return {
      totalRevenue,
      totalSales: totalSalesCount,
      pendingInvoices: pendingInvoicesCount,
      lowStockItems: lowStockItemsCount,
    };
  }, [sales, invoices, products]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  useEffect(() => {
    if (isLoading || error) return;

    const salesActivities: DashboardActivity[] = sales.map(s => {
      const originalSaleId = String(s.id || `fallback_sale_${Math.random().toString(36).substring(2,9)}`);
      return {
        id: `sale-${originalSaleId}`, 
        originalId: originalSaleId,
        date: new Date(s.createdAt || s.saleDate || Date.now()), 
        type: 'Sale',
        title: `Sale #${originalSaleId.includes('_') ? (originalSaleId.split('_')[1] || originalSaleId) : originalSaleId}`,
        subtitle: `Customer: ${s.customer?.name || 'N/A'}`,
        amount: Number(s.totalAmount) || 0,
        icon: ShoppingCart,
        iconColorClass: 'text-green-500',
        link: `/sales/${originalSaleId}`
      };
    });

    const invoiceActivities: DashboardActivity[] = invoices.map(i => {
      const originalInvoiceId = String(i.id || `fallback_inv_${Math.random().toString(36).substring(2,9)}`);
      return {
        id: `invoice-${originalInvoiceId}`, 
        originalId: originalInvoiceId,
        date: new Date(i.createdAt || i.issueDate || Date.now()),
        type: 'Invoice',
        title: `Invoice ${i.invoiceNumber || originalInvoiceId}`,
        subtitle: `Status: ${i.status}`,
        amount: Number(i.totalAmount) || 0,
        icon: FileText,
        iconColorClass: 'text-blue-500',
        link: `/invoices/${originalInvoiceId}`
      };
    });

    const combined = [...salesActivities, ...invoiceActivities]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5); 

    setRecentActivities(combined);
  }, [sales, invoices, isLoading, error]);

  const canUser = (allowedRoles: UserRole[]): boolean => {
    if (!isMounted || !currentUserRole) return false;
    if (currentUserRole === 'Admin') return true;
    return allowedRoles.includes(currentUserRole);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-lg font-semibold text-destructive">Failed to load dashboard data</p>
        <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button onClick={() => fetchData()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Completed Sales)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Recorded</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summaryStats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Needs reordering</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Sales Coordinator specific */}
            {canUser(['SalesCoordinator']) && (
              <>
                <Link href="/sales/new" passHref><Button className="w-full"><ShoppingCart className="mr-2 h-4 w-4" /> New Sale</Button></Link>
                <Link href="/invoices/new" passHref><Button className="w-full"><FileText className="mr-2 h-4 w-4" /> New Invoice</Button></Link>
                <Link href="/products/new" passHref><Button className="w-full"><Package className="mr-2 h-4 w-4" /> Add Product</Button></Link>
                <Link href="/ledger-accounts/new" passHref><Button className="w-full"><Users className="mr-2 h-4 w-4" /> Add Ledger Account</Button></Link>
              </>
            )}

            {/* Finance specific */}
            {canUser(['Finance']) && (
              <>
                <Link href="/receipts" passHref><Button className="w-full"><ReceiptText className="mr-2 h-4 w-4" /> Receipts</Button></Link>
                <Link href="/receipts/activity-log" passHref><Button className="w-full"><ListChecks className="mr-2 h-4 w-4" /> Receipt Log</Button></Link>
                <Link href="/credit-notes/new" passHref><Button className="w-full"><NotebookPen className="mr-2 h-4 w-4" /> New Credit Note</Button></Link>
              </>
            )}
            
            {/* Common Actions visible to multiple roles */}
            {canUser(['Finance', 'SalesCoordinator', 'Purchases', 'Store', 'Admin']) && (
              <Link href="/activities" passHref>
                <Button className="w-full"><Activity className="mr-2 h-4 w-4" /> View All Activities</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of recent transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <ul className="space-y-3">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="flex items-center justify-between"> 
                    <div className="flex items-center gap-2">
                      <activity.icon className={cn("h-5 w-5", activity.iconColorClass)} />
                      <div>
                        <p className="font-medium">
                          {activity.link ? <Link href={activity.link} className="hover:underline">{activity.title}</Link> : activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        {activity.amount !== undefined && (
                            <span className="text-sm font-semibold">{formatCurrency(activity.amount)}</span>
                        )}
                        <p className="text-xs text-muted-foreground">{activity.date instanceof Date && isValid(activity.date) ? format(activity.date, 'PP') : 'Invalid Date'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No recent sales or invoice activities found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
