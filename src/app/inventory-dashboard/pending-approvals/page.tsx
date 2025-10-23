
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, ArrowLeft, RefreshCw, PackageCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import type { ProductStockAdjustmentLog } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export default function PendingApprovalsPage() {
  const [submissions, setSubmissions] = useState<ProductStockAdjustmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubmissions = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_product_stock_logs.php?type=PENDING_APPROVAL');
      if (!response.ok) throw new Error("Failed to fetch pending submissions.");
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setSubmissions(data.data.map((s: any) => ({
          ...s,
          adjustmentDate: s.adjustmentDate ? parseISO(s.adjustmentDate) : new Date(),
          quantityAdjusted: Number(s.quantityAdjusted),
        })));
      } else {
        setSubmissions([]); // Clear list if empty or error
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isLoading]);

  useEffect(() => {
    fetchSubmissions();
  }, []); // Only fetch once on mount

  const handleApprovalAction = async (logEntry: ProductStockAdjustmentLog, action: 'accept' | 'reject') => {
    setProcessingId(logEntry.id);
    try {
      const endpoint = action === 'accept'
        ? 'https://sajfoods.net/busa-api/approve_stock_submission.php'
        : 'https://sajfoods.net/busa-api/delete_product_stock_log.php';

      const payload = { id: logEntry.id, quantityAdjusted: logEntry.quantityAdjusted, notes: logEntry.notes };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: `Submission ${action === 'accept' ? 'Accepted' : 'Rejected'}`,
          description: result.message,
        });
        // Remove the processed item from the list instead of a full refetch
        setSubmissions(prev => prev.filter(sub => sub.id !== logEntry.id));
      } else {
        throw new Error(result.message || `Failed to ${action} submission.`);
      }

    } catch (error: any) {
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading pending submissions...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/inventory-dashboard" passHref>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Finish Bay</span>
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold flex items-center">
            <PackageCheck className="mr-3 h-6 w-6" /> Pending Stock Approvals
          </h1>
        </div>
      </header>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Awaiting Finish Bay Acceptance</CardTitle>
          <CardDescription>
            Review the following stock submissions from the Production department. Approving will add the quantity to the product's main stock. Rejecting will remove the submission record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submission ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length > 0 ? submissions.map((sub) => {
                const isCurrentItemProcessing = processingId === sub.id;
                return (
                  <TableRow key={sub.id} className={cn(isCurrentItemProcessing && "opacity-50")}>
                    <TableCell className="font-medium">{sub.logNumber}</TableCell>
                    <TableCell>{sub.productName}</TableCell>
                    <TableCell className="text-right font-semibold">{sub.quantityAdjusted.toLocaleString()}</TableCell>
                    <TableCell>{isValid(sub.adjustmentDate) ? format(sub.adjustmentDate as Date, 'PP p') : "Invalid Date"}</TableCell>
                    <TableCell className="max-w-xs truncate" title={sub.notes || ''}>{sub.notes || '-'}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" disabled={isCurrentItemProcessing}>
                            {isCurrentItemProcessing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin"/> : <Check className="h-4 w-4 mr-1" />} 
                            Accept
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Acceptance</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to accept {sub.quantityAdjusted} units of {sub.productName}? This will permanently increase the product's stock level.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApprovalAction(sub, 'accept')} className="bg-primary hover:bg-primary/90">
                              Yes, Accept & Add to Stock
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" disabled={isCurrentItemProcessing}>
                             {isCurrentItemProcessing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin"/> : <X className="h-4 w-4 mr-1" />}
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject this submission of {sub.quantityAdjusted} units of {sub.productName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApprovalAction(sub, 'reject')} className="bg-destructive hover:bg-destructive/90">
                              Yes, Reject Submission
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No stock submissions are currently pending approval.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>{submissions.length}</strong> submissions awaiting approval.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
