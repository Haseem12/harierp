
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, ShoppingCart, User, CalendarDays, Banknote, Tag, RefreshCw } from 'lucide-react';
import type { Sale, Invoice } from '@/types';
import { defaultCompanyDetails } from '@/types';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const saleId = params.id as string;

  const fetchSale = useCallback(async () => {
    if (!saleId) return;
    setIsLoading(true);
    setError(null);
    fetch(`https://sajfoods.net/busa-api/database/get_sale.php?id=${saleId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch sale details');
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
           const saleData = data.data;
           setSale({
             ...saleData,
             saleDate: saleData.saleDate && isValid(parseISO(saleData.saleDate)) ? parseISO(saleData.saleDate) : new Date(0),
             customer: saleData.customer || { id: saleData.customerId, name: saleData.customerName || "N/A" }
           });
           console.log(data); // Log data as requested
        } else {
          throw new Error(data.message || 'Sale not found.');
        }
      })
      .catch(err => {
        setError(err.message);
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [saleId, toast]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  const handleGenerateInvoice = async () => {
    if (!sale) return;
    setIsGeneratingInvoice(true);
    toast({ title: "Generating Invoice...", description: "Please wait while the invoice is created." });
    
    try {
      const { customer, items, subTotal, discountAmount, taxAmount, totalAmount, notes } = sale;
      const invoicePayload = {
        saleId: sale.id,
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + (customer.creditPeriod || 15) * 86400000), 'yyyy-MM-dd'),
        customerId: customer.id,
        customerName: customer.name,
        customerAddress: customer.address,
        customerEmail: customer.phone, // Assuming phone is used as email placeholder
        items,
        subTotal,
        discountAmount,
        taxAmount,
        totalAmount,
        notes,
        status: (sale.paymentMethod === 'Credit') ? 'Sent' : 'Paid',
        companyDetails: defaultCompanyDetails,
      };

      const response = await fetch(`https://sajfoods.net/busa-api/database/save_invoice.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      const result = await response.json();
      if (result.success && result.id) {
        toast({ title: "Invoice Generated", description: `Invoice ${result.invoiceNumber || result.id} created successfully.` });
        await fetchSale(); // Re-fetch sale data to get the new invoiceId
        router.push(`/invoices/${result.id}`);
      } else {
        throw new Error(result.message || "Failed to generate invoice.");
      }
    } catch (err: any) {
      toast({ title: 'Invoice Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  const formatDate = (date: Date | string) => date ? format(new Date(date), 'PPP p') : 'N/A';

  if (isLoading) return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!sale) return <div className="text-center">Sale not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/sales" passHref>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Sales</span>
          </Button>
        </Link>
        <div className="flex gap-2">
          {sale.invoiceId ? (
            <Link href={`/invoices/${sale.invoiceId}`} passHref>
              <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> View Linked Invoice</Button>
            </Link>
          ) : (
            <Button onClick={handleGenerateInvoice} disabled={isGeneratingInvoice}>
              {isGeneratingInvoice ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Invoice
            </Button>
          )}
        </div>
      </div>

      <Card className="w-full shadow-lg">
        <CardHeader className="bg-muted/50 p-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart /> Sale Details
              </CardTitle>
              <CardDescription>Sale ID: {sale.id}</CardDescription>
            </div>
            <Badge variant={sale.status === 'Completed' ? 'default' : 'secondary'}>{sale.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Customer</h3>
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {sale.customer.name}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="flex items-center md:justify-end gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /> {formatDate(sale.saleDate)}</p>
              <p className="flex items-center md:justify-end gap-2"><Tag className="h-4 w-4 text-muted-foreground" /> {sale.paymentMethod}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(sale.subTotal)}</span></div>
              {sale.discountAmount && <div className="flex justify-between"><span>Discount:</span><span>-{formatCurrency(sale.discountAmount)}</span></div>}
              {sale.taxAmount && <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(sale.taxAmount)}</span></div>}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total:</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-8 pt-4 border-t">
              <h4 className="font-semibold mb-1">Notes:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-4 text-center text-xs text-muted-foreground">
          This is a record of the sale transaction. An invoice can be generated if needed.
        </CardFooter>
      </Card>
    </div>
  );
}
