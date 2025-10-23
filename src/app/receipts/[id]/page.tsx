
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Printer, Trash2, User, CalendarDays, Banknote, ClipboardList, Hash, Info, AlertCircle, Home, RefreshCw } from 'lucide-react';
import type { Receipt, LedgerAccount } from '@/types';
// getLedgerAccountOutstandingBalance removed as we will fetch live data
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const receiptId = params.id as string;

  useEffect(() => {
    if (receiptId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://sajfoods.net/busa-api/database/get_receipt.php?id=${receiptId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error text from server.");
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const responseText = await res.text().catch(() => "Response body is not text.");
            console.warn("Non-JSON response from get_receipt.php:", responseText.substring(0, 200) + "...");
            throw new Error(`Expected JSON, got ${contentType}. Response: ${responseText.substring(0, 100)}...`);
          }
          return res.json();
        })
        .then(async data => {
          if (data.success && data.data) {
            const fetchedReceipt = {
              ...data.data,
              receiptDate: new Date(data.data.receiptDate),
              createdAt: new Date(data.data.createdAt),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
            };
            setReceipt(fetchedReceipt);

            // After fetching receipt, fetch ledger account details for balance
            if (fetchedReceipt.ledgerAccountId) {
              setIsLoadingBalance(true);
              try {
                const ledgerResponse = await fetch(`https://sajfoods.net/busa-api/database/get_ledger_account_d.php?id=${fetchedReceipt.ledgerAccountId}`);
                if (!ledgerResponse.ok) {
                    const ledgerErrorText = await ledgerResponse.text().catch(() => "Failed to read ledger error text.");
                    throw new Error(`Ledger fetch HTTP error! status: ${ledgerResponse.status} - ${ledgerErrorText}`);
                }
                const ledgerData = await ledgerResponse.json();
                if (ledgerData.success && ledgerData.account) {
                  setOutstandingBalance(ledgerData.outstandingBalance !== undefined ? Number(ledgerData.outstandingBalance) : null);
                  setCreditLimit(ledgerData.account.creditLimit !== undefined ? Number(ledgerData.account.creditLimit) : null);
                } else {
                  console.warn("Failed to fetch ledger details for balance:", ledgerData.message);
                  setOutstandingBalance(null);
                  setCreditLimit(null);
                }
              } catch (ledgerErr: any) {
                console.error("Error fetching ledger details for balance:", ledgerErr);
                toast({title: "Balance Error", description: `Could not load account balance: ${ledgerErr.message}`, variant: "destructive"});
                setOutstandingBalance(null);
                setCreditLimit(null);
              } finally {
                setIsLoadingBalance(false);
              }
            }
          } else {
            setError(data.message || "Failed to fetch receipt details.");
            setReceipt(null);
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching receipt.");
            toast({title: "Error", description: `Failed to load receipt: ${err.message}`, variant: "destructive"});
            setReceipt(null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [receiptId, toast]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const handleDelete = async () => {
    if (!receipt) return;
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/delete_receipt.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: receipt.id }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Receipt Deleted",
          description: `Receipt "${receipt?.receiptNumber}" has been removed.`,
        });
        router.push('/receipts');
      } else {
        throw new Error(result.message || "Failed to delete receipt from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading receipt details...</div>;
  }

  if (error && !receipt) { // Only show full page error if receipt itself failed to load
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/receipts" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Receipts</Button></Link>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Receipt not found.</p>
        <Link href="/receipts" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Receipts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive border border-destructive rounded-md">{error}</div>}
      <div className="flex items-center justify-between mb-6">
        <Link href="/receipts" passHref>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Receipts</span>
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/receipts/${receipt.id}/edit`} passHref>
            <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
          </Link>
          {/* <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button> */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete receipt &quot;{receipt.receiptNumber}&quot;.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="w-full shadow-lg">
        <CardHeader className="bg-muted/50 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-2xl font-bold mb-1">Receipt {receipt.receiptNumber}</CardTitle>
              <CardDescription>Payment received from {receipt.ledgerAccountName || 'N/A'}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right mt-2 sm:mt-0">
              <h3 className="text-lg font-semibold text-foreground">Hari Industries Limited</h3>
              <p>Recorded: {receipt.createdAt ? format(new Date(receipt.createdAt), 'PPP p') : 'N/A'}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem icon={User} label="Received From" value={receipt.ledgerAccountName || 'N/A'} />
            <InfoItem icon={CalendarDays} label="Receipt Date" value={receipt.receiptDate ? format(new Date(receipt.receiptDate), 'PPP') : 'N/A'} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem icon={Banknote} label="Amount Received" value={formatCurrency(receipt.amountReceived)} className="font-semibold text-lg text-green-600" />
            <InfoItem icon={ClipboardList} label="Payment Method" value={receipt.paymentMethod} />
          </div>
           {receipt.bankName && (
            <InfoItem icon={Home} label="Bank" value={receipt.bankName} fullWidth />
          )}
          {receipt.referenceNumber && (
            <InfoItem icon={Hash} label="Reference #" value={receipt.referenceNumber} fullWidth />
          )}
           {isLoadingBalance ? (
             <InfoItem icon={RefreshCw} label="Customer Outstanding Balance" value="Loading..." className="animate-pulse" fullWidth />
           ) : outstandingBalance !== null ? (
            <InfoItem 
              icon={AlertCircle} 
              label="Customer Outstanding Balance" 
              value={formatCurrency(outstandingBalance)} 
              className={outstandingBalance > 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}
              fullWidth 
            />
          ) : (
            <InfoItem icon={AlertCircle} label="Customer Outstanding Balance" value="Could not load" className="text-muted-foreground" fullWidth />
          )}
          {isLoadingBalance ? (
             <InfoItem icon={RefreshCw} label="Customer Credit Limit" value="Loading..." className="animate-pulse" fullWidth />
          ) : creditLimit !== null ? (
             <InfoItem 
              icon={Banknote} 
              label="Customer Credit Limit" 
              value={formatCurrency(creditLimit)} 
              className="font-medium"
              fullWidth 
            />
          ) : (
             <InfoItem icon={Banknote} label="Customer Credit Limit" value="N/A" className="text-muted-foreground" fullWidth />
          )}
          {receipt.notes && (
            <InfoItem icon={Info} label="Notes for this Receipt" value={receipt.notes} fullWidth isTextarea />
          )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-6 text-center text-xs text-muted-foreground">
          <p>Thank you for your payment. This receipt confirms the amount received.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
  fullWidth?: boolean;
  isTextarea?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className, fullWidth, isTextarea }) => (
  <div className={cn("flex items-start gap-3 py-1", fullWidth ? 'md:col-span-2' : '')}>
    <Icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
    <div>
      <p className="font-medium text-sm">{label}</p>
      {isTextarea ? (
        <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap", className)}>{value}</p>
      ) : (
        <p className={cn("text-sm text-muted-foreground", className)}>{value}</p>
      )}
    </div>
  </div>
);
