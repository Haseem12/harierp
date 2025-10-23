
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerComponent } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, PurchaseItem, LedgerAccount, UnitOfMeasure, RawMaterialCategory } from '@/types';
import { purchaseOrderStatuses, rawMaterialCategories, unitsOfMeasure as allUnitsOfMeasure } from '@/types'; // Added rawMaterialCategories

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder;
}

// Updated newEmptyPurchaseItem to reflect typed fields
const newEmptyPurchaseItem = (): Partial<PurchaseItem> & { id: string; typedProductName: string; category?: RawMaterialCategory; unitOfMeasure: UnitOfMeasure } => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  typedProductName: '', // For user input of product name
  category: rawMaterialCategories[0], // Default category
  quantity: 1,
  unitCost: 0,
  totalCost: 0,
  unitOfMeasure: allUnitsOfMeasure[0], // Default unit
});


export default function PurchaseOrderForm({ purchaseOrder: existingPO }: PurchaseOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fetchedSuppliers, setFetchedSuppliers] = useState<LedgerAccount[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  // Removed fetchedRawMaterials and isLoadingMaterials

  const [poNumber, setPoNumber] = useState(existingPO?.poNumber || `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(existingPO?.supplier?.id); // Ensure existingPO.supplier.id is accessed safely
  const [selectedSupplier, setSelectedSupplier] = useState<LedgerAccount | null>(null);
  
  const [orderDate, setOrderDate] = useState<Date | undefined>(existingPO ? new Date(existingPO.orderDate) : new Date());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>(
    existingPO?.expectedDeliveryDate ? new Date(existingPO.expectedDeliveryDate) : undefined
  );
  
  // Updated items state structure
  const [items, setItems] = useState<Array<Partial<PurchaseItem> & { id: string; typedProductName: string; category?: RawMaterialCategory; unitOfMeasure: UnitOfMeasure }>>(
    existingPO?.items.map(item => ({
        id: `item_${item.productId || Math.random().toString(36).substring(2, 9)}`,
        typedProductName: item.productName, // Use productName for existing items
        category: item.category || rawMaterialCategories[0],
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        unitOfMeasure: item.unitOfMeasure || allUnitsOfMeasure[0],
        productId: item.productId // Retain productId if it exists from backend
    })) || [newEmptyPurchaseItem()]
  );
  
  const [status, setStatus] = useState<PurchaseOrder['status']>(existingPO?.status || 'Draft');
  const [notes, setNotes] = useState(existingPO?.notes || '');
  const [shippingCost, setShippingCost] = useState(existingPO?.shippingCost || 0);
  const [otherCharges, setOtherCharges] = useState(existingPO?.otherCharges || 0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsLoadingSuppliers(true);
    fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setFetchedSuppliers(data.data.filter((acc: LedgerAccount) => acc.accountType === 'Supplier'));
        } else {
          toast({ title: "Error", description: data.message || "Could not load supplier accounts.", variant: "destructive" });
        }
      })
      .catch(error => toast({ title: "Fetch Error", description: `Suppliers: ${error.message}`, variant: "destructive" }))
      .finally(() => setIsLoadingSuppliers(false));
  }, [toast]);

  useEffect(() => {
    if (selectedSupplierId) {
      const supplier = fetchedSuppliers.find(s => s.id === selectedSupplierId);
      setSelectedSupplier(supplier || null);
    } else {
      setSelectedSupplier(null);
    }
  }, [selectedSupplierId, fetchedSuppliers]);

  // Updated handleItemChange for typed inputs
  const handleItemChange = (
    id: string,
    field: keyof (Partial<PurchaseItem> & { typedProductName: string; category?: RawMaterialCategory; unitOfMeasure: UnitOfMeasure }),
    value: string | number | RawMaterialCategory | UnitOfMeasure
  ) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const currentItem = { ...item };
        if (field === 'typedProductName' || field === 'category' || field === 'unitOfMeasure') {
            (currentItem as any)[field] = value as string;
        } else if (field === 'quantity' || field === 'unitCost') {
            (currentItem as any)[field] = Number(value) || 0;
        }
        currentItem.totalCost = (currentItem.unitCost || 0) * (currentItem.quantity || 0);
        return currentItem;
      }
      return item;
    });
    setItems(updatedItems);
  };


  const addItem = () => {
    setItems([...items, newEmptyPurchaseItem()]);
  };

  const removeItem = (id: string) => {
    const updatedItems = items.filter((item) => item.id !== id);
    setItems(updatedItems.length > 0 ? updatedItems : [newEmptyPurchaseItem()]);
  };

  const subTotal = useMemo(() => items.reduce((sum, item) => sum + (item.totalCost || 0), 0), [items]);
  const totalCost = useMemo(() => subTotal + (Number(shippingCost) || 0) + (Number(otherCharges) || 0), [subTotal, shippingCost, otherCharges]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedSupplier || !orderDate || !status || items.some(item => !item.typedProductName || item.quantity === undefined || item.quantity <= 0 || item.unitCost === undefined )) {
      toast({
        title: "Missing Information",
        description: "Please select a supplier, set order date, status, and ensure all items have a name, quantity and unit cost.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Construct finalItems based on typed inputs
    const finalItems: PurchaseItem[] = items.map(item => {
      const unitCost = item.unitCost || 0;
      const quantity = item.quantity || 0;
      return {
        // productId will be handled by backend (lookup or new if it doesn't exist)
        productName: item.typedProductName!, // We've validated this is present
        category: item.category, // Send the selected category
        quantity: quantity,
        unitCost: unitCost,
        totalCost: unitCost * quantity,
        unitOfMeasure: item.unitOfMeasure as UnitOfMeasure,
      };
    });

    const poPayload: any = {
      id: existingPO?.id,
      poNumber,
      orderDate: orderDate.toISOString().split('T')[0],
      expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString().split('T')[0] : null,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      items: finalItems, // Use the items with typed names and categories
      subTotal,
      shippingCost: Number(shippingCost) || 0,
      otherCharges: Number(otherCharges) || 0,
      totalCost,
      status,
      notes,
      createdAt: existingPO?.createdAt ? (new Date(existingPO.createdAt as any)).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
     if (!existingPO?.id) { 
      delete poPayload.id; 
    }

    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_purchase_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poPayload),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server.");
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();

      if (result.success && result.id) {
        toast({
          title: existingPO ? "Purchase Order Updated" : "Purchase Order Created",
          description: `PO "${poPayload.poNumber}" processed.`,
        });
        router.push(`/purchases/${result.id}`); 
      } else {
        throw new Error(result.message || "Failed to save PO. No ID returned.");
      }
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{existingPO ? 'Edit Purchase Order' : 'Create New Purchase Order'}</CardTitle>
          <CardDescription>
            {existingPO ? `Editing PO ${existingPO.poNumber}` : 'Create an order for items needed for water production (e.g., bottles, caps, labels, chemicals).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="supplier">Supplier (Ledger Account) <span className="text-destructive">*</span></Label>
              <Select onValueChange={setSelectedSupplierId} value={selectedSupplierId} required disabled={isLoadingSuppliers}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder={isLoadingSuppliers ? <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Loading...</span> : "Select supplier account"} />
                </SelectTrigger>
                <SelectContent>
                  {fetchedSuppliers.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="poNumber">PO Number</Label>
              <Input id="poNumber" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
              <Select onValueChange={(value: PurchaseOrder['status']) => setStatus(value)} value={status} required>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrderStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
             <div>
              <Label htmlFor="orderDate">Order Date <span className="text-destructive">*</span></Label>
              <DatePickerComponent date={orderDate} setDate={setOrderDate} />
            </div>
            <div>
              <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
              <DatePickerComponent date={expectedDeliveryDate} setDate={setExpectedDeliveryDate} placeholder="Optional delivery date"/>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Items</CardTitle>
          <CardDescription>List all items to be procured in this order.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Item Name</TableHead>
                <TableHead className="w-[20%]">Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Unit Cost (NGN)</TableHead>
                <TableHead className="text-right">Total Cost (NGN)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="Type item name..."
                      value={item.typedProductName}
                      onChange={(e) => handleItemChange(item.id!, 'typedProductName', e.target.value)}
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                        value={item.category}
                        onValueChange={(value) => handleItemChange(item.id!, 'category', value as RawMaterialCategory)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select category"/></SelectTrigger>
                        <SelectContent>
                            {rawMaterialCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id!, 'quantity', e.target.value)}
                      min="0.01"
                      step="any"
                      required
                    />
                  </TableCell>
                  <TableCell>
                     <Select
                        value={item.unitOfMeasure}
                        onValueChange={(value) => handleItemChange(item.id!, 'unitOfMeasure', value as UnitOfMeasure)}
                     >
                        <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>
                            {allUnitsOfMeasure.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                  </TableCell>
                   <TableCell>
                    <Input
                        type="number"
                        value={item.unitCost || 0}
                        onChange={(e) => handleItemChange(item.id!, 'unitCost', e.target.value)}
                        min="0"
                        step="0.01"
                        className="text-right"
                        required
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalCost || 0)}</TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id!)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="Optional notes for the purchase order..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <Label>Subtotal:</Label>
              <span>{formatCurrency(subTotal)}</span>
            </div>
             <div className="flex justify-between items-center">
              <Label htmlFor="shippingCost">Shipping Cost (NGN):</Label>
              <Input 
                id="shippingCost"
                type="number" 
                value={shippingCost} 
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} 
                className="w-32 text-right"
                placeholder="0.00"
                min="0"
              />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="otherCharges">Other Charges (NGN):</Label>
              <Input 
                id="otherCharges"
                type="number" 
                value={otherCharges} 
                onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)} 
                className="w-32 text-right"
                placeholder="0.00"
                min="0"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <Label>Total Cost:</Label>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 mt-8">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingSuppliers || !selectedSupplier || items.some(item => !item.typedProductName)}>
          {isSubmitting ? (existingPO ? 'Updating...' : 'Creating...') : (existingPO ? 'Save Changes' : 'Create Purchase Order')}
        </Button>
      </div>
    </form>
  );
}
