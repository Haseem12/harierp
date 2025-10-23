
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, FileDown, Eye, Edit, Send, Printer, Trash2 } from 'lucide-react';
import type { Invoice } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('https://harisindustries.com.ng/busa-api/database/get_invoices.php')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data: Invoice[] | {success: boolean; data?: Invoice[]; message?: string}) => {
        if (Array.isArray(data)) { // Direct array of invoices
            setInvoices(data.map(inv => ({...inv, issueDate: new Date(inv.issueDate), dueDate: new Date(inv.dueDate) })));
        } else if (data.success && Array.isArray(data.data)) { // {success: true, data: [...]}
            setInvoices(data.data.map(inv => ({...inv, issueDate: new Date(inv.issueDate), dueDate: new Date(inv.dueDate) })));
        } else {
            toast({ title: "Error", description: `Failed to fetch invoices: ${data.message || 'Unexpected data format.'}`, variant: "destructive" });
            setInvoices([]);
        }
      })
      .catch(error => {
        toast({ title: "Fetch Error", description: `Invoices: ${error.message}`, variant: "destructive" });
        setInvoices([]);
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const filteredInvoices = useMemo(() =>
    invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customer.name && invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    ), [invoices, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const getStatusBadgeVariant = (status: Invoice['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Paid': return 'default'; 
      case 'Sent': return 'secondary'; 
      case 'Draft': return 'outline';
      case 'Overdue': return 'destructive';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const invoiceToDelete = invoices.find(inv => inv.id === invoiceId);
    try {
      const response = await fetch('https://harisindustries.com.ng/busa-api/database/delete_invoice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId }),
      });
      const result = await response.json();
      if (result.success) {
        setInvoices(prevInvoices => prevInvoices.filter(inv => inv.id !== invoiceId));
        toast({
          title: "Invoice Deleted",
          description: `Invoice "${invoiceToDelete?.invoiceNumber}" has been removed.`,
        });
      } else {
        throw new Error(result.message || "Failed to delete invoice from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading invoices...</p></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex items-center gap-2">
          {/* <Button variant="outline"><FileDown className="mr-2 h-4 w-4" />Export Invoices</Button> */}
          <Link href="/invoices/new">
            <Button><PlusCircle className="mr-2 h-4 w-4" />Create Invoice</Button>
          </Link>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>Track and manage all customer invoices.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search invoices..."
              className="pl-8 w-full md:w-1/3"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead>Invoice #</TableHead><TableHead>Customer</TableHead>
                <TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customer.name}</TableCell>
                  <TableCell>{format(new Date(invoice.issueDate), 'PP')}</TableCell>
                  <TableCell>{format(new Date(invoice.dueDate), 'PP')}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/invoices/${invoice.id}`} passHref><DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Invoice</DropdownMenuItem></Link>
                        <Link href={`/invoices/${invoice.id}/edit`} passHref><DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit Invoice</DropdownMenuItem></Link>
                        {/* <DropdownMenuItem><Send className="mr-2 h-4 w-4" /> Send Invoice</DropdownMenuItem>
                        <DropdownMenuItem><Printer className="mr-2 h-4 w-4" /> Print Invoice</DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete invoice "{invoice.invoiceNumber}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No invoices found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> invoices
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    