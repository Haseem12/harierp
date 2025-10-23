
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import type { Receipt, ReceiptPaymentMethod } from '@/types';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { Download, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PaymentFilterType = 'All' | 'Cash' | 'Bank';

export default function ReceiptActivityLogPage() {
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentFilterType>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchReceiptsForLog = useCallback(async () => {
    console.log("[ReceiptLog Fetch] Starting fetch...");
    setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_receipts.php');
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error text.");
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      console.log("[ReceiptLog Fetch] Raw API data:", result);

      if (result.success && Array.isArray(result.data)) {
        const parsedReceipts = result.data.map((r: any) => {
          let receiptDate = null;
          let createdAt = null;

          if (r.receiptDate) {
            const parsed = r.receiptDate.includes(" ") ? parseISO(r.receiptDate.replace(" ", "T")) : parseISO(r.receiptDate);
            if (isValid(parsed)) receiptDate = parsed;
            else console.warn(`[ReceiptLog Parse] Invalid receiptDate for ${r.id}:`, r.receiptDate);
          } else {
            console.warn(`[ReceiptLog Parse] Missing receiptDate for ${r.id}`);
          }
          
          if (r.createdAt) {
            const parsed = r.createdAt.includes(" ") ? parseISO(r.createdAt.replace(" ", "T")) : parseISO(r.createdAt);
            if (isValid(parsed)) createdAt = parsed;
            else console.warn(`[ReceiptLog Parse] Invalid createdAt for ${r.id}:`, r.createdAt);
          } else {
             console.warn(`[ReceiptLog Parse] Missing createdAt for ${r.id}`);
          }

          const amount = Number(r.amountReceived);

          return { 
            ...r, 
            receiptDate: receiptDate, 
            createdAt: createdAt,
            amountReceived: isNaN(amount) ? 0 : amount, // Ensure amountReceived is a number
          };
        });
        setAllReceipts(parsedReceipts);
        console.log("[ReceiptLog Fetch] Parsed receipts count:", parsedReceipts.length, "First parsed receipt:", parsedReceipts[0]);
      } else {
        toast({ title: "Error", description: result.message || "Failed to fetch receipts log: Unexpected data format.", variant: "destructive" });
        setAllReceipts([]);
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: `Receipts Log: ${error.message}`, variant: "destructive" });
      setAllReceipts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchReceiptsForLog();
  }, [fetchReceiptsForLog]);

  useEffect(() => {
    console.log("[ReceiptLog Filter] Applying filters. Current allReceipts count:", allReceipts.length);
    let receipts = [...allReceipts];

    if (fromDate && isValid(fromDate)) {
      const startDate = startOfDay(fromDate);
      receipts = receipts.filter(r => r.receiptDate && isValid(new Date(r.receiptDate)) && new Date(r.receiptDate) >= startDate);
    }

    if (toDate && isValid(toDate)) {
      const endDate = endOfDay(toDate);
      receipts = receipts.filter(r => r.receiptDate && isValid(new Date(r.receiptDate)) && new Date(r.receiptDate) <= endDate);
    }

    if (paymentMethodFilter === 'Cash') {
      receipts = receipts.filter(r => r.paymentMethod === 'Cash');
    } else if (paymentMethodFilter === 'Bank') {
      const bankPaymentMethods: ReceiptPaymentMethod[] = ['Card', 'Transfer', 'Online', 'Cheque'];
      receipts = receipts.filter(r => bankPaymentMethods.includes(r.paymentMethod));
    }
    
    receipts.sort((a, b) => {
        const dateA = a.receiptDate && isValid(new Date(a.receiptDate)) ? new Date(a.receiptDate).getTime() : 0;
        const dateB = b.receiptDate && isValid(new Date(b.receiptDate)) ? new Date(b.receiptDate).getTime() : 0;
        return dateB - dateA; // Sort descending by date
    });
    setFilteredReceipts(receipts);
    console.log("[ReceiptLog Filter] Filtered receipts count:", receipts.length);
  }, [allReceipts, fromDate, toDate, paymentMethodFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReceiptsForLog();
    toast({ title: "Refreshed", description: "Receipt log updated." });
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(0);
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const totalAmountFiltered = useMemo(() => {
    return filteredReceipts.reduce((sum, receipt) => sum + (receipt.amountReceived || 0), 0); // Ensure receipt.amountReceived is treated as number
  }, [filteredReceipts]);

  const totalCashAmount = useMemo(() => {
    return filteredReceipts
      .filter(r => r.paymentMethod === 'Cash')
      .reduce((sum, receipt) => sum + (receipt.amountReceived || 0), 0);
  }, [filteredReceipts]);

  const totalBankAmount = useMemo(() => {
    const bankPaymentMethods: ReceiptPaymentMethod[] = ['Card', 'Transfer', 'Online', 'Cheque'];
    return filteredReceipts
      .filter(r => bankPaymentMethods.includes(r.paymentMethod))
      .reduce((sum, receipt) => sum + (receipt.amountReceived || 0), 0);
  }, [filteredReceipts]);

  const formatDateSafe = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "N/A";
    let date: Date | null = null;
    if (typeof dateInput === 'string') {
        const parsed = dateInput.includes(" ") ? parseISO(dateInput.replace(" ", "T")) : parseISO(dateInput);
        if (isValid(parsed)) date = parsed;
    } else if (dateInput instanceof Date && isValid(dateInput)) {
        date = dateInput;
    }
    
    if (!date || !isValid(date)) return "Invalid Date";
    return format(date, 'PP');
  };

  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading receipt activity...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <h1 className="text-2xl font-semibold">Receipt Activity Log</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {/* <Button variant="outline"> <Download className="mr-2 h-4 w-4" /> Export Log </Button> */}
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter receipts by date range and payment method type.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fromDate">From Date</Label>
            <DatePickerComponent date={fromDate} setDate={setFromDate} placeholder="Start date" />
          </div>
          <div>
            <Label htmlFor="toDate">To Date</Label>
            <DatePickerComponent date={toDate} setDate={setToDate} placeholder="End date" />
          </div>
          <div>
            <Label htmlFor="paymentMethodFilter">Payment Type</Label>
            <Select value={paymentMethodFilter} onValueChange={(value: PaymentFilterType) => setPaymentMethodFilter(value)}>
              <SelectTrigger id="paymentMethodFilter">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Payments</SelectItem>
                <SelectItem value="Cash">Cash Payments</SelectItem>
                <SelectItem value="Bank">Bank Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary (Based on Filters)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Receipts</p>
            <p className="font-semibold text-lg">{filteredReceipts.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Amount</p>
            <p className="font-semibold text-lg text-green-600">{formatCurrency(totalAmountFiltered)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cash Received</p>
            <p className="font-semibold text-lg">{formatCurrency(totalCashAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Bank Received</p>
            <p className="font-semibold text-lg">{formatCurrency(totalBankAmount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Filtered Receipts Log</CardTitle>
          <CardDescription>Showing {filteredReceipts.length} of {allReceipts.length} total receipts based on active filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Bank Name</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount (NGN)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{formatDateSafe(receipt.receiptDate)}</TableCell>
                    <TableCell>{receipt.ledgerAccountName || 'N/A'}</TableCell>
                    <TableCell>{receipt.paymentMethod}</TableCell>
                    <TableCell>{receipt.bankName || '-'}</TableCell>
                    <TableCell>{receipt.referenceNumber || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(receipt.amountReceived)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No receipts match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            End of list.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
    
    

    

    