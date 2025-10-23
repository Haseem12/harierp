
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, PackagePlus, Layers, Edit, AlertTriangle, CheckCircle2, PlusCircle, CalendarDays, RefreshCw, ListChecks } from 'lucide-react';
import type { Product, Sale, CreditNote, SaleItem as CreditNoteSaleItem, ProductCategory, UnitOfMeasure, PriceTier } from '@/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';

export default function ProductStockManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingCreditNotes, setIsLoadingCreditNotes] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const parseApiDateString = useCallback((dateString: string | undefined | null | Date): Date | null => {
    if (!dateString) return null;
    if (dateString instanceof Date) {
        return isValid(dateString) ? dateString : null;
    }
    
    const normalizedDateString = String(dateString).replace(" ", "T"); 
    let parsed = parseISO(normalizedDateString);

    if (isValid(parsed)) {
        return parsed;
    } else {
        const parts = String(dateString).split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; 
            const day = parseInt(parts[2].substring(0,2), 10); 
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                const directDate = new Date(year, month, day);
                if (isValid(directDate)) return directDate;
            }
        }
        console.warn(`[DateParse StockMngmt] Failed to parse date string: ${dateString}, normalized: ${normalizedDateString}`);
        return null;
    }
  }, []);


  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setIsLoadingSales(true);
      setIsLoadingCreditNotes(true);
      try {
        const productsRes = await fetch("https://sajfoods.net/busa-api/database/get_products.php");
        if (!productsRes.ok) {
          const errorText = await productsRes.text().catch(() => `Products fetch failed: ${productsRes.statusText}`);
          throw new Error(`Products fetch failed: ${productsRes.status} - ${errorText.substring(0,100)}`);
        }
        
        let productsData;
        try {
          productsData = await productsRes.json();
        } catch (jsonError: any) {
           let responseTextForError = "Could not read response body for JSON parse error.";
           try {
             const textResponse = await productsRes.clone().text(); // Clone to read text
             responseTextForError = textResponse.substring(0, 500);
           } catch (textReadError) {
             console.error("[StockMngmt Fetch Error] Could not read response text after JSON parse failure for products:", textReadError);
           }
          throw new Error(`Failed to parse product data as JSON: ${jsonError.message}. Response (partial): ${responseTextForError}`);
        }

        if (productsData && productsData.success === true && Array.isArray(productsData.data)) {
          setProducts(productsData.data.map((p: any) => ({
            ...p,
            id: String(p.id || `fallback_prod_${Math.random().toString(36).substring(2, 9)}`),
            name: String(p.name || 'Unnamed Product'),
            stock: Number(p.stock || 0),
            lowStockThreshold: Number(p.lowStockThreshold || 0),
            createdAt: parseApiDateString(p.createdAt) || new Date(0),
            updatedAt: parseApiDateString(p.updatedAt) || new Date(0),
            priceTiers: typeof p.priceTiers === 'string' && p.priceTiers.trim() !== '' && p.priceTiers !== "0" ? JSON.parse(p.priceTiers) : (Array.isArray(p.priceTiers) ? p.priceTiers : []),
          } as Product)));
        } else if (Array.isArray(productsData)) { 
          setProducts(productsData.map((p: any) => ({
            ...p,
            id: String(p.id || `fallback_prod_arr_${Math.random().toString(36).substring(2, 9)}`),
            name: String(p.name || 'Unnamed Product (Array)'),
            stock: Number(p.stock || 0),
            lowStockThreshold: Number(p.lowStockThreshold || 0),
            createdAt: parseApiDateString(p.createdAt) || new Date(0),
            updatedAt: parseApiDateString(p.updatedAt) || new Date(0),
            priceTiers: typeof p.priceTiers === 'string' && p.priceTiers.trim() !== '' && p.priceTiers !== "0" ? JSON.parse(p.priceTiers) : (Array.isArray(p.priceTiers) ? p.priceTiers : []),
          } as Product)));
        }
        else {
          toast({ title: "Error Loading Products", description: productsData?.message || "Could not load products: Unexpected data format from server.", variant: "destructive" });
          setProducts([]);
        }

        const salesRes = await fetch("https://sajfoods.net/busa-api/database/get_sales.php");
        if (!salesRes.ok) throw new Error(`Sales fetch failed: ${salesRes.status}`);
        const salesData = await salesRes.json();
        if (salesData.success && Array.isArray(salesData.data)) {
          setSales(salesData.data.map((s:any) => ({
            ...s,
            saleDate: parseApiDateString(s.saleDate) || new Date(0),
            items: Array.isArray(s.items) ? s.items.map((si:any) => ({...si, quantity: Number(si.quantity || 0)})) : []
          })));
        } else {
          toast({ title: "Error Loading Sales", description: salesData.message || "Could not load sales data.", variant: "destructive" });
          setSales([]);
        }
        setIsLoadingSales(false);

        const creditNotesRes = await fetch("https://sajfoods.net/busa-api/database/get_credit_notes.php");
        if (!creditNotesRes.ok) throw new Error(`Credit Notes fetch failed: ${creditNotesRes.status}`);
        const creditNotesData = await creditNotesRes.json();
        if (creditNotesData.success && Array.isArray(creditNotesData.data)) {
          setCreditNotes(creditNotesData.data.map((cn:any) => ({
            ...cn,
            creditNoteDate: parseApiDateString(cn.creditNoteDate) || new Date(0),
            items: Array.isArray(cn.items) ? cn.items.map((cni:any) => ({...cni, quantity: Number(cni.quantity || 0)})) : (typeof cn.items === 'string' && cn.items.trim() !== '' && cn.items.trim().toLowerCase() !== 'null' && cn.items.trim() !== '0' ? JSON.parse(cn.items) : [])
          })));
        } else {
          toast({ title: "Error Loading Credit Notes", description: creditNotesData.message || "Could not load credit notes.", variant: "destructive" });
          setCreditNotes([]);
        }
        setIsLoadingCreditNotes(false);

      } catch (error: any) {
        let description = error.message || 'Could not load data from the server.';
        if (error.message && (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("networkerror"))) {
            description = "Network Error: Could not connect to the server or the server is unresponsive.";
        }
        toast({ title: 'Error Fetching Data', description, variant: 'destructive' });
        setProducts([]); setSales([]); setCreditNotes([]);
      } finally {
        setIsLoading(false); setIsLoadingSales(false); setIsLoadingCreditNotes(false);
      }
    };
    fetchInitialData();
  }, [toast, parseApiDateString]);

  const filteredProducts = useMemo(() =>
    products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.productCategory && product.productCategory.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [products, searchTerm]);

  const productsWithNetSalesData = useMemo(() => {
    if (isLoadingSales || isLoadingCreditNotes || products.length === 0) {
        return filteredProducts.map(p => ({...p, netQuantitySoldInPeriod: 0}));
    }

    return filteredProducts.map(product => {
      let totalSoldInPeriod = 0;
      let totalReturnedInPeriod = 0;

      sales.forEach(sale => {
        const saleDate = sale.saleDate; 
        if (!saleDate || !isValid(saleDate) || (saleDate instanceof Date && saleDate.getTime() === 0)) return; 

        const isAfterFromDate = !fromDate || saleDate >= startOfDay(fromDate);
        const isBeforeToDate = !toDate || saleDate <= endOfDay(toDate);

        if (isAfterFromDate && isBeforeToDate) {
          (sale.items || []).forEach(item => {
            if (item.productId === product.id) {
              totalSoldInPeriod += Number(item.quantity || 0);
            }
          });
        }
      });

      creditNotes.forEach(cn => {
        if (cn.reason === 'Returned Goods' && Array.isArray(cn.items)) {
          const cnDate = cn.creditNoteDate;
          if (!cnDate || !isValid(cnDate) || (cnDate instanceof Date && cnDate.getTime() === 0)) return;

          const isAfterFromDate = !fromDate || cnDate >= startOfDay(fromDate);
          const isBeforeToDate = !toDate || cnDate <= endOfDay(toDate);

          if (isAfterFromDate && isBeforeToDate) {
            cn.items.forEach((item: CreditNoteSaleItem) => { 
              if (item.productId === product.id) {
                totalReturnedInPeriod += Number(item.quantity || 0);
              }
            });
          }
        }
      });
      const netSold = totalSoldInPeriod - totalReturnedInPeriod;
      return { ...product, netQuantitySoldInPeriod: netSold };
    });
  }, [filteredProducts, sales, creditNotes, fromDate, toDate, isLoadingSales, isLoadingCreditNotes, products.length]);


  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const getStockStatus = (product: Product): { text: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: React.ElementType } => {
    const threshold = product.lowStockThreshold || 10; 
    if (product.stock <= 0) {
      return { text: 'Out of Stock', variant: 'destructive', icon: AlertTriangle };
    }
    if (product.stock <= threshold) {
      return { text: 'Low Stock', variant: 'destructive', icon: AlertTriangle };
    }
    return { text: 'In Stock', variant: 'default', icon: CheckCircle2 };
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2"/>Loading product stock levels...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <h1 className="text-2xl font-semibold flex items-center">
          <Layers className="mr-2 h-6 w-6" /> Product Stock Management
        </h1>
        <div className="flex items-center gap-2">
           <Link href="/products/stock-management/log">
            <Button variant="outline"> <ListChecks className="mr-2 h-4 w-4" /> View Stock Log </Button>
          </Link>
           <Link href="/products/stock-management/add"> {/* Changed Link */}
            <Button> <PackagePlus className="mr-2 h-4 w-4" /> Add Stock </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Date Filters for Sales Data</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromDate" className="text-sm font-medium block mb-1">From Date</label>
            <DatePickerComponent date={fromDate} setDate={setFromDate} placeholder="Start date" />
          </div>
          <div>
            <label htmlFor="toDate" className="text-sm font-medium block mb-1">To Date</label>
            <DatePickerComponent date={toDate} setDate={setToDate} placeholder="End date" />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Finished Product Stock Levels</CardTitle>
          <CardDescription>View and manage current stock for your finished products. "Net Sold" reflects sales minus returns in the selected period.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name, SKU, or category..."
              className="pl-8 w-full md:w-1/2 lg:w-1/3"
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
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Net Sold (Period)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoadingSales || isLoadingCreditNotes) && productsWithNetSalesData.length === 0 && products.length > 0 ? (
                 <TableRow><TableCell colSpan={7} className="h-24 text-center"><RefreshCw className="h-6 w-6 animate-spin inline mr-2"/>Loading sales and returns data...</TableCell></TableRow>
              ) : productsWithNetSalesData.length > 0 ? productsWithNetSalesData.map((product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                      {product.imageUrl ? (
                         <Image
                          alt={product.name}
                          className="aspect-square rounded-md object-cover"
                          data-ai-hint="product image"
                          height="48"
                          src={product.imageUrl}
                          width="48"
                        />
                      ) : (
                        <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground h-12 w-12">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell className="text-right font-semibold">{product.stock}</TableCell>
                    <TableCell className="text-right">
                        {product.netQuantitySoldInPeriod ?? (isLoadingSales || isLoadingCreditNotes ? <span className="text-xs italic">Calculating...</span> : 'N/A')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={stockStatus.variant} className="flex items-center justify-center gap-1">
                        <stockStatus.icon className="h-3.5 w-3.5" />
                        {stockStatus.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      {/* The Add Stock button per row is removed, users will use the main Add Stock button */}
                      <Link href={`/products/${product.id}/edit`} passHref>
                        <Button size="sm" variant="ghost"><Edit className="mr-1 h-3.5 w-3.5"/>Edit Prod.</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                 <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No products found matching your criteria.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{productsWithNetSalesData.length}</strong> of <strong>{products.length}</strong> products.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    
