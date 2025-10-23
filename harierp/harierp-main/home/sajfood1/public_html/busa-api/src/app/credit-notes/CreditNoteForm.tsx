
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { CreditNote, LedgerAccount, CreditNoteReason, SaleItem, Product, PriceTier, UnitOfMeasure } from '@/types';
import { creditNoteReasons, priceLevelOptions } from '@/types';
import { DatePickerComponent } from "@/components/ui/date-picker";
// getLedgerAccountOutstandingBalance removed, will fetch live
import { format } from 'date-fns';
import { PlusCircle, Trash2, RefreshCw } from 'lucide-react';

interface CreditNoteFormProps {
  creditNote?: CreditNote;
  onSaveSuccess?: (creditNoteId: string) => void;
}

const newEmptyReturnedItem = (): Omit<SaleItem, 'productName' | 'unitPrice' | 'totalPrice'> & { productId: string } => ({
  productId: '',
  quantity: 1,
});

export default function CreditNoteForm({ creditNote: existingCreditNote, onSaveSuccess }: CreditNoteFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fetchedLedgerAccounts, setFetchedLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [isLoadingLedgers, setIsLoadingLedgers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [creditNoteNumber, setCreditNoteNumber] = useState(
    existingCreditNote?.creditNoteNumber || `CN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
  );
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string | undefined>(existingCreditNote?.ledgerAccountId);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<LedgerAccount | null>(null);
  const [creditNoteDate, setCreditNoteDate] = useState<Date | undefined>(
    existingCreditNote ? new Date(existingCreditNote.creditNoteDate) : new Date()
  );
  const [amount, setAmount] = useState<number>(existingCreditNote?.amount || 0);
  const [reason, setReason] = useState<CreditNoteReason | undefined>(
    existingCreditNote?.reason || creditNoteReasons[0]
  );
  const [description, setDescription] = useState(existingCreditNote?.description || '');
  const [relatedInvoiceId, setRelatedInvoiceId] = useState(existingCreditNote?.relatedInvoiceId || '');
  
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);


  const [returnedItems, setReturnedItems] = useState<Array<Partial<SaleItem> & { productId: string }>>(
    (existingCreditNote?.reason === 'Returned Goods' && existingCreditNote.items && Array.isArray(existingCreditNote.items))
    ? existingCreditNote.items.map(item => ({ ...item, productId: item.productId })) 
    : [newEmptyReturnedItem()]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoadingLedgers(true);
    fetch('https://harisindustries.com.ng/busa-api/database/getLedgerAccounts.php')
      .then(res => res.ok ? res.json() : res.text().then(text => { throw new Error(`HTTP error! Ledger Accounts status: ${res.status} - ${text}`) }))
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedLedgerAccounts(data.data.filter((acc: any) => acc.id && typeof acc.id === 'string' && acc.id.trim() !== ''));
        } else {
          toast({ title: "Error", description: `Failed to fetch ledger accounts: ${data.message || 'Unexpected data format.'}`, variant: "destructive" });
        }
      })
      .catch(error => toast({ title: "Fetch Error", description: `Ledger accounts: ${error.message}`, variant: "destructive" }))
      .finally(() => setIsLoadingLedgers(false));

    setIsLoadingProducts(true);
    fetch('https://harisindustries.com.ng/busa-api/database/get_products.php')
     .then(res => res.ok ? res.json() : res.text().then(text => { throw new Error(`HTTP error! Products status: ${res.status} - ${text}`) }))
      .then((data: Product[] | { success?: boolean; data?: Product[]; message?: string }) => {
        let productsToSet: Product[] = [];
        if (Array.isArray(data)) { productsToSet = data; }
        else if (data && data.success && Array.isArray(data.data)) { productsToSet = data.data; }
        
        const parsedProducts = productsToSet
          .filter(p => p.id && typeof p.id === 'string' && p.id.trim() !== '')
          .map(p => ({
            ...p,
            priceTiers: typeof p.priceTiers === 'string' ? JSON.parse(p.priceTiers || '[]') : (p.priceTiers || []),
        }));
        setFetchedProducts(parsedProducts);
      })
      .catch(error => toast({ title: "Fetch Error", description: `Products: ${error.message}`, variant: "destructive" }))
      .finally(() => setIsLoadingProducts(false));
  }, [toast]);

  useEffect(() => {
    if (selectedLedgerAccountId) {
      const account = fetchedLedgerAccounts.find(acc => acc.id === selectedLedgerAccountId);
      setSelectedLedgerAccount(account || null);
      setSelectedAccountName(account?.name || null);

      if (account) {
        setIsLoadingBalance(true);
        setOutstandingBalance(null); // Reset while fetching
        fetch(`https://harisindustries.com.ng/busa-api/database/get_ledger_account_d.php?id=${selectedLedgerAccountId}`)
          .then(async res => {
            if (!res.ok) {
              const errorText = await res.text().catch(() => "Failed to read error from server.");
              throw new Error(`HTTP error! Ledger Detail status: ${res.status} - ${errorText}`);
            }
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const responseText = await res.text();
              console.warn("Non-JSON response from get_ledger_account_d.php (CreditNoteForm):", responseText.substring(0, 200) + "...");
              throw new Error(`Expected JSON for ledger detail, got ${contentType}.`);
            }
            return res.json();
          })
          .then(data => {
            if (data.success && data.account) {
              const rawBalance = data.outstandingBalance;
              setOutstandingBalance(rawBalance !== undefined && rawBalance !== null ? Number(rawBalance) : null);
            } else {
              toast({ title: "Balance Error", description: `Could not load account balance: ${data.message || 'Account data missing.'}`, variant: "destructive" });
              setOutstandingBalance(null);
            }
          })
          .catch(error => {
            toast({ title: "Balance Fetch Error", description: error.message, variant: "destructive" });
            setOutstandingBalance(null);
          })
          .finally(() => setIsLoadingBalance(false));
      }
    } else {
      setSelectedLedgerAccount(null);
      setSelectedAccountName(null);
      setOutstandingBalance(null);
    }
  }, [selectedLedgerAccountId, fetchedLedgerAccounts, toast]);


  const getProductPriceForCredit = (product: Product, customer: LedgerAccount | null): number => {
    if (!product) return 0;
    if (customer && product.priceTiers && Array.isArray(product.priceTiers)) {
      const customerPriceLevel = customer.priceLevel;
      const tieredPrice = product.priceTiers.find(tier => tier.priceLevel === customerPriceLevel);
      if (tieredPrice) return tieredPrice.price;
    }
    return product.price; 
  };

  useEffect(() => {
    if (reason === 'Returned Goods' && selectedLedgerAccount) {
      const calculatedAmount = returnedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      setAmount(calculatedAmount);
    }
  }, [reason, returnedItems, selectedLedgerAccount]);

  const handleReasonChange = (newReason: CreditNoteReason) => {
    setReason(newReason);
    if (newReason !== 'Returned Goods') {
      setReturnedItems([newEmptyReturnedItem()]);
      if (existingCreditNote && existingCreditNote.reason !== newReason) setAmount(0);
      else if (!existingCreditNote) setAmount(0);
    } else {
      const calculatedAmount = returnedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      setAmount(calculatedAmount);
    }
  };

  const handleItemChange = (index: number, field: keyof SaleItem | 'productId', value: string | number) => {
    const updatedItems = [...returnedItems];
    const currentItem = { ...updatedItems[index] };

    if (field === 'productId') {
      currentItem.productId = value as string;
      const product = fetchedProducts.find(p => p.id === currentItem.productId);
      if (product) {
        currentItem.productName = product.name;
        currentItem.unitOfMeasure = product.unitOfMeasure;
        currentItem.unitPrice = getProductPriceForCredit(product, selectedLedgerAccount);
      } else {
        currentItem.productName = ''; currentItem.unitPrice = 0; currentItem.unitOfMeasure = undefined;
      }
    } else if (field === 'quantity') {
      currentItem.quantity = Number(value) || 0;
    }
    
    currentItem.totalPrice = (currentItem.unitPrice || 0) * (currentItem.quantity || 0);
    updatedItems[index] = currentItem;
    setReturnedItems(updatedItems);
  };

  const addItem = () => setReturnedItems([...returnedItems, newEmptyReturnedItem()]);
  const removeItem = (index: number) => {
    const updatedItems = returnedItems.filter((_, i) => i !== index);
    setReturnedItems(updatedItems.length > 0 ? updatedItems : [newEmptyReturnedItem()]);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedLedgerAccountId || !selectedLedgerAccount) {
      toast({ title: "Error", description: "Please select a valid ledger account.", variant: "destructive" });
      setIsSubmitting(false); return;
    }
    if (!creditNoteDate) { toast({ title: "Error", description: "Please select a credit note date.", variant: "destructive" }); setIsSubmitting(false); return; }
    if (!reason) { toast({ title: "Error", description: "Please select a reason.", variant: "destructive" }); setIsSubmitting(false); return; }

    let finalItemsForSave: SaleItem[] | undefined = undefined;
    let calculatedAmount = amount;

    if (reason === 'Returned Goods') {
      if (returnedItems.some(item => !item.productId || !item.quantity || item.quantity <= 0 || item.unitPrice === undefined)) {
        toast({ title: "Error", description: "Ensure all returned items have product, quantity, and price.", variant: "destructive" });
        setIsSubmitting(false); return;
      }
      finalItemsForSave = returnedItems.map(item => {
        const product = fetchedProducts.find(p => p.id === item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found during save.`);
        return {
          productId: item.productId!, productName: product.name, quantity: item.quantity!,
          unitPrice: item.unitPrice!, totalPrice: item.totalPrice!, unitOfMeasure: product.unitOfMeasure,
        };
      });
      calculatedAmount = finalItemsForSave.reduce((sum, item) => sum + item.totalPrice, 0);
    } else {
      if (amount <= 0) { toast({ title: "Error", description: "Amount must be > 0.", variant: "destructive" }); setIsSubmitting(false); return; }
    }

    const creditNotePayload: any = {
      id: existingCreditNote?.id, 
      creditNoteNumber,
      creditNoteDate: format(creditNoteDate, "yyyy-MM-dd"),
      ledgerAccountId: selectedLedgerAccountId,
      ledgerAccountName: selectedLedgerAccount.name,
      amount: calculatedAmount,
      reason,
      description,
      relatedInvoiceId: relatedInvoiceId || null,
      items: reason === 'Returned Goods' ? finalItemsForSave : null,
      createdAt: existingCreditNote?.createdAt ? format(new Date(existingCreditNote.createdAt as any), "yyyy-MM-dd HH:mm:ss") : format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      updatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };

    try {
      const response = await fetch('https://harisindustries.com.ng/busa-api/database/save_credit_note.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditNotePayload),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server.");
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      if (result.success && result.id) {
        toast({
          title: existingCreditNote ? "Credit Note Updated" : "Credit Note Created",
          description: `Credit Note "${creditNotePayload.creditNoteNumber}" processed.`,
        });
        if (onSaveSuccess) onSaveSuccess(result.id);
        else router.push(`/credit-notes/${result.id}`);
      } else {
        throw new Error(result.message || "Failed to save. No ID returned.");
      }
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const validLedgerAccounts = useMemo(() => 
    Array.isArray(fetchedLedgerAccounts) ? fetchedLedgerAccounts.filter(acc => acc.id && acc.id.trim() !== '') : [], 
  [fetchedLedgerAccounts]);

  const validProducts = useMemo(() => 
    Array.isArray(fetchedProducts) ? fetchedProducts.filter(p => p.id && p.id.trim() !== '') : [],
  [fetchedProducts]);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{existingCreditNote ? 'Edit Credit Note' : 'Create New Credit Note'}</CardTitle>
          <CardDescription>
            {existingCreditNote ? `Editing CN ${existingCreditNote.creditNoteNumber}` : 'Issue a new credit note.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ledgerAccount">Ledger Account <span className="text-destructive">*</span></Label>
              <Select onValueChange={setSelectedLedgerAccountId} value={selectedLedgerAccountId} required disabled={isLoadingLedgers}>
                <SelectTrigger id="ledgerAccount">
                  <SelectValue placeholder={isLoadingLedgers ? <span className='flex items-center'><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...</span> : "Select account"} />
                </SelectTrigger>
                <SelectContent>
                  {validLedgerAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountName && (
                <div className="mt-2 text-sm text-muted-foreground border p-2 rounded-md bg-muted/30">
                  <p>Account: <span className="font-medium text-foreground">{selectedAccountName}</span></p>
                  {isLoadingBalance ? (
                    <p className="flex items-center"><RefreshCw className="mr-2 h-3 w-3 animate-spin" /> Loading balance...</p>
                  ) : (
                     <p>Outstanding: <span className={`font-medium ${outstandingBalance !== null && outstandingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(outstandingBalance)}</span></p>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="creditNoteNumber">Credit Note Number</Label>
              <Input id="creditNoteNumber" value={creditNoteNumber} onChange={e => setCreditNoteNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creditNoteDate">Credit Note Date <span className="text-destructive">*</span></Label>
              <DatePickerComponent date={creditNoteDate} setDate={setCreditNoteDate} />
            </div>
            <div>
              <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
              <Select onValueChange={handleReasonChange} value={reason} required>
                <SelectTrigger id="reason"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {creditNoteReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {reason === 'Returned Goods' && (
            <Card>
              <CardHeader>
                <CardTitle>Returned Items</CardTitle>
                <CardDescription>Specify products and quantities being returned. Prices are based on ledger account's price level if applicable, or standard product price.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                      <TableHead className="w-[40%]">Product</TableHead><TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead><TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead><TableHead>Action</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {returnedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => handleItemChange(index, 'productId', value)}
                            disabled={!selectedLedgerAccount || isLoadingProducts}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingProducts ? <span className='flex items-center'><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading...</span> : "Select product"} />
                            </SelectTrigger>
                            <SelectContent>
                              {validProducts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.unitOfMeasure}{p.litres ? ` - ${p.litres}L` : ''})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!selectedLedgerAccount && index === 0 && <p className="text-xs text-destructive mt-1">Select ledger account first.</p>}
                        </TableCell>
                        <TableCell><Input type="number" value={item.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} min="1" disabled={!item.productId}/></TableCell>
                        <TableCell>{item.unitOfMeasure || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice || 0)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={returnedItems.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4" disabled={!selectedLedgerAccount || isLoadingProducts}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
              </CardContent>
              <CardFooter><div className="text-right w-full font-semibold">Total Return Value: {formatCurrency(amount)}</div></CardFooter>
            </Card>
          )}

          <div>
            <Label htmlFor="amount">Amount (NGN) <span className="text-destructive">*</span></Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} min="0.01" step="0.01" required readOnly={reason === 'Returned Goods'} className={reason === 'Returned Goods' ? 'bg-muted/50' : ''} />
          </div>
          
          <div><Label htmlFor="relatedInvoiceId">Related Invoice ID (Optional)</Label><Input id="relatedInvoiceId" value={relatedInvoiceId} onChange={e => setRelatedInvoiceId(e.target.value)} placeholder="e.g., INV-2024-001" /></div>
          <div><Label htmlFor="description">Description / Further Notes (Optional)</Label><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed reason or notes..." /></div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isLoadingLedgers || isLoadingProducts || !selectedLedgerAccountId || !creditNoteDate || (!amount && reason !== 'Returned Goods') || (reason === 'Returned Goods' && (!returnedItems.length || returnedItems.some(item => !item.productId || !item.quantity || item.quantity <=0))) || !reason }>
          {isSubmitting ? (existingCreditNote ? 'Updating...' : 'Saving...') : (existingCreditNote ? 'Save Changes' : 'Save Credit Note')}
        </Button>
      </div>
    </form>
  );
}

    