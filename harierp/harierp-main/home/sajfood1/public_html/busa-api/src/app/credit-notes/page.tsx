
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Search, Eye, Edit, Trash2, RefreshCw } from 'lucide-react';
import type { CreditNote } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const fetchCreditNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://harisindustries.com.ng/busa-api/database/get_credit_notes.php');
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server");
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCreditNotes(data.data.map((cn: any) => ({ ...cn, creditNoteDate: new Date(cn.creditNoteDate), createdAt: new Date(cn.createdAt) })));
      } else {
        toast({ title: "Error", description: data.message || "Failed to fetch credit notes: Unexpected data format.", variant: "destructive" });
        setCreditNotes([]);
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: `Credit Notes: ${error.message}`, variant: "destructive" });
      setCreditNotes([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchCreditNotes();
  }, [toast]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCreditNotes();
    toast({ title: "Refreshed", description: "Credit notes list updated." });
  };


  const filteredCreditNotes = useMemo(() =>
    creditNotes.filter(cn =>
      cn.creditNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cn.ledgerAccountName && cn.ledgerAccountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      cn.reason.toLowerCase().includes(searchTerm.toLowerCase())
    ), [creditNotes, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleDeleteCreditNote = async (creditNoteId: string) => {
    const creditNoteToDelete = creditNotes.find(cn => cn.id === creditNoteId);
    try {
      const response = await fetch('https://harisindustries.com.ng/busa-api/database/delete_credit_note.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: creditNoteId }),
      });
      const result = await response.json();
      if (result.success) {
        setCreditNotes(prevCreditNotes => prevCreditNotes.filter(cn => cn.id !== creditNoteId));
        toast({
          title: "Credit Note Deleted",
          description: `Credit Note "${creditNoteToDelete?.creditNoteNumber}" has been removed.`,
        });
      } else {
        throw new Error(result.message || "Failed to delete credit note from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading credit notes...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Credit Notes</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* <Button variant="outline"> <FileText className="mr-2 h-4 w-4" /> Export Credit Notes </Button> */}
          <Link href="/credit-notes/new">
            <Button> <PlusCircle className="mr-2 h-4 w-4" /> Create Credit Note </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Credit Note Management</CardTitle>
          <CardDescription>Track and manage all issued credit notes.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by number, account, or reason..."
              className="pl-8 w-full md:w-1/2"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead>CN #</TableHead><TableHead>Date</TableHead>
                <TableHead>Ledger Account</TableHead><TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount (NGN)</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredCreditNotes.length > 0 ? filteredCreditNotes.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell className="font-medium">{cn.creditNoteNumber}</TableCell>
                  <TableCell>{cn.creditNoteDate ? format(new Date(cn.creditNoteDate), 'PP') : 'N/A'}</TableCell>
                  <TableCell>{cn.ledgerAccountName || 'N/A'}</TableCell>
                  <TableCell>{cn.reason}</TableCell>
                  <TableCell className="text-right">{formatCurrency(cn.amount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/credit-notes/${cn.id}`} passHref><DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem></Link>
                        <Link href={`/credit-notes/${cn.id}/edit`} passHref><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit Credit Note</DropdownMenuItem></Link>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Credit Note
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete credit note "{cn.creditNoteNumber}".</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteCreditNote(cn.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">No credit notes found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredCreditNotes.length}</strong> of <strong>{creditNotes.length}</strong> credit notes
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    