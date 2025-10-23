
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LedgerAccountForm from '../LedgerAccountForm';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function NewLedgerAccountPage() {
  const router = useRouter(); // Initialize useRouter

  const handleSaveSuccess = (accountId: string) => {
    // This function is called by LedgerAccountForm upon successful save.
    // You can add any specific logic here if needed after a new account is created.
    console.log("New ledger account created with ID:", accountId);
    // LedgerAccountForm handles toast and redirection.
    // If you want to explicitly redirect from here:
    // router.push('/ledger-accounts'); 
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/ledger-accounts" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Ledger Accounts</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Create New Ledger Account
        </h1>
      </header>
      
      <LedgerAccountForm onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
