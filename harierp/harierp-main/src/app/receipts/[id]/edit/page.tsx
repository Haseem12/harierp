
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ReceiptForm from '../../ReceiptForm';
import type { Receipt } from '@/types';
// mockReceipts, mockLedgerAccounts removed
import { useToast } from '@/hooks/use-toast';

export default function EditReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as string;
  const [receipt, setReceipt] = useState<Receipt | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (receiptId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://sajfoods.net/busa-api/database/get_receipt.php?id=${receiptId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            // Ensure date fields are Date objects
            const fetchedReceipt = {
              ...data.data,
              receiptDate: new Date(data.data.receiptDate),
              createdAt: new Date(data.data.createdAt),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
            };
            setReceipt(fetchedReceipt);
          } else {
            setError(data.message || "Failed to fetch receipt data for editing.");
            setReceipt(undefined);
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching receipt for editing.");
            toast({title: "Error", description: `Failed to load receipt: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [receiptId, toast]);

  const handleSaveSuccess = (updatedReceiptId: string) => {
    toast({
      title: "Receipt Updated",
      description: `Receipt has been successfully updated.`,
    });
    router.push(`/receipts/${updatedReceiptId}`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading receipt details...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/receipts" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Receipts</Button></Link>
      </div>
    );
  }
  
  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Receipt not found.</p>
        <Link href="/receipts" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Receipts
          </Button>
        </Link>
      </div>
    );
  }

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
          Edit Receipt: {receipt.receiptNumber}
        </h1>
      </header>
      
      <ReceiptForm receipt={receipt} onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
    
    