
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerComponent } from "@/components/ui/date-picker"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Invoice, SaleItem, Product, LedgerAccount, UnitOfMeasure, PriceTier } from '@/types';
import { defaultCompanyDetails } from '@/types';
import { format } from 'date-fns';

interface InvoiceFormProps {
  invoice?: Invoice; 
  onSave?: (invoice: Invoice) => void; 
}

const newEmptyItem = (): Omit<SaleItem, 'productName' | 'unitPrice' | 'totalPrice'> & { productId: string } => ({
  productId: '',
  quantity: 1,
});


export default function InvoiceForm({ invoice: existingInvoice, onSave }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [fetchedLedgerAccounts, setFetchedLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [isLoadingLedgers, setIsLoadingLedgers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [invoiceNumber, setInvoiceNumber] = useState(existingInvoice?.invoiceNumber || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(existingInvoice?.customer.id);
  const [selectedCustomer, setSelectedCustomer] = useState<LedgerAccount | null>(null);
  
  const [issueDate, setIssueDate] = useState<Date | undefined>(existingInvoice ? new Date(existingInvoice.issueDate) : new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(existingInvoice ? new Date(existingInvoice.dueDate) : new Date(new Date().setDate(new Date().getDate() + 15)));
  
  const [items, setItems] = useState<Array<Partial<SaleItem> & { productId: string }>>(
    existingInvoice?.items.map(item => ({...item, productId: item.productId, unitOfMeasure: item.unitOfMeasure as UnitOfMeasure | undefined })) || [newEmptyItem()]
  );
  
  const [notes, setNotes] = useState(existingInvoice?.notes || '');
  const [discountAmount, setDiscountAmount] = useState(existingInvoice?.discountAmount || 0);
  const TAX_RATE = 0.075; 
  const [status, setStatus] = useState<Invoice['status']>(existingInvoice?.status || 'Draft');


  const [isSubmitting, setIsSubmitting] = useState(false);

   useEffect(() => {
    setIsLoadingLedgers(true);
    fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php')
      .then(res => {
        if (!res.ok) {
             return res.text().then(text => { throw new Error(`HTTP error! Ledger Accounts status: ${res.status} - ${text}`) });
        }
        return res.json();
      })
      .then(data => {
        console.log("Fetched Ledger Accounts for InvoiceForm:", data);
        if (data.success && Array.isArray(data.data)) {
          setFetchedLedgerAccounts(data.data);
        } else {
          toast({ title: "Error", description: `Failed to fetch ledger accounts: ${data.message || 'Unknown error or unexpected data format.'}`, variant: "destructive" });
          setFetchedLedgerAccounts([]);
        }
      })
      .catch(error => {
        console.error("Fetch Error (Ledger Accounts - InvoiceForm):", error);
        toast({ title: "Fetch Error", description: `Ledger accounts: ${error.message}`, variant: "destructive" });
        setFetchedLedgerAccounts([]);
      })
      .finally(() => setIsLoadingLedgers(false));

    setIsLoadingProducts(true);
    fetch('https://sajfoods.net/busa-api/database/get_products.php')
      .then(res => {
        if (!res.ok) {
            return res.text().then(text => { throw new Error(`HTTP error! Products status: ${res.status} - ${text}`) });
        }
        return res.json();
      })
      .then((data: Product[] | { success?: boolean; data?: Product[]; message?: string }) => {
         console.log("Fetched Products for InvoiceForm:", data);
        let productsToSet: Product[] = [];
        if (Array.isArray(data)) { 
            productsToSet = data;
        } else if (data && typeof data === 'object' && 'success' in data && data.success === true && Array.isArray(data.data)) {
            productsToSet = data.data;
        } else if (data && typeof data === 'object' && 'success' in data && data.success === false && Array.isArray(data.data) && data.data.length === 0) {
            // This case handles {success: false, data: [], message: "No products found."}
            productsToSet = []; 
            if (data.message) {
                 toast({ title: "Product Fetch Info", description: `Products: ${data.message}`, variant: "default" });
            }
        } else if (data && typeof data === 'object' && 'message' in data) {
             console.error("Error fetching products from API (InvoiceForm):", (data as any).message);
             toast({ title: "Product Fetch Error", description: (data as any).message, variant: "destructive" });
        }
         else {
          console.error("Unexpected product data format (InvoiceForm):", data);
          toast({ title: "Error", description: `Failed to fetch products: Unexpected data format.`, variant: "destructive" });
        }
        
        const parsedProducts = productsToSet.map(p => {
            let finalPriceTiers: PriceTier[] = [];
            if (typeof p.priceTiers === 'string') {
                try { 
                    const parsed = JSON.parse(p.priceTiers);
                    if (Array.isArray(parsed) && parsed.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                        finalPriceTiers = parsed;
                    }
                } catch (e) { console.error("Failed to parse priceTiers for product (InvoiceForm):", p.name, p.priceTiers, e); }
            } else if (Array.isArray(p.priceTiers) && p.priceTiers.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                finalPriceTiers = p.priceTiers;
            }
            return { ...p, priceTiers: finalPriceTiers };
        });
        setFetchedProducts(parsedProducts);
      })
      .catch(error => {
        console.error("Fetch Error (Products - InvoiceForm):", error);
        toast({ title: "Fetch Error", description: `Products: ${error.message}`, variant: "destructive" });
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
  
  const determinePriceForCustomer = (product: Product, customer: LedgerAccount | null): number => {
    if (!customer || !customer.priceLevel) return product.price;
    
    let productPriceTiers: PriceTier[] = [];
    if (typeof product.priceTiers === 'string') {
        try {
            const parsed = JSON.parse(product.priceTiers);
            if (Array.isArray(parsed)) productPriceTiers = parsed;
        } catch (e) { /* ignore parse error, use default */ }
    } else if (Array.isArray(product.priceTiers)) {
        productPriceTiers = product.priceTiers;
    }

    const priceLevelToUse = customer.priceLevel;
    const tieredPriceEntry = productPriceTiers.find(tier => tier.priceLevel === priceLevelToUse);
    return tieredPriceEntry ? tieredPriceEntry.price : product.price;
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = fetchedLedgerAccounts.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setItems(prevItems => prevItems.map(item => {
        if (item.productId) {
          const product = fetchedProducts.find(p => p.id === item.productId);
          if (product) {
            const unitPrice = determinePriceForCustomer(product, customer);
            return { ...item, unitPrice, totalPrice: unitPrice * (item.quantity || 1), unitOfMeasure: product.unitOfMeasure };
          }
        }
        return item;
      }));
    }
  };
  
  const handleItemChange = (index: number, field: keyof SaleItem | 'productId', value: string | number) => {
    const updatedItems = [...items];
    const currentItem = { ...updatedItems[index] };

    if (field === 'productId') {
      currentItem.productId = value as string;
      const product = fetchedProducts.find(p => p.id === currentItem.productId);
      if (product) {
        currentItem.productName = product.name;
        currentItem.unitOfMeasure = product.unitOfMeasure;
        currentItem.unitPrice = determinePriceForCustomer(product, selectedCustomer);
      } else {
         currentItem.productName = ''; currentItem.unitPrice = 0; currentItem.unitOfMeasure = undefined;
      }
    } else if (field === 'quantity') {
      currentItem.quantity = Number(value) || 0;
    }
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
  const taxAmount = useMemo(() => (subTotal - (discountAmount || 0)) * TAX_RATE, [subTotal, discountAmount]);
  const totalAmount = useMemo(() => subTotal - (discountAmount || 0) + taxAmount, [subTotal, discountAmount, taxAmount]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedCustomer || !issueDate || !dueDate || items.some(item => !item.productId || !item.quantity || item.quantity <= 0)) {
      toast({ title: "Missing Info", description: "Customer, dates, and valid items required.", variant: "destructive" });
      setIsSubmitting(false); return;
    }

    const finalItems: SaleItem[] = items.map(item => {
      const product = fetchedProducts.find(p => p.id === item.productId);
      if (!product) throw new Error("Invalid product."); 
      const unitPrice = item.unitPrice || determinePriceForCustomer(product, selectedCustomer);
      return {
        productId: item.productId!, productName: product.name, quantity: item.quantity!,
        unitPrice, totalPrice: unitPrice * item.quantity!, unitOfMeasure: product.unitOfMeasure!,
      };
    });

    const invoicePayload: any = { 
      id: existingInvoice?.id, 
      invoiceNumber: invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`, 
      issueDate: format(issueDate, "yyyy-MM-dd"),
      dueDate: format(dueDate, "yyyy-MM-dd"),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.phone, 
      customerAddress: selectedCustomer.address,
      customerPriceLevel: selectedCustomer.priceLevel,
      items: finalItems,
      subTotal, discountAmount: discountAmount || 0, taxAmount, totalAmount,
      status, notes,
      companyDetails: defaultCompanyDetails,
      createdAt: existingInvoice?.createdAt ? format(new Date(existingInvoice.createdAt), "yyyy-MM-dd HH:mm:ss") : format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      updatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"), 
      saleId: existingInvoice?.saleId || null 
    };


    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_invoice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server Response Error Text (Save Invoice):", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      console.log("Save Invoice Response:", result);

      if (result.success && result.id) {
        const savedInvoiceForCallback: Invoice = {
            ...invoicePayload,
            id: result.id,
            issueDate: new Date(invoicePayload.issueDate), 
            dueDate: new Date(invoicePayload.dueDate),   
            createdAt: new Date(invoicePayload.createdAt),
            updatedAt: new Date(invoicePayload.updatedAt),
            customer: { 
                 id: selectedCustomer.id,
                 name: selectedCustomer.name,
                 email: selectedCustomer.phone,
                 address: selectedCustomer.address,
                 priceLevel: selectedCustomer.priceLevel
            },
            items: finalItems 
        } as Invoice; 

        if (onSave) { 
            onSave(savedInvoiceForCallback);
        }
        toast({
          title: existingInvoice ? "Invoice Updated" : "Invoice Created",
          description: `Invoice "${invoicePayload.invoiceNumber}" processed.`,
        });
        router.push(`/invoices/${result.id}`); 
      } else {
        console.error("PHP Script Error (Save Invoice):", result.message || "Unknown error from PHP script.");
        throw new Error(result.message || "Failed to save invoice. No ID returned.");
      }
    } catch (error: any) {
      console.error("Full error object (Save Invoice):", error);
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{existingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
          <CardDescription>{existingInvoice ? `Editing invoice ${existingInvoice.invoiceNumber}` : 'Fill details for new invoice.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="customer">Customer <span className="text-destructive">*</span></Label>
              <Select onValueChange={handleCustomerChange} value={selectedCustomerId} required disabled={isLoadingLedgers}>
                <SelectTrigger id="customer"><SelectValue placeholder={isLoadingLedgers ? "Loading Customers..." : "Select customer"} /></SelectTrigger>
                <SelectContent>
                  {fetchedLedgerAccounts?.filter(acc => ['Customer', 'Sales Rep', 'Premium Product', 'Standard Product'].includes(acc.accountType))
                    .map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.accountCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="invoiceNumber">Invoice Number</Label><Input id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
            <div>
                <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                <Select onValueChange={(value: Invoice['status']) => setStatus(value)} value={status} required>
                    <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                        {(['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'] as Invoice['status'][]).map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
             <div><Label htmlFor="issueDate">Issue Date <span className="text-destructive">*</span></Label><DatePickerComponent date={issueDate} setDate={setIssueDate} /></div>
             <div><Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label><DatePickerComponent date={dueDate} setDate={setDueDate} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead className="w-[35%]">Product</TableHead><TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead><TableHead className="text-right">Unit Price (NGN)</TableHead>
                <TableHead className="text-right">Total (NGN)</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select value={item.productId || ""} onValueChange={(value) => handleItemChange(index, 'productId', value)} disabled={!selectedCustomer || isLoadingProducts}>
                      <SelectTrigger><SelectValue placeholder={isLoadingProducts ? "Loading Products..." : "Select product"} /></SelectTrigger>
                      <SelectContent>
                        {fetchedProducts?.filter(p => p.id && String(p.id).trim() !== '').map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.unitOfMeasure}{p.litres ? ` - ${p.litres}L` : ''})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!selectedCustomer && index === 0 && <div className="text-xs text-destructive mt-1">Select customer first.</div>}
                  </TableCell>
                  <TableCell><Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" disabled={!item.productId}/></TableCell>
                  <TableCell>{item.unitOfMeasure || 'N/A'}</TableCell>
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
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><Label>Subtotal:</Label><span>{formatCurrency(subTotal)}</span></div>
            <div className="flex justify-between items-center">
              <Label htmlFor="discountAmount">Discount (NGN):</Label>
              <Input id="discountAmount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} className="w-32 text-right" placeholder="0.00" min="0"/>
            </div>
            <div className="flex justify-between"><Label>Tax ({(TAX_RATE * 100).toFixed(1)}%):</Label><span>{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><Label>Total Amount Due:</Label><span>{formatCurrency(totalAmount)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || !selectedCustomer || items.some(item => !item.productId) || isLoadingLedgers || isLoadingProducts}>
          {isSubmitting ? (existingInvoice ? 'Updating...' : 'Creating...') : (existingInvoice ? 'Save Changes' : 'Create Invoice')}
        </Button>
      </div>
    </form>
  );
}
