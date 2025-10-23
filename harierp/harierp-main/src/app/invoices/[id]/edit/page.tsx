
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import InvoiceForm from '../../InvoiceForm';
import type { Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (invoiceId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://sajfoods.net/busa-api/database/get_invoice.php?id=${invoiceId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((data: Invoice | {success: boolean, data?: Invoice, message?: string}) => {
          let fetchedInvoice: Invoice | undefined;
           if ('success' in data) { // Response is {success: ..., data: ...}
            if (data.success && data.data) {
              fetchedInvoice = data.data;
            } else {
              throw new Error(data.message || "Failed to fetch invoice data for editing.");
            }
          } else { // Direct invoice object
            fetchedInvoice = data;
          }

          if (fetchedInvoice) {
            const formattedInvoice = {
                ...fetchedInvoice,
                issueDate: new Date(fetchedInvoice.issueDate),
                dueDate: new Date(fetchedInvoice.dueDate),
                items: Array.isArray(fetchedInvoice.items) ? fetchedInvoice.items : [],
            };
            setInvoice(formattedInvoice);
          } else {
            setError("Invoice not found for editing.");
            setInvoice(undefined);
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching invoice for editing.");
            toast({title: "Error", description: `Failed to load invoice: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [invoiceId, toast]);

  // The InvoiceForm will handle the API call for saving changes.
  // The onSave prop is optional; if provided, it could perform additional actions after save.
  // For this setup, redirection and toast are handled by InvoiceForm.
  const handleSaveChanges = (updatedInvoice: Invoice) => {
    console.log("Invoice update process initiated from EditInvoicePage for:", updatedInvoice.id);
    // InvoiceForm already handles API call, toast and redirect.
    // This callback could be used for additional client-side logic if needed.
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading invoice details...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/invoices" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Invoices</Button></Link>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Invoice not found.</p>
        <Link href="/invoices" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Invoices</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/invoices" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Edit Invoice: {invoice.invoiceNumber}
        </h1>
      </header>
      
      <InvoiceForm invoice={invoice} onSave={handleSaveChanges} />
    </div>
  );
}
