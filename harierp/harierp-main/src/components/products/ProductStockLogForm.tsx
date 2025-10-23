
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerComponent } from "@/components/ui/date-picker";
import { useToast } from '@/hooks/use-toast';
import type { ProductStockAdjustmentLog, ProductStockAdjustmentType, UnitOfMeasure, Product as ProductType, ProductCategory } from '@/types';
import { productStockAdjustmentTypes } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, PlusCircle, RefreshCw } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface StockOperationItem {
  id: string; 
  productId: string | undefined;
  productName: string; 
  currentStock: number; 
  unitOfMeasure: string; 
  quantityToAdjust: number;
}

interface ProductStockLogFormProps {
  isEditMode?: boolean;
  existingLogEntry?: ProductStockAdjustmentLog;
  onSaveSuccess?: () => void;
  defaultAdjustmentType?: ProductStockAdjustmentType;
  allowedAdjustmentTypes?: ProductStockAdjustmentType[];
}

const createNewStockOperationItem = (): StockOperationItem => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  productId: undefined,
  productName: 'N/A',
  currentStock: 0,
  unitOfMeasure: 'N/A',
  quantityToAdjust: 0,
});

export default function ProductStockLogForm({ 
  isEditMode = false, 
  existingLogEntry,
  onSaveSuccess,
  defaultAdjustmentType = 'PENDING_APPROVAL', // Changed default for production submissions
  allowedAdjustmentTypes
}: ProductStockLogFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [availableProducts, setAvailableProducts] = useState<ProductType[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [batchLogNumber, setBatchLogNumber] = useState(
    existingLogEntry?.logNumber || `STKBTCH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0')}`
  );
  
  const [items, setItems] = useState<StockOperationItem[]>(
    isEditMode && existingLogEntry
      ? [{
          id: existingLogEntry.id,
          productId: existingLogEntry.productId,
          productName: existingLogEntry.productName,
          currentStock: existingLogEntry.previousStock,
          unitOfMeasure: availableProducts.find(p => p.id === existingLogEntry.productId)?.unitOfMeasure || 'N/A',
          quantityToAdjust: existingLogEntry.quantityAdjusted,
        }]
      : [createNewStockOperationItem()]
  );
  
  const [adjustmentType, setAdjustmentType] = useState<ProductStockAdjustmentType>(
    existingLogEntry?.adjustmentType || defaultAdjustmentType
  );
  
  const [adjustmentDate, setAdjustmentDate] = useState<Date | undefined>(
    existingLogEntry?.adjustmentDate ? (typeof existingLogEntry.adjustmentDate === 'string' ? parseISO(existingLogEntry.adjustmentDate) : existingLogEntry.adjustmentDate as Date) : new Date()
  );
  
  const [notes, setNotes] = useState(existingLogEntry?.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setIsLoadingProducts(true);
    fetch('https://sajfoods.net/busa-api/database/get_products.php')
      .then(async (res) => {
        const responseText = await res.text();
        if (!res.ok) throw new Error(`Products fetch failed: ${responseText.substring(0,100)}`);
        try { return JSON.parse(responseText); } 
        catch (e) { throw new Error("Invalid JSON from server for products."); }
      })
      .then((data: any) => {
        let productsToSet: any[] = [];
        if (Array.isArray(data)) productsToSet = data;
        else if (data && data.success && Array.isArray(data.data)) productsToSet = data.data;
        
        const mappedProducts = productsToSet.map((p: any) => ({ ...p })).filter(Boolean) as ProductType[];
        setAvailableProducts(mappedProducts);

        if (isEditMode && existingLogEntry) {
            const product = mappedProducts.find(p => p.id === existingLogEntry.productId);
            if (product) {
                setItems(prev => [{
                    ...prev[0],
                    unitOfMeasure: product.unitOfMeasure,
                    currentStock: product.stock,
                }]);
            }
        }
      })
      .catch(error => {
        toast({ title: "Fetch Error", description: `Products: ${error.message}`, variant: "destructive" });
        setAvailableProducts([]);
      })
      .finally(() => setIsLoadingProducts(false));
  }, [toast, isEditMode, existingLogEntry?.productId]);

  const handleAddItemRow = () => {
    setItems([...items, createNewStockOperationItem()]);
  };

  const handleRemoveItemRow = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof StockOperationItem, value: string | number) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item } as StockOperationItem;
        
        if (field === 'productId') {
          const newProductId = value as string;
          updatedItem.productId = newProductId;

          const selectedProduct = availableProducts.find(p => p.id === newProductId);
          if (selectedProduct) {
            updatedItem.productName = selectedProduct.name;
            updatedItem.currentStock = selectedProduct.stock;
            updatedItem.unitOfMeasure = selectedProduct.unitOfMeasure;
          } else {
            updatedItem.productName = 'N/A';
            updatedItem.currentStock = 0;
            updatedItem.unitOfMeasure = 'N/A';
          }
          if (!isEditMode) updatedItem.quantityToAdjust = 0;
        } else if (field === 'quantityToAdjust') {
            updatedItem.quantityToAdjust = Number(value) || 0;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!adjustmentDate) {
      toast({ title: "Error", description: "Please select an adjustment date.", variant: "destructive" });
      setIsLoading(false); return;
    }

    if (isEditMode && existingLogEntry) {
      const itemToEdit = items[0];
      if (!itemToEdit || !itemToEdit.productId || itemToEdit.quantityToAdjust === 0) {
        toast({ title: "Error", description: "Product and a non-zero quantity are required.", variant: "destructive" });
        setIsLoading(false); return;
      }
      
      const payload: any = {
        id: existingLogEntry.id,
        logNumber: batchLogNumber,
        productId: itemToEdit.productId,
        productName: itemToEdit.productName,
        quantityAdjusted: Number(itemToEdit.quantityToAdjust),
        originalQuantity: existingLogEntry.quantityAdjusted,
        adjustmentType: adjustmentType,
        adjustmentDate: format(adjustmentDate, "yyyy-MM-dd HH:mm:ss"),
        notes: notes,
      };
      
      try {
        const response = await fetch('https://sajfoods.net/busa-api/database/update_product_stock_log.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text(); throw new Error(`Server error: ${errorText}`);
        }
        const result = await response.json();
        if (result.success) {
            if (onSaveSuccess) onSaveSuccess(); else router.push('/products/stock-management/log');
        } else { throw new Error(result.message); }
      } catch (error: any) { toast({ title: "Update Failed", description: error.message, variant: "destructive" });} 
      finally { setIsLoading(false); }

    } else {
      const validItems = items.filter(item => item.productId && item.quantityToAdjust !== 0);
      if (validItems.length === 0) {
        toast({ title: "Error", description: "Add at least one product with a non-zero quantity.", variant: "destructive" });
        setIsLoading(false); return;
      }

      const batchStockLogPayloads = validItems.map((item, index) => {
         const productDetails = availableProducts.find(p => p.id === item.productId);
         return {
            logNumber: `${batchLogNumber}-ITEM-${index + 1}`,
            productId: item.productId!,
            productName: productDetails ? productDetails.name : 'Unknown Product',
            quantityAdjusted: Number(item.quantityToAdjust),
            adjustmentType,
            adjustmentDate: format(adjustmentDate, "yyyy-MM-dd HH:mm:ss"),
            notes: `Batch: ${batchLogNumber}. ${notes || ''}`.trim(),
            previousStock: Number(item.currentStock), 
            newStock: Number(item.currentStock) + Number(item.quantityToAdjust),
        };
      });
      const overallPayload = { items: batchStockLogPayloads };
      
      try {
        const response = await fetch('https://sajfoods.net/busa-api/database/save_product_stock_log_batch.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overallPayload),
        });
        if (!response.ok) {
            const errorText = await response.text(); throw new Error(`Server error: ${errorText}`);
        }
        const result = await response.json();
        if (result.success) {
            toast({ title: "Stock Submitted", description: `${validItems.length} product batch(es) submitted for approval.` });
            if (onSaveSuccess) onSaveSuccess(); else router.push('/inventory-dashboard');
        } else { throw new Error(result.message); }
      } catch (error: any) { toast({ title: "Save Failed", description: error.message, variant: "destructive" }); }
      finally { setIsLoading(false); }
    }
  };

  const selectableAdjustmentTypes = allowedAdjustmentTypes || productStockAdjustmentTypes.filter(type => !['SALE_DEDUCTION', 'RETURN_ADDITION'].includes(type));


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 items-end">
        <div>
          <Label htmlFor="logIdentifier">{isEditMode ? "Editing Log ID" : "Submission Reference ID"}</Label>
          <Input id="logIdentifier" value={batchLogNumber} onChange={e => setBatchLogNumber(e.target.value)} readOnly={isEditMode} className={isEditMode ? "bg-muted/50" : ""}/>
        </div>
        <div>
          <Label htmlFor="adjustmentDate">Submission Date <span className="text-destructive">*</span></Label>
          <DatePickerComponent date={adjustmentDate} setDate={setAdjustmentDate} />
        </div>
      </div>
      <div>
        <Label htmlFor="adjustmentType">Submission Type <span className="text-destructive">*</span></Label>
        <Select 
            value={adjustmentType} 
            onValueChange={(value: ProductStockAdjustmentType) => setAdjustmentType(value)}
            disabled={true} // Locked to PENDING_APPROVAL for this form
        >
            <SelectTrigger id="adjustmentType">
                <SelectValue placeholder="Select adjustment type" />
            </SelectTrigger>
            <SelectContent>
                {selectableAdjustmentTypes
                  .map(type => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">This form is for submitting finished goods to inventory for approval.</p>
      </div>
      
      {!isEditMode ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="w-[25%]">Quantity to Submit (+)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Select value={item.productId} onValueChange={(value) => handleItemChange(item.id, 'productId', value as string)} disabled={isLoadingProducts}>
                      <SelectTrigger><SelectValue placeholder={isLoadingProducts ? "Loading..." : "Select product"} /></SelectTrigger>
                      <SelectContent>
                        {availableProducts.length > 0 ? availableProducts.map(p => (
                          <SelectItem key={p.id} value={p.id} disabled={items.some(i => i.productId === p.id && i.id !== item.id)}>
                            {p.name} ({p.sku || 'No SKU'})
                          </SelectItem>
                        )) : <SelectItem value="no-products" disabled>No products available</SelectItem>}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={item.currentStock} readOnly disabled className="bg-muted/50"/></TableCell>
                  <TableCell><Input value={item.unitOfMeasure} readOnly disabled className="bg-muted/50"/></TableCell>
                  <TableCell>
                    <Input type="number" value={item.quantityToAdjust} onChange={(e) => handleItemChange(item.id, 'quantityToAdjust', e.target.value)} step="any" min="1" disabled={!item.productId} 
                           className="border-green-500 focus:ring-primary"/>
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItemRow(item.id)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} disabled={isLoadingProducts}><PlusCircle className="mr-2 h-4 w-4" /> Add Another Product</Button>
        </>
      ) : items[0] ? (
        <div className="space-y-4 border p-4 rounded-md">
            <div>
                <Label>Product</Label>
                <Input value={items[0].productName} readOnly disabled className="bg-muted/50"/>
                <p className="text-xs text-muted-foreground mt-1">Original Stock at time of log: {existingLogEntry?.previousStock} {items[0].unitOfMeasure}</p>
            </div>
             <div>
                <Label htmlFor="quantityToAdjustEdit">Quantity Adjusted <span className="text-destructive">*</span></Label>
                <Input id="quantityToAdjustEdit" type="number" value={items[0].quantityToAdjust} onChange={(e) => handleItemChange(items[0].id, 'quantityToAdjust', e.target.value)} step="any" 
                       className={`${Number(items[0].quantityToAdjust) >= 0 ? 'border-green-500' : 'border-destructive'} focus:ring-primary`}
                />
                <p className="text-xs text-muted-foreground mt-1">Unit: {items[0].unitOfMeasure}. Enter positive for addition, negative for subtraction.</p>
            </div>
        </div>
      ) : <p className="text-destructive">Error: Log entry data not available for editing.</p>}

      <div>
        <Label htmlFor="notes">Notes ({isEditMode ? "for this specific entry" : "for Submission"})</Label>
        <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Morning Shift Production, Batch Ref #XYZ"/>
      </div>
      <div className="flex items-center justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
        <Button type="submit" 
            disabled={isLoading || isLoadingProducts || (isEditMode && (!items[0]?.productId || items[0]?.quantityToAdjust === 0)) || (!isEditMode && items.every(item => !item.productId || item.quantityToAdjust <= 0)) || !adjustmentDate }
        >
          {isLoading ? (isEditMode ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Updating...</> : <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Submitting...</>) : (isEditMode ? "Save Changes" : "Submit to Finish Bay")}
        </Button>
      </div>
    </form>
  );
}
