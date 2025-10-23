
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import LedgerAccountForm from '@/app/ledger-accounts/LedgerAccountForm'; // Corrected path
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function RegisterSupplierPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSaveSuccess = (supplierId: string, supplierName: string) => {
    toast({
      title: "Supplier Registered",
      description: `Supplier "${supplierName}" has been successfully created.`,
    });
    router.push('/purchases/suppliers');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/purchases/suppliers" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Suppliers</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          Register New Supplier
        </h1>
      </header>
      
      <LedgerAccountForm 
        onSaveSuccess={handleSaveSuccess}
        registrationMode="supplier" // Pass the mode to the form
      />
    </div>
  );
}
