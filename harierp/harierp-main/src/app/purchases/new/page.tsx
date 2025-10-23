
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PurchaseOrderForm from '../PurchaseOrderForm';
// mockPurchaseOrders import removed

export default function NewPurchaseOrderPage() {
  // PurchaseOrderForm now handles its own submission to the backend.
  // onSave prop is no longer needed here.
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
          Create New Purchase Order
        </h1>
      </header>
      
      <PurchaseOrderForm /> {/* onSave prop removed */}
    </div>
  );
}

    