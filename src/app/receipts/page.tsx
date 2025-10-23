
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Search, Eye, Edit, Trash2, FileDown, RefreshCw, ListChecks } from 'lucide-react';
import type { Receipt } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_receipts.php');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setReceipts(data.data.map((r: any) => ({ 
            ...r, 
            receiptDate: r.receiptDate && isValid(parseISO(r.receiptDate)) ? parseISO(r.receiptDate) : new Date(0), 
            createdAt: r.createdAt && isValid(parseISO(r.createdAt)) ? parseISO(r.createdAt) : new Date(0),
            amountReceived: Number(r.amountReceived || 0)
        })));
      } else {
        toast({ title: "Error", description: data.message || "Failed to fetch receipts: Unexpected data format.", variant: "destructive" });
        setReceipts([]);
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: `Receipts: ${error.message}`, variant: "destructive" });
      setReceipts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReceipts();
    toast({ title: "Refreshed", description: "Receipts list updated." });
  };

  const filteredReceipts = useMemo(() =>
    receipts.filter(receipt =>
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.ledgerAccountName && receipt.ledgerAccountName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      receipt.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
    ), [receipts, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/delete_receipt.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receiptId }),
      });
      const result = await response.json();
      if (result.success) {
        setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== receiptId));
        toast({
          title: "Receipt Deleted",
          description: `Receipt "${receiptToDelete?.receiptNumber}" has been removed.`,
        });
      } else {
        throw new Error(result.message || "Failed to delete receipt from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  const formatDateSafe = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "N/A";
    const date = dateInput instanceof Date ? dateInput : parseISO(String(dateInput));
    if (!isValid(date) || date.getTime() === 0) return "Invalid Date";
    return format(date, 'PP');
  };

  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading receipts...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Receipts</h1>
        <div className="flex items-center gap-2">
           <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
           <Link href="/receipts/activity-log">
            <Button variant="outline"> <ListChecks className="mr-2 h-4 w-4" /> View Activity Log </Button>
          </Link>
          <Link href="/receipts/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Receipt
            </Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Receipt Management</CardTitle>
          <CardDescription>Track and manage all customer payment receipts.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search receipts by number, customer, or payment method..."
              className="pl-8 w-full md:w-1/2"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Amount (NGN)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.length > 0 ? filteredReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                  <TableCell>{formatDateSafe(receipt.receiptDate)}</TableCell>
                  <TableCell>{receipt.ledgerAccountName || 'N/A'}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="text-right">{formatCurrency(receipt.amountReceived)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/receipts/${receipt.id}`} passHref>
                          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Receipt</DropdownMenuItem>
                        </Link>
                        <Link href={`/receipts/${receipt.id}/edit`} passHref>
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit Receipt</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Receipt
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete receipt "{receipt.receiptNumber}".
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteReceipt(receipt.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                 <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No receipts found matching your criteria.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredReceipts.length}</strong> of <strong>{receipts.length}</strong> receipts
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
    
    
