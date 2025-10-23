
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, PackagePlus, AlertTriangle, CheckCircle2, Edit, UserCircle2, MoreHorizontal, Trash2, RefreshCw, Warehouse, Droplets, Archive } from 'lucide-react';
import type { RawMaterial, LedgerAccount, MilkDelivery, MilkSupplier } from '@/types'; 
import Image from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { format, isValid, parseISO } from 'date-fns';

function SummaryCard({ icon: Icon, title, value, colorClass = "text-primary" }: { icon: React.ElementType; title: string; value: string; colorClass?: string }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function StoreInventoryPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]); 
  const [allGeneralSuppliers, setAllGeneralSuppliers] = useState<LedgerAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [materialsRes, suppliersRes] = await Promise.all([
        fetch("https://sajfoods.net/busa-api/database/get_raw_materials.php"),
        fetch("https://sajfoods.net/busa-api/database/getLedgerAccounts.php?type=Supplier"),
      ]);

      if (!materialsRes.ok) throw new Error(`Failed to fetch raw materials: ${materialsRes.status}`);
      const materialsData = await materialsRes.json();
      if (materialsData.success && Array.isArray(materialsData.data)) {
        setRawMaterials(materialsData.data.map((m:any) => ({...m, stock: Number(m.stock || 0), costPrice: Number(m.costPrice || 0), lowStockThreshold: Number(m.lowStockThreshold || 0) })));
      } else {
        setRawMaterials([]);
        toast({ title: "Error", description: materialsData.message || "Could not load store items.", variant: "destructive" });
      }

      if (!suppliersRes.ok) throw new Error(`Failed to fetch suppliers: ${suppliersRes.status}`);
      const suppliersData = await suppliersRes.json();
      if (suppliersData.success && Array.isArray(suppliersData.data)) {
        setAllGeneralSuppliers(suppliersData.data.filter((acc: LedgerAccount) => acc.accountType === 'Supplier'));
      } else {
        setAllGeneralSuppliers([]);
        console.warn("Could not load general supplier accounts:", suppliersData.message);
      }
      
    } catch (error: any) {
      toast({ title: "Fetch Error", description: error.message, variant: "destructive"});
      setRawMaterials([]);
      setAllGeneralSuppliers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    toast({title: "Refreshed", description: "Store data updated."});
  };

  const getGeneralSupplierName = (supplierId?: string): string => {
    if (!supplierId) return 'N/A';
    const supplier = allGeneralSuppliers.find(acc => acc.id === supplierId);
    return supplier ? supplier.name : 'Unknown';
  };

  const filteredRawMaterials = useMemo(() =>
    rawMaterials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.sku && material.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (material.category && material.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (material.supplierId && getGeneralSupplierName(material.supplierId).toLowerCase().includes(searchTerm.toLowerCase()))
    ), [rawMaterials, searchTerm, allGeneralSuppliers]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStockStatus = (material: RawMaterial): { text: string; variant: "default" | "destructive" | "secondary"; icon: React.ElementType } => {
    const threshold = material.lowStockThreshold || 10; 
    const stock = material.stock || 0;
    if (stock <= 0) {
      return { text: 'Out of Stock', variant: 'destructive', icon: AlertTriangle };
    }
    if (stock <= threshold) {
      return { text: 'Low Stock', variant: 'destructive', icon: AlertTriangle };
    }
    return { text: 'In Stock', variant: 'default', icon: CheckCircle2 };
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const materialToDelete = rawMaterials.find(m => m.id === materialId);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/delete_raw_material.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: materialId }),
      });
      const result = await response.json();
      if (result.success) {
        setRawMaterials(prev => prev.filter(m => m.id !== materialId));
        toast({
          title: "Store Item Deleted",
          description: `Item "${materialToDelete?.name}" has been removed.`,
        });
      } else {
        throw new Error(result.message || "Failed to delete item from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const waterTankLevel = useMemo(() => {
    const waterTank = rawMaterials.find(m => m.sku === 'RAW-WATER-TANK-001');
    return waterTank ? waterTank.stock : null;
  }, [rawMaterials]);
  
  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2"/> Loading store items...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Warehouse className="h-8 w-8" /> Store Management Dashboard
        </h1>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard 
          icon={Droplets} 
          title="Current Raw Water Tank Level" 
          value={waterTankLevel !== null ? `${waterTankLevel.toLocaleString()} Ltrs` : 'N/A'} 
          colorClass={waterTankLevel !== null && waterTankLevel < 2000 ? "text-amber-600" : "text-primary"}
        />
        <Link href="/store/new" className="block"><Button className="w-full h-full text-lg"><PackagePlus className="mr-2"/>Add New Store Item</Button></Link>
        <Link href="/store/usage/new" className="block"><Button className="w-full h-full text-lg"><Archive className="mr-2"/>Record Material Usage</Button></Link>
      </div>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Store Item Stock</CardTitle>
          <CardDescription>Monitor and manage current inventory levels of treatment chemicals, packaging, and other store items.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items by name, SKU, category, or supplier..."
              className="pl-8 w-full md:w-2/3 lg:w-1/2"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[80px] sm:table-cell">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="hidden md:table-cell">Supplier</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Cost Price (NGN)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRawMaterials.length > 0 ? filteredRawMaterials.map((material) => {
                const stockStatus = getStockStatus(material);
                return (
                  <TableRow key={material.id}>
                    <TableCell className="hidden sm:table-cell">
                      {material.imageUrl ? (
                         <Image
                          alt={material.name}
                          className="aspect-square rounded-md object-cover"
                          data-ai-hint="raw material image"
                          height="48"
                          src={material.imageUrl}
                          width="48"
                        />
                      ) : (
                        <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground h-12 w-12">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{material.name}</TableCell>
                    <TableCell>{material.sku}</TableCell>
                    <TableCell>{material.category}</TableCell>
                    <TableCell>{material.unitOfMeasure} {material.unitOfMeasure === 'Litres' && material.litres ? `(${material.litres}L)` : ''}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {material.supplierId ? (
                        <div className="flex items-center gap-1">
                          <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> 
                          {getGeneralSupplierName(material.supplierId)}
                        </div>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">{material.stock}</TableCell>
                    <TableCell className="text-right">{formatCurrency(material.costPrice)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={stockStatus.variant} className="flex items-center justify-center gap-1">
                        <stockStatus.icon className="h-3.5 w-3.5" />
                        {stockStatus.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/store/${material.id}/edit`} passHref>
                             <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete item "{material.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMaterial(material.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No store items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredRawMaterials.length}</strong> of <strong>{rawMaterials.length}</strong> items in store.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
