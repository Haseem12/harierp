
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import CreditNoteForm from '../../CreditNoteForm';
import type { CreditNote } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function EditCreditNotePage() {
  const params = useParams();
  const router = useRouter();
  const creditNoteId = params.id as string;
  const [creditNote, setCreditNote] = useState<CreditNote | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (creditNoteId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://harisindustries.com.ng/busa-api/database/get_credit_note.php?id=${creditNoteId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.");
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            const fetchedCN = {
              ...data.data,
              creditNoteDate: new Date(data.data.creditNoteDate),
              createdAt: new Date(data.data.createdAt),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
              items: Array.isArray(data.data.items) ? data.data.items : (data.data.items ? JSON.parse(data.data.items) : []) // Parse items if string
            };
            setCreditNote(fetchedCN);
          } else {
            setError(data.message || "Failed to fetch credit note data for editing.");
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching credit note for editing.");
            toast({title: "Error", description: `Failed to load credit note: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [creditNoteId, toast]);

  const handleSaveSuccess = (updatedCreditNoteId: string) => {
    toast({
      title: "Credit Note Updated",
      description: `Credit Note has been successfully updated.`,
    });
    router.push(`/credit-notes/${updatedCreditNoteId}`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading credit note...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/credit-notes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Credit Notes</Button></Link>
      </div>
    );
  }
  
  if (!creditNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Credit Note not found.</p>
        <Link href="/credit-notes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Credit Notes</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/credit-notes" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Edit Credit Note: {creditNote.creditNoteNumber}
        </h1>
      </header>
      
      <CreditNoteForm creditNote={creditNote} onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}

    