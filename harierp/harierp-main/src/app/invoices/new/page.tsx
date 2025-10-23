
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import InvoiceForm from '../InvoiceForm'; 
// No longer need onSave prop from here as InvoiceForm handles API calls
// import type { Invoice } from '@/types'; 

export default function NewInvoicePage() {
  // The InvoiceForm will handle the API call and redirection for new invoices.
  // The onSave prop is no longer strictly needed here for that purpose.
  // If any specific action was needed *after* InvoiceForm's own successful save/redirect,
  // onSave could still be used, but it's not required for basic save & redirect functionality.

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/invoices" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Invoices</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Create New Invoice
        </h1>
      </header>
      
      <InvoiceForm /> {/* onSave prop is removed as InvoiceForm handles submission */}
    </div>
  );
}
