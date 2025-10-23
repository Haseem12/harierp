
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import PurchaseOrderForm from '../../PurchaseOrderForm';
import type { PurchaseOrder } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const poId = params.id as string;
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
              items: Array.isArray(data.data.items) ? data.data.items : [] // Ensure items is an array
            };
            setPurchaseOrder(fetchedPO);
          } else {
            setError(data.message || "Failed to fetch PO data for editing.");
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching PO.");
            toast({title: "Error", description: `Failed to load PO: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [poId, toast]);

  // PurchaseOrderForm handles the actual save operation.

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading PO details...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/purchases" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders</Button></Link>
      </div>
    );
  }
  
  if (!purchaseOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Purchase Order not found.</p>
        <Link href="/purchases" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/purchases" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Purchase Orders</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Edit Purchase Order: {purchaseOrder.poNumber}
        </h1>
      </header>
      
      <PurchaseOrderForm purchaseOrder={purchaseOrder} /> {/* onSave prop removed */}
    </div>
  );
}

    