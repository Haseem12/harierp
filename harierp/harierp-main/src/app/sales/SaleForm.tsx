
"use client";

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerComponent } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, Calendar as CalendarIcon, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Sale, SaleItem, Product, LedgerAccount, Invoice, UnitOfMeasure, PriceTier } from '@/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Switch } from "@/components/ui/switch";


interface SaleFormProps {
  sale?: Sale;
  onSave: (sale: Sale) => void;
}

const newEmptyItem = (): Omit<SaleItem, 'productName' | 'unitPrice' | 'totalPrice'> & { productId: string; appliedPriceLevel?: string } => ({
  productId: '',
  quantity: 1,
  appliedPriceLevel: undefined,
});


export default function SaleForm({ sale: existingSale, onSave }: SaleFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fetchedLedgerAccounts, setFetchedLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [isLoadingLedgers, setIsLoadingLedgers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(existingSale?.customer.id);
  const [selectedCustomer, setSelectedCustomer] = useState<LedgerAccount | null>(null);

  const [hasMounted, setHasMounted] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | undefined>(undefined);


  useEffect(() => {
    setHasMounted(true);
    if (existingSale?.saleDate) {
      try {
        const parsedDate = new Date(existingSale.saleDate as any); // Assuming saleDate can be string from backend
        if (!isNaN(parsedDate.getTime())) {
          setSaleDate(parsedDate);
        } else {
          console.warn("Invalid existingSale.saleDate received:", existingSale.saleDate);
          setSaleDate(new Date()); // Fallback
        }
      } catch (e) {
        console.error("Error parsing existingSale.saleDate:", e);
        setSaleDate(new Date()); // Fallback
      }
    } else if (!saleDate && !existingSale) { // Only set to new Date if it's a new sale and not yet set
      setSaleDate(new Date());
    }
  }, [existingSale]);


  const [items, setItems] = useState<Array<Partial<SaleItem> & { productId: string; appliedPriceLevel?: string }>>(
    existingSale?.items.map(item => ({
      ...item,
      productId: item.productId,
      unitOfMeasure: item.unitOfMeasure as UnitOfMeasure | undefined,
      appliedPriceLevel: 'Standard Price' // Placeholder, will be recalculated
    })) || [newEmptyItem()]
  );

  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>(existingSale?.paymentMethod || 'Cash');
  const [notes, setNotes] = useState(existingSale?.notes || '');
  const [discountAmount, setDiscountAmount] = useState(existingSale?.discountAmount || 0);
  const [applyTax, setApplyTax] = useState(true); // Default to true (tax applied)
  const TAX_RATE = 0.075;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("customer-products");


  const determinePriceDetails = useCallback((product: Product, customer: LedgerAccount | null): { price: number; appliedPriceLevel: string } => {
    if (!product) return { price: 0, appliedPriceLevel: 'N/A' };
    
    let productPriceTiers: PriceTier[] = [];
    if (Array.isArray(product.priceTiers)) {
        productPriceTiers = product.priceTiers;
    } else if (typeof product.priceTiers === 'string' && product.priceTiers.trim() !== '') {
        try {
            const parsed = JSON.parse(product.priceTiers);
            if (Array.isArray(parsed) && parsed.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                productPriceTiers = parsed;
            } else {
                 console.warn("Parsed priceTiers string for product", product.name, "is not a valid PriceTier[] during price determination. Received:", parsed);
                 productPriceTiers = [];
            }
        } catch (e) { 
          console.error("Failed to parse priceTiers string during price determination for product:", product.name, e);
          productPriceTiers = [];
        }
    } else if (product.priceTiers && typeof product.priceTiers !== 'string' && !Array.isArray(product.priceTiers)) { 
         console.warn("priceTiers for product", product.name, "is neither string nor valid array during price determination. Initializing as empty. Received type:", typeof product.priceTiers, "Value:", product.priceTiers);
         productPriceTiers = [];
    } else if (product.priceTiers === null || product.priceTiers === undefined) {
        // Ensure it's an empty array if null or undefined
        productPriceTiers = [];
    }


    if (!customer || !customer.priceLevel) {
        return { price: product.price, appliedPriceLevel: 'Standard Price' };
    }
    
    const priceLevelToUse = customer.priceLevel;
    const tieredPriceEntry = productPriceTiers.find(tier => tier.priceLevel === priceLevelToUse);
    
    if (tieredPriceEntry) {
        return { price: tieredPriceEntry.price, appliedPriceLevel: priceLevelToUse };
    } else {
        return { price: product.price, appliedPriceLevel: 'Standard Price (Fallback)' };
    }
  }, []);

  useEffect(() => {
    setIsLoadingLedgers(true);
    fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php')
      .then(async res => {
        if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to get error text from response.");
            console.error("Raw error response (Ledger Accounts Fetch):", errorText);
            throw new Error(`HTTP error! Ledger Accounts status: ${res.status} - ${errorText.substring(0, 200)}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await res.text();
          console.warn("Non-JSON response from getLedgerAccounts.php:", responseText.substring(0, 200) + "...");
          throw new Error(`Expected JSON, got ${contentType}. Response: ${responseText.substring(0,100)}...`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedLedgerAccounts(data.data);
        } else {
          toast({ title: "Error", description: `Failed to fetch ledger accounts: ${data.message || 'Unknown error or unexpected data format.'}`, variant: "destructive" });
          setFetchedLedgerAccounts([]);
        }
      })
      .catch(error => {
        console.error("Fetch Error (Ledger Accounts - SaleForm):", error);
        let description = error.message;
        if (error.message.includes("Unexpected token '<'")) {
            description = "Failed to fetch ledger accounts: Server returned an HTML error page instead of JSON. Check server logs.";
        }
        toast({ title: "Fetch Error", description: `Ledger accounts: ${description}`, variant: "destructive" });
        setFetchedLedgerAccounts([]);
      })
      .finally(() => setIsLoadingLedgers(false));

    setIsLoadingProducts(true);
    fetch('https://sajfoods.net/busa-api/database/get_products.php')
      .then(res => {
        if (!res.ok) {
            return res.text().then(text => { throw new Error(`HTTP error! Products status: ${res.status} - ${text.substring(0, 200)}`) });
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return res.text().then(text => { throw new Error(`Expected JSON for products, got ${contentType}. Response: ${text.substring(0, 200)}...`) });
        }
        return res.json();
      })
      .then((data) => {
        let productsToSet: any[] = [];
        if (data && data.success === true && Array.isArray(data.data)) {
            productsToSet = data.data;
        } else if (Array.isArray(data)) {
            productsToSet = data;
        } else {
             const errorMessage = (data && data.message) ? data.message : "Unexpected data format from server for products.";
             toast({ title: "Product Fetch Error", description: errorMessage, variant: "destructive" });
             setFetchedProducts([]);
             return;
        }

        const validProducts = productsToSet
          .map(p => {
              if (!p || typeof p.id !== 'string' || p.id.trim() === '') return null;
              let finalPriceTiers: PriceTier[] = [];
              if (typeof p.priceTiers === 'string') {
                  try {
                      const parsed = JSON.parse(p.priceTiers);
                      if (Array.isArray(parsed) && parsed.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                          finalPriceTiers = parsed;
                      }
                  } catch (e) { /* ignore parse error, will default to empty */ }
              } else if (Array.isArray(p.priceTiers)) {
                  finalPriceTiers = p.priceTiers;
              }
              return { ...p, priceTiers: finalPriceTiers };
          })
          .filter(Boolean) as Product[];
        
        setFetchedProducts(validProducts);
      })
      .catch(error => {
        console.error("Fetch Error (Products - SaleForm):", error);
         let description = error.message;
        if (error.message.includes("Unexpected token '<'")) {
            description = "Failed to fetch products: Server returned an HTML error page instead of JSON. Check server logs.";
        }
        toast({ title: "Fetch Error", description: `Products: ${description}`, variant: "destructive" });
        setFetchedProducts([]);
      })
      .finally(() => setIsLoadingProducts(false));
  }, [toast]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = fetchedLedgerAccounts.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, fetchedLedgerAccounts]);

  // Recalculate item prices when customer or products change
  useEffect(() => {
    // Only proceed if products are loaded and either a customer is selected or no customer is needed (e.g. cash sale with standard pricing)
    if (fetchedProducts.length > 0 && (selectedCustomer || !selectedCustomerId)) {
      setItems(prevItems => prevItems.map(item => {
        if (item.productId) {
          const product = fetchedProducts.find(p => p.id === item.productId);
          if (product) {
            const priceDetails = determinePriceDetails(product, selectedCustomer);
            return {
              ...item,
              productName: product.name,
              unitPrice: priceDetails.price,
              totalPrice: priceDetails.price * (item.quantity || 1),
              unitOfMeasure: product.unitOfMeasure,
              appliedPriceLevel: priceDetails.appliedPriceLevel
            };
          }
        }
        return item; // Return item as is if product not found or productId is missing
      }));
    }
  }, [selectedCustomer, selectedCustomerId, fetchedProducts, determinePriceDetails]);


  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    // Prices will recalculate via the useEffect hook above
  };

  const handleItemChange = (index: number, field: keyof SaleItem | 'productId' | 'appliedPriceLevel', value: string | number) => {
    const updatedItems = [...items];
    const currentItem = { ...updatedItems[index] } as Partial<SaleItem> & { productId: string; appliedPriceLevel?: string };

    if (field === 'productId') {
      currentItem.productId = value as string;
      const product = fetchedProducts.find(p => p.id === currentItem.productId);
      if (product) {
          currentItem.productName = product.name;
          currentItem.unitOfMeasure = product.unitOfMeasure;
          const priceDetails = determinePriceDetails(product, selectedCustomer); // Recalculate price based on new product and current customer
          currentItem.unitPrice = priceDetails.price;
          currentItem.appliedPriceLevel = priceDetails.appliedPriceLevel;
      } else {
           currentItem.productName = ''; currentItem.unitPrice = 0; currentItem.unitOfMeasure = undefined; currentItem.appliedPriceLevel = undefined;
      }
    } else if (field === 'quantity') {
      currentItem.quantity = Number(value) || 0;
    }
    // Always recalculate total price
    currentItem.totalPrice = (currentItem.unitPrice || 0) * (currentItem.quantity || 0);
    updatedItems[index] = currentItem;
    setItems(updatedItems);
  };

  const addItem = () => setItems([...items, newEmptyItem()]);
  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems.length > 0 ? updatedItems : [newEmptyItem()]);
  };

  const subTotal = useMemo(() => items.reduce((sum, item) => sum + (item.totalPrice || 0), 0), [items]);
  const calculatedDiscountAmount = discountAmount || 0;
  const taxAmount = useMemo(() => applyTax ? (subTotal - calculatedDiscountAmount) * TAX_RATE : 0, [subTotal, calculatedDiscountAmount, TAX_RATE, applyTax]);
  const totalAmount = useMemo(() => subTotal - calculatedDiscountAmount + taxAmount, [subTotal, calculatedDiscountAmount, taxAmount]);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedCustomer || !saleDate || items.some(item => !item.productId || !item.quantity || item.quantity <= 0)) {
      toast({ title: "Missing Information", description: "Customer, sale date, and valid items are required.", variant: "destructive" });
      setIsSubmitting(false); return;
    }

    const finalSaleItems: SaleItem[] = [];
    let stockSufficient = true;
    for (const item of items) {
      const product = fetchedProducts.find(p => p.id === item.productId);
      if (!product) {
        toast({ title: "Error", description: `Product ${item.productName || item.productId} not found.`, variant: "destructive" });
        stockSufficient = false; break;
      }
      if (product.stock < (item.quantity || 0) && !existingSale) { // Check stock only for new sales
        toast({ title: "Insufficient Stock", description: `Not enough stock for ${product.name}. Available: ${product.stock}.`, variant: "destructive" });
        stockSufficient = false; break;
      }
      const priceDetails = determinePriceDetails(product, selectedCustomer); // Use the helper
      finalSaleItems.push({
        productId: item.productId!, productName: product.name, quantity: item.quantity!,
        unitPrice: priceDetails.price, totalPrice: priceDetails.price * item.quantity!, unitOfMeasure: product.unitOfMeasure!,
      });
    }
    if (!stockSufficient) { setIsSubmitting(false); return; }

    const salePayload: any = {
      id: existingSale?.id,
      saleDate: format(saleDate, "yyyy-MM-dd HH:mm:ss"),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.phone,
      customerAddress: selectedCustomer.address,
      customerPriceLevel: selectedCustomer.priceLevel,
      items: finalSaleItems,
      subTotal,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      taxAmount: taxAmount,
      totalAmount,
      paymentMethod,
      status: (paymentMethod === 'Credit' && totalAmount > 0) ? 'Pending' : 'Completed',
      notes: notes || null,
      createdAt: existingSale?.createdAt ? format(new Date(existingSale.createdAt as any), "yyyy-MM-dd HH:mm:ss") : format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      updatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };
    
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_sale.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error response from server."); 
        console.error("Server Response Error Text (Sale):", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText || response.statusText}`);
      }
      const result = await response.json();

      if (result.success && result.saleId) {
        if (!existingSale) { 
          const updatedFetchedProducts = fetchedProducts.map(p => {
            const soldItem = finalSaleItems.find(si => si.productId === p.id);
            if (soldItem) return { ...p, stock: p.stock - soldItem.quantity };
            return p;
          });
          setFetchedProducts(updatedFetchedProducts);
        }

        const savedSaleDataForCallback = {
            ...salePayload,
            id: result.saleId,
            saleDate: new Date(salePayload.saleDate),
            createdAt: new Date(salePayload.createdAt),
            updatedAt: new Date(salePayload.updatedAt),
            customer: {
                id: selectedCustomer.id,
                name: selectedCustomer.name,
                priceLevel: selectedCustomer.priceLevel
            }
        } as Sale;
        onSave(savedSaleDataForCallback);

        toast({
          title: existingSale ? "Sale Updated" : "Sale Recorded",
          description: `Sale ID "${result.saleId}" has been processed.`,
        });
      } else {
        console.error("PHP Script Error (Sale):", result.message || "Unknown error from PHP script.");
        throw new Error(result.message || "Failed to save sale. No ID returned.");
      }
    } catch (error: any) {
      console.error("Full error object (Sale):", error);
      let description = error.message;
      if (error.message.includes("Failed to fetch")) {
        description = "Network error: Could not connect to the server. Please check your internet connection and server status.";
      }
      toast({ title: "Operation Failed", description: description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validProductsForDropdown = useMemo(() => {
    return Array.isArray(fetchedProducts)
      ? fetchedProducts.filter(p => {
          if (p && typeof p.id === 'string' && p.id.trim() !== '') {
            return true;
          }
          return false;
        })
      : [];
  }, [fetchedProducts]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <form id="sale-form" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{existingSale ? 'Edit Sale' : 'Record New Sale'}</CardTitle>
            <CardDescription>{existingSale ? `Editing sale ${existingSale.id}` : 'Fill in the details for the new sale.'}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="customer-products">Customer & Products</TabsTrigger>
              <TabsTrigger value="payment-summary">Payment & Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="customer-products" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="customer">Customer (Ledger Account) <span className="text-destructive">*</span></Label>
                  <Select onValueChange={handleCustomerChange} value={selectedCustomerId} required disabled={isLoadingLedgers}>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder={isLoadingLedgers ? "Loading Customers..." : "Select customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {fetchedLedgerAccounts?.filter(acc => ['Customer', 'Sales Rep', 'Premium Product', 'Standard Product'].includes(acc.accountType))
                        .map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.accountCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedCustomer && (
                    <div className="mt-2 text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
                       <div className="font-medium">Selected: {selectedCustomer.name}</div>
                       <div>Price Level: <Badge variant="secondary" className="ml-1">{selectedCustomer.priceLevel}</Badge></div>
                       <div>Zone: <Badge variant="outline" className="ml-1">{selectedCustomer.zone}</Badge></div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="saleDate">Sale Date <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !saleDate && "text-muted-foreground")} disabled={!hasMounted}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {hasMounted && saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={saleDate} onSelect={setSaleDate} initialFocus disabled={!hasMounted} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Card>
                <CardHeader><CardTitle>Sale Items</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                        <TableHead className="w-[30%]">Product</TableHead><TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead><TableHead>Applied Price Level</TableHead>
                        <TableHead className="text-right">Unit Price (NGN)</TableHead><TableHead className="text-right">Total (NGN)</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.productId || ""}
                              onValueChange={(value) => handleItemChange(index, 'productId', value)}
                              disabled={!selectedCustomer || isLoadingProducts}
                            >
                              <SelectTrigger><SelectValue placeholder={isLoadingProducts ? "Loading Products..." : "Select product"} /></SelectTrigger>
                              <SelectContent>
                                {validProductsForDropdown.map(product => {
                                    if (product && product.id && typeof product.id === 'string' && product.id.trim() !== '') {
                                      return (
                                        <SelectItem key={product.id} value={product.id}>
                                          {product.name} ({product.unitOfMeasure}
                                          {product.litres ? ` - ${product.litres}L` : ''})
                                          - Stock: {product.stock ?? 'N/A'}
                                        </SelectItem>
                                      );
                                    }
                                    return null;
                                  })}
                              </SelectContent>
                            </Select>
                            {!selectedCustomer && index === 0 && <div className="text-xs text-destructive mt-1">Select customer first.</div>}
                          </TableCell>
                          <TableCell><Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" disabled={!item.productId}/></TableCell>
                          <TableCell>{item.unitOfMeasure || 'N/A'}</TableCell>
                          <TableCell><Badge variant={item.appliedPriceLevel === 'Standard Price' || item.appliedPriceLevel === 'Standard Price (Fallback)' ? 'outline' : 'default'}>{item.appliedPriceLevel || 'N/A'}</Badge></TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.totalPrice || 0)}</TableCell>
                          <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4" disabled={!selectedCustomer || isLoadingProducts}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="payment-summary" className="space-y-6">
               <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>Payment & Notes</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select onValueChange={(value: Sale['paymentMethod']) => setPaymentMethod(value)} value={paymentMethod}>
                          <SelectTrigger id="paymentMethod"><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Transfer">Bank Transfer</SelectItem><SelectItem value="Online">Online Payment</SelectItem>
                            <SelectItem value="Credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" placeholder="Instructions or notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Sale Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between"><Label>Subtotal:</Label><span>{formatCurrency(subTotal)}</span></div>
                      <div className="flex justify-between items-center">
                        <Label htmlFor="discountAmount">Discount (NGN):</Label>
                        <Input id="discountAmount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} className="w-32 text-right" placeholder="0.00" min="0"/>
                      </div>
                       <div className="flex justify-between items-center py-2">
                        <Label htmlFor="applyTax" className="flex flex-row items-center gap-2 cursor-pointer">
                          Apply Tax ({(TAX_RATE * 100).toFixed(1)}%)
                        </Label>
                        <Switch
                          id="applyTax"
                          checked={applyTax}
                          onCheckedChange={setApplyTax}
                          aria-label="Apply Tax Toggle"
                        />
                      </div>
                      <div className="flex justify-between"><Label>Tax:</Label><span>{formatCurrency(taxAmount)}</span></div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><Label>Total Amount:</Label><span>{formatCurrency(totalAmount)}</span></div>
                    </CardContent>
                  </Card>
              </div>
            </TabsContent>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isLoadingLedgers || isLoadingProducts}>Cancel</Button>
            <Button type="submit" form="sale-form" disabled={!hasMounted || isSubmitting || isLoadingLedgers || isLoadingProducts || !selectedCustomer || items.some(item => !item.productId || !item.quantity || item.quantity <= 0) }>
              {isSubmitting ? (existingSale ? 'Updating...' : 'Processing...') : 'Record Sale'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Tabs>
  );
}
