
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import LedgerAccountForm from '../../LedgerAccountForm';
import type { LedgerAccount } from '@/types';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function EditLedgerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;
  
  const [account, setAccount] = useState<LedgerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchAccount() {
      try {
        const res = await fetch(`https://sajfoods.net/busa-api/database/edit_Ledger.php?id=${accountId}`);
        const data = await res.json();
  
        if (data.error) {
          setError(data.error);
        } else {
          setAccount(data);
        }
      } catch (err) {
        setError("Failed to fetch account");
      } finally {
        setIsLoading(false);
      }
    }
  
    if (accountId) fetchAccount();
  }, [accountId]);
  
  

  const handleSaveSuccess = (updatedAccountId: string) => {
    console.log("Ledger account updated with ID:", updatedAccountId);
    // LedgerAccountForm handles toast and redirection.
    router.push(`/ledger-accounts/${updatedAccountId}`); 
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading account details...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full"><p className="text-destructive">Error loading account: {error.message}</p></div>;
  }

  if (!account && !isLoading) { // Check !isLoading to ensure data fetch attempt completed
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Ledger Account not found.</p>
        <Link href="/ledger-accounts" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Accounts
          </Button>
        </Link>
      </div>
    );
  }
  
  // Render form only if account is loaded
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
          Edit Ledger Account: {account?.name || 'Loading...'}
        </h1>
      </header>
      
      {account && <LedgerAccountForm account={account} onSaveSuccess={handleSaveSuccess} />}
    </div>
  );
}
