
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Search, FileDown, Edit, Eye, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react'; // Added Trash2
import type { Product, Sale, PriceTier, UnitOfMeasure, ProductCategory } from '@/types'; // Added ProductCategory
import { productCategories, unitsOfMeasure } from '@/types'; // Added unitsOfMeasure
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';


export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const { toast } = useToast();

  const [selectedProductForDelete, setSelectedProductForDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


  useEffect(() => {
    setIsLoadingProducts(true);
    console.log("[ProductsPage] Fetching products from get_formatted_products.php...");
    fetch("https://sajfoods.net/busa-api/database/get_formatted_products.php") 
      .then(async (res) => {
        const responseText = await res.text(); 
        if (!res.ok) {
          console.error(`[ProductsPage] Products fetch failed from get_formatted_products.php: ${res.status} ${res.statusText}. Raw response:`, responseText.substring(0, 500));
          let errorMessage = `Products fetch failed: ${res.status} ${res.statusText}.`;
          try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.message || errorMessage;
          } catch (e) {
            errorMessage = `${errorMessage} Server response: ${responseText.substring(0,100)}...`;
          }
          throw new Error(errorMessage);
        }
        try {
          return JSON.parse(responseText); 
        } catch (e: any) {
          console.error("[ProductsPage] Failed to parse product response from get_formatted_products.php as JSON. Raw response:", responseText.substring(0, 500));
          throw new Error(`Could not parse product data: ${e.message}. Check server response format.`);
        }
      })
      .then((data: Product[] | { success?: boolean; data?: Product[]; message?: string }) => {
        console.log("[ProductsPage] Raw Products Data (from get_formatted_products.php):", JSON.stringify(data, null, 2));
        
        let productsToSet: any[] = []; // Use any[] initially for raw data
        if (Array.isArray(data)) {
          productsToSet = data;
        } else if (data && data.success === true && Array.isArray(data.data)) {
          productsToSet = data.data;
        } else if (data && data.success === false && data.message) {
           toast({ title: "Info", description: `Products: ${data.message}`, variant: "default" });
        } else if (data && typeof data === 'object' && !Array.isArray(data) && data.hasOwnProperty('message')) {
          console.error("[ProductsPage] Error from API (Products - get_formatted_products.php):", (data as any).message);
          toast({ title: "Error Loading Products", description: (data as any).message || "Could not load products.", variant: "destructive" });
        } else {
          console.error("[ProductsPage] Unexpected product data format (from get_formatted_products.php):", data);
          toast({ title: "Error Loading Products", description: "Could not load products: Unexpected data format from server.", variant: "destructive" });
        }

        console.log("[ProductsPage] Products extracted for mapping (first 2 raw):", JSON.stringify(productsToSet.slice(0, 2), null, 2));

        const mappedProducts = productsToSet.map((p_raw: any, index: number) => {
          const p = p_raw as any; 
          // console.log(`[ProductsPage] Processing raw product [${index}]: ID ${p.id}, Name: ${p.name}`);

          let parsedPriceTiers: PriceTier[] = [];
          if (typeof p.priceTiers === 'string') {
            if (p.priceTiers === "0" || p.priceTiers.trim() === "" || p.priceTiers.toLowerCase() === "null") {
              parsedPriceTiers = [];
            } else {
              try {
                // Attempt to parse, assuming it might be escaped JSON string
                const tempParsed = JSON.parse(p.priceTiers);
                if (Array.isArray(tempParsed) && tempParsed.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier && typeof tier.priceLevel === 'string')) {
                  // Ensure price is a number
                  parsedPriceTiers = tempParsed.map(tier => ({...tier, price: Number(tier.price)}));
                } else {
                  console.warn(`[ProductsPage] Product ID ${p.id}: Parsed priceTiers string is not a valid PriceTier[]. Input: '${p.priceTiers}'. Parsed:`, tempParsed, ". Setting to [].");
                  parsedPriceTiers = [];
                }
              } catch (e) {
                console.warn(`[ProductsPage] Product ID ${p.id}: Failed to parse priceTiers string '${p.priceTiers}'. Error:`, e, ". Setting to [].");
                parsedPriceTiers = [];
              }
            }
          } else if (Array.isArray(p.priceTiers)) {
             if (p.priceTiers.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier && typeof tier.priceLevel === 'string')) {
                parsedPriceTiers = p.priceTiers.map(tier => ({...tier, price: Number(tier.price)}));
             } else {
                console.warn(`[ProductsPage] Product ID ${p.id}: priceTiers array contains invalid PriceTier objects. Value:`, p.priceTiers, ". Setting to [].");
                parsedPriceTiers = [];
             }
          } else if (p.priceTiers !== null && p.priceTiers !== undefined) {
            console.warn(`[ProductsPage] Product ID ${p.id}: priceTiers is neither string nor valid array. Type:`, typeof p.priceTiers, "Value:", p.priceTiers, ". Setting to [].");
            parsedPriceTiers = [];
          }

          let validUnitOfMeasure: UnitOfMeasure = 'PCS'; 
          if (p.unitOfMeasure && typeof p.unitOfMeasure === 'string' && p.unitOfMeasure !== "0" && unitsOfMeasure.includes(p.unitOfMeasure as UnitOfMeasure)) {
            validUnitOfMeasure = p.unitOfMeasure as UnitOfMeasure;
          } else if (p.unitOfMeasure === "0" || (p.unitOfMeasure && !unitsOfMeasure.includes(p.unitOfMeasure as UnitOfMeasure))) {
            // console.warn(`[ProductsPage] Product ID ${p.id}: Invalid unitOfMeasure "${p.unitOfMeasure}". Defaulting to PCS.`);
          }
          
          const parseDateSafely = (dateInput: any, fieldName: string): Date => {
            if (!dateInput || String(dateInput).trim() === "0000-00-00 00:00:00" || String(dateInput).trim() === "0000-00-00") {
              return new Date(0); 
            }
            // Try parsing with space and 'T' separator for ISO 8601 robustness
            let date = new Date(String(dateInput).replace(" ", "T"));
            if (isValid(date)) {
                return date;
            }
            // Fallback for simple YYYY-MM-DD
            date = parseISO(String(dateInput));
            if (isValid(date)) {
                return date;
            }
            console.warn(`[ProductsPage] Product ID ${p.id}: Could not parse ${fieldName}: "${dateInput}". Defaulting to epoch.`);
            return new Date(0); 
          };

          const createdAtDate = parseDateSafely(p.createdAt, 'createdAt');
          const updatedAtDate = parseDateSafely(p.updatedAt, 'updatedAt');

          const mappedProduct: Product = {
            id: String(p.id || `fallback_id_${index}`),
            name: String(p.name || 'Unnamed Product').trim(), // Trim any whitespace
            description: String(p.description || ''),
            price: Number(p.price || 0),
            costPrice: Number(p.costPrice || 0),
            priceTiers: parsedPriceTiers,
            productCategory: (p.productCategory && productCategories.includes(p.productCategory as ProductCategory)) ? p.productCategory as ProductCategory : 'Other Finished Good',
            alternateUnits: String(p.alternateUnits || ''),
            pcsPerUnit: Number(p.pcsPerUnit || 0),
            unitOfMeasure: validUnitOfMeasure,
            litres: Number(p.litres || 0),
            sku: String(p.sku || 'N/A'),
            stock: Number(p.stock || 0),
            lowStockThreshold: Number(p.lowStockThreshold || 10),
            imageUrl: String(p.imageUrl || ''),
            createdAt: createdAtDate,
            updatedAt: updatedAtDate,
          };
          // console.log(`[ProductsPage] Mapped product ID ${mappedProduct.id} (Raw SKU: ${p.sku}):`, mappedProduct);
          return mappedProduct;
        });
        console.log("[ProductsPage] Final Mapped Products (first 2):", JSON.stringify(mappedProducts.slice(0, 2), null, 2));
        setProducts(mappedProducts);
      })
      .catch((error) => {
        console.error("[ProductsPage] Catch Block - Failed to fetch products from get_formatted_products.php:", error);
        toast({ title: "Fetch Error", description: `Products: ${error.message}`, variant: "destructive" });
        setProducts([]);
      })
      .finally(() => {
        setIsLoadingProducts(false);
        console.log("[ProductsPage] Product fetching finished.");
      });

    setIsLoadingSales(true);
    console.log("[ProductsPage] Fetching sales data...");
    fetch("https://sajfoods.net/busa-api/database/get_sales.php")
      .then(async (res) => {
        const responseText = await res.text();
        if (!res.ok) {
            console.error(`[ProductsPage] Sales fetch failed: ${res.status} ${res.statusText}. Raw response:`, responseText.substring(0, 500));
            let errorMessage = `Sales fetch failed: ${res.status} ${res.statusText}.`;
            try { const errorJson = JSON.parse(responseText); errorMessage = errorJson.message || errorMessage; }
            catch (e) { errorMessage = `${errorMessage} Server response: ${responseText.substring(0,100)}...`; }
            throw new Error(errorMessage);
        }
        try { return JSON.parse(responseText); }
        catch (e: any) {
            console.error("[ProductsPage] Failed to parse successful sales response as JSON. Raw response:", responseText.substring(0, 500));
            throw new Error(`Could not parse sales data: ${e.message}.`);
        }
      })
      .then((data: { success?: boolean; data?: Sale[]; message?: string } | Sale[]) => {
        // console.log("[ProductsPage] Raw Sales Data:", JSON.stringify(data, null, 2));
        let salesToSet: any[] = [];
        if (Array.isArray(data)) {
            salesToSet = data;
        } else if (data && data.success === true && Array.isArray(data.data)) {
            salesToSet = data.data;
        } else if (data && data.success === false && data.message) {
            toast({ title: "Info", description: `Sales: ${data.message}`, variant: "default" });
        } else if (data && typeof data === 'object' && !Array.isArray(data) && data.hasOwnProperty('message')) {
            console.error("[ProductsPage] Error from API (Sales):", (data as any).message);
            toast({ title: "Error Loading Sales", description: (data as any).message || "Could not load sales data.", variant: "destructive" });
        } else {
            console.error("[ProductsPage] Unexpected sales data format:", data);
            toast({ title: "Error Loading Sales Data", description: "Could not load sales: Unexpected data format.", variant: "destructive" });
        }
        
        const processedSales = salesToSet.map(sale_raw => {
          const sale = sale_raw as any;
          let parsedSaleDate = null;
          if (sale.saleDate) {
            const dateStr = String(sale.saleDate);
            const dateAttempt = dateStr.includes(" ") ? parseISO(dateStr.replace(" ", "T")) : parseISO(dateStr);
            if (isValid(dateAttempt)) {
              parsedSaleDate = dateAttempt;
            } else {
              // console.warn(`[ProductsPage] Invalid saleDate encountered for sale ID ${sale.id}:`, sale.saleDate);
            }
          } else {
            //  console.warn(`[ProductsPage] Missing saleDate for sale ID ${sale.id}`);
          }
          return {
            ...sale,
            saleDate: parsedSaleDate || new Date(0), 
            items: Array.isArray(sale.items) ? sale.items.map((item_raw: any) => ({...item_raw, quantity: Number(item_raw.quantity || 0)})) : []
          };
        });
        // console.log("[ProductsPage] Processed Sales Data (first 2):", JSON.stringify(processedSales.slice(0,2), null, 2));
        setSales(processedSales);

        const months = new Set<string>();
        processedSales.forEach(sale => {
          if (sale.saleDate && isValid(sale.saleDate) && sale.saleDate.getTime() !== 0) { 
            months.add(format(sale.saleDate, 'yyyy-MM'));
          }
        });
        setAvailableMonths(Array.from(months).sort((a, b) => b.localeCompare(a)));
        // console.log("[ProductsPage] Available Months:", Array.from(months).sort((a, b) => b.localeCompare(a)));

      })
      .catch((error) => {
        console.error("[ProductsPage] Catch Block - Failed to fetch sales data:", error);
        toast({ title: "Fetch Error", description: `Sales: ${error.message}`, variant: "destructive" });
        setSales([]);
      })
      .finally(() => {
        setIsLoadingSales(false);
        console.log("[ProductsPage] Sales fetching finished.");
      });
  }, [toast]);

  const productsWithSalesData = useMemo(() => {
    if (isLoadingProducts || isLoadingSales) return [];
    // console.log(`[ProductsPage] Calculating quantitySold. Products: ${products.length}, Sales: ${sales.length}, Month: ${selectedMonth}`);

    return products.map(product => {
      let quantitySold = 0;
      sales.forEach(sale => {
        if (!sale.saleDate || !isValid(sale.saleDate) || sale.saleDate.getTime() === 0) return; 

        const saleMonth = format(sale.saleDate, 'yyyy-MM');
        if (selectedMonth === 'all' || saleMonth === selectedMonth) {
          (sale.items || []).forEach(item => {
            if (item.productId === product.id && typeof item.quantity === 'number') {
              quantitySold += item.quantity;
            }
          });
        }
      });
      return { ...product, quantitySold };
    });
  }, [products, sales, selectedMonth, isLoadingProducts, isLoadingSales]);

  const filteredProducts = useMemo(() =>
    productsWithSalesData.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.productCategory && product.productCategory.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [productsWithSalesData, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProductForDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProductForDelete) return;
  
    try {
      console.log(`[ProductsPage] Deleting product ID: ${selectedProductForDelete.id}`);
      const res = await fetch("https://sajfoods.net/busa-api/database/delete_product.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProductForDelete.id }),
      });
  
      const result = await res.json();
      console.log(`[ProductsPage] Delete response for product ID ${selectedProductForDelete.id}:`, result);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== selectedProductForDelete.id));
        toast({ title: "Success", description: `Product "${selectedProductForDelete.name}" deleted successfully.`, variant: "default" });
      } else {
        toast({ title: "Error", description: result.message || "Failed to delete product.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error(`[ProductsPage] Error deleting product ID ${selectedProductForDelete.id}:`, err);
      toast({ title: "Error", description: err.message || "Error deleting product.", variant: "destructive" });
    }
    setIsDeleteModalOpen(false);
    setSelectedProductForDelete(null);
  };


  if (isLoadingProducts && products.length === 0) { 
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2"/>Loading products...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Finished Goods Catalog</h1>
        <div className="flex items-center gap-2">
          <Link href="/products/new">
            <Button> <PlusCircle className="mr-2 h-4 w-4" /> Add Product </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>Manage your finished products and view sales data.</CardDescription>
          <div className="flex flex-col md:flex-row md:items-end gap-4 mt-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products by name, SKU, or category..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <div className="w-full md:w-auto md:min-w-[200px]">
              <Label htmlFor="month-filter" className="sr-only">Filter by Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoadingSales}>
                <SelectTrigger id="month-filter">
                  <SelectValue placeholder={isLoadingSales ? "Loading months..." : "Select month"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {format(parseISO(month + '-01'), 'MMMM yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <TableHead className="hidden md:table-cell text-right">Stock</TableHead>
                <TableHead className="text-right">Price (NGN)</TableHead>
                <TableHead className="text-right">Sold (Period)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingProducts || isLoadingSales ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      <span>Loading product and sales data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length > 0 ? filteredProducts.map((product) => (
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
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/48x48.png?text=Error"; }}
                      />
                    ) : (
                      <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground h-12 w-12">
                        No Img
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.productCategory}</TableCell>
                  <TableCell>{product.unitOfMeasure} {product.unitOfMeasure === 'Litres' && product.litres ? `(${product.litres}L)` : ''}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">{product.stock.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="text-right">{product.quantitySold?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/products/${product.id}/edit`} passHref><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit Product</DropdownMenuItem></Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(product)} className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive-foreground">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24">
                    No products found.
                    {searchTerm && " Try adjusting your search or filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products.
          </div>
        </CardFooter>
      </Card>
      
      {selectedProductForDelete && (
        <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete product &quot;<strong>{selectedProductForDelete.name}</strong>&quot; (SKU: {selectedProductForDelete.sku})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteModalOpen(false); setSelectedProductForDelete(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    

