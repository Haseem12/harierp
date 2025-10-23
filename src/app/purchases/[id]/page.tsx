
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Edit, Truck, User, RefreshCw, Trash2, FileSignature } from 'lucide-react';
import type { PurchaseOrder, PurchaseItem } from '@/types';
import { defaultCompanyDetails } from '@/types'; 
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiving, setIsReceiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poId = params.id as string;

  useEffect(() => {
    if (poId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://sajfoods.net/busa-api/database/get_purchase_order.php?id=${poId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.");
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
             const fetchedPO = {
              ...data.data,
              orderDate: new Date(data.data.orderDate),
              expectedDeliveryDate: data.data.expectedDeliveryDate ? new Date(data.data.expectedDeliveryDate) : undefined,
              createdAt: data.data.createdAt ? new Date(data.data.createdAt) : new Date(),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
              items: Array.isArray(data.data.items) ? data.data.items : [], // Ensure items is an array
              supplier: data.data.supplier || {id: data.data.supplierId, name: data.data.supplierName || 'Unknown Supplier'} // Handle supplier object
            };
            setPurchaseOrder(fetchedPO);
          } else {
            setError(data.message || "Failed to fetch PO details.");
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching PO.");
            toast({title: "Error", description: `Failed to load PO: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [poId, toast]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadgeVariant = (status: PurchaseOrder['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Received': return 'default'; 
      case 'Ordered': return 'secondary'; 
      case 'Draft': return 'outline'; 
      case 'Partially Received': return 'outline'; 
      case 'Cancelled': return 'destructive'; 
      default: return 'outline';
    }
  };

  const handleReceiveItems = async () => {
    if (!purchaseOrder) return;
    setIsReceiving(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/receive_purchase_order_items.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrderId: purchaseOrder.id }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error marking PO as received: ${errorText}`);
      }
      const result = await response.json();
      if (result.success) {
        setPurchaseOrder(prev => prev ? ({ ...prev, status: 'Received', updatedAt: new Date() }) : null);
        toast({ title: "Items Received", description: `PO ${purchaseOrder.poNumber} marked as received and stock updated.`});
      } else {
        throw new Error(result.message || "Failed to mark PO as received.");
      }
    } catch (error: any) {
      toast({ title: "Error Receiving Items", description: error.message, variant: "destructive" });
    } finally {
      setIsReceiving(false);
    }
  };
  
  const handlePrintGRN = () => {
    window.print();
  };

  const handleDeletePurchaseOrder = async () => {
    if (!purchaseOrder) return;
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/delete_purchase_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: purchaseOrder.id }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Purchase Order Deleted", description: `PO "${purchaseOrder.poNumber}" has been removed.`});
        router.push('/purchases');
      } else {
        throw new Error(result.message || "Failed to delete PO from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading purchase order details...</div>;
  }

  if (error) {
    return (
       <div className="flex flex-col items-center justify-center h-full">
        <p className="text-destructive mb-4">Error: {error}</p>
        <Link href="/purchases" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Button></Link>
      </div>
    );
  }
  
  if (!purchaseOrder) {
    return (
       <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Purchase Order not found.</p>
        <Link href="/purchases" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Button></Link>
      </div>
    );
  }

  const isPrintableView = purchaseOrder.status === 'Received';
  const viewTitle = isPrintableView ? 'Goods Received Note' : 'Purchase Order Details';

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/purchases" passHref>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Purchase Orders</span>
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/purchases/${purchaseOrder.id}/edit`} passHref>
              <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            </Link>
            {isPrintableView && (
                <Button variant="outline" onClick={handlePrintGRN}><FileSignature className="mr-2 h-4 w-4" /> Print GRN</Button>
            )}
             {(purchaseOrder.status === 'Ordered' || purchaseOrder.status === 'Partially Received') && (
              <Button onClick={handleReceiveItems} disabled={isReceiving}>
                {isReceiving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Truck className="mr-2 h-4 w-4" />}
                {isReceiving ? 'Processing...' : 'Mark as Received'}
              </Button>
            )}
             <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete PO "{purchaseOrder.poNumber}". This action cannot be undone and will not adjust stock if items were already received.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePurchaseOrder}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div id="printable-area">
          <Card className="w-full shadow-lg print:shadow-none print:border-none">
            <CardHeader className="bg-muted/50 p-6 print:p-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold print:text-xl">{viewTitle}</h1>
                  <p className="text-muted-foreground print:text-sm">PO Ref: {purchaseOrder.poNumber}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-semibold print:text-lg">{defaultCompanyDetails.name}</h2>
                  <p className="text-sm text-muted-foreground print:text-xs">{defaultCompanyDetails.address}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 print:p-2">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary print:text-base">Supplier Details:</h3>
                  <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {purchaseOrder.supplier.name}</p>
                </div>
                <div className="text-left md:text-right">
                  <p><span className="font-semibold">Order Date:</span> {format(new Date(purchaseOrder.orderDate), 'PPP')}</p>
                   {isPrintableView && <p><span className="font-semibold">Received Date:</span> {format(new Date(purchaseOrder.updatedAt || Date.now()), 'PPP')}</p>}
                   {!isPrintableView && purchaseOrder.expectedDeliveryDate && <p><span className="font-semibold">Expected Delivery:</span> {format(new Date(purchaseOrder.expectedDeliveryDate), 'PPP')}</p>}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-center">Category</TableHead>
                    <TableHead className="text-center">Quantity Ordered</TableHead>
                    {isPrintableView && <TableHead className="text-center">Quantity Received</TableHead>}
                    <TableHead className="text-center">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrder.items.map((item, index) => (
                    <TableRow key={`${item.productId}-${index}`}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell className="text-center">{item.category}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      {isPrintableView && <TableCell className="text-center">{item.quantity}</TableCell>}
                      <TableCell className="text-center">{item.unitOfMeasure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {purchaseOrder.notes && (
                <div className="mt-8 pt-4 border-t print:border-t-0 print:mt-4">
                  <h4 className="font-semibold mb-1">Notes:</h4>
                  <p className="text-sm text-muted-foreground">{purchaseOrder.notes}</p>
                </div>
              )}
            </CardContent>
            {isPrintableView && (
              <CardFooter className="bg-muted/50 p-6 flex-col items-start gap-6 print:mt-16 print:bg-transparent print:p-2">
                <div className="w-full flex justify-around">
                  <div className="text-center">
                    <p className="border-t pt-2 mt-8 w-48">Received By (Signature)</p>
                    <p className="text-xs text-muted-foreground">Store Manager</p>
                  </div>
                  <div className="text-center">
                    <p className="border-t pt-2 mt-8 w-48">Supplier's Rep (Signature)</p>
                     <p className="text-xs text-muted-foreground">Delivery Personnel</p>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground w-full">This document confirms the receipt of the goods listed above in good condition.</p>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
       <style jsx global>{`
  @media print {
    @page {
      size: A4 portrait; /* or landscape if you prefer */
      margin: 10mm;
    }

    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background-color: #fff !important;
      margin: 0;
      padding: 0;
    }

    .print-container {
      display: block !important;
    }

    /* Hide everything except printable area */
    body > *:not(#printable-invoice-area) {
      visibility: hidden;
    }

    #printable-invoice-area, #printable-invoice-area * {
      visibility: visible;
    }

    #printable-invoice-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      max-width: 210mm; /* ensures perfect A4 width */
      min-height: 297mm; /* ensures full A4 height */
      margin: 0 auto;
      padding: 10mm 15mm;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      overflow: visible !important;
    }

    /* Optional: hide any print:hidden class */
    .print\\:hidden {
      display: none !important;
    }

    /* Optional watermark */
    #printable-invoice-area::after {
      content: attr(data-watermark);
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 10rem;
      color: rgba(0, 0, 0, 0.05);
      font-weight: 700;
      z-index: -1;
      pointer-events: none;
    }
  }
`}</style>
</>

    </>
  );
}
