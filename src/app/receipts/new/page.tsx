
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ReceiptForm from '../ReceiptForm';
import type { Receipt } from '@/types';
// mockReceipts removed
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export default function NewReceiptPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // The onSaveSuccess prop is now used to handle navigation after form submission
  const handleSaveSuccess = (receiptId: string) => {
    // Toast is handled by ReceiptForm, redirection is handled here.
    router.push(`/receipts/${receiptId}`); // Navigate to the detail page of the new receipt
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/receipts" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Receipts</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Create New Receipt
        </h1>
      </header>
      
      <ReceiptForm onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
    
    