
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Receipt, LedgerAccount, ReceiptPaymentMethod, BankName } from '@/types';
import { receiptPaymentMethods, bankNames } from '@/types';
import { DatePickerComponent } from "@/components/ui/date-picker";
// getLedgerAccountOutstandingBalance removed as we will fetch live data
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';

interface ReceiptFormProps {
  receipt?: Receipt;
  onSaveSuccess?: (receiptId: string) => void;
}

export default function ReceiptForm({ receipt: existingReceipt, onSaveSuccess }: ReceiptFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [fetchedLedgerAccounts, setFetchedLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [isLoadingLedgers, setIsLoadingLedgers] = useState(true);

  const [receiptNumber, setReceiptNumber] = useState(
    existingReceipt?.receiptNumber || `RCPT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
  );
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string | undefined>(existingReceipt?.ledgerAccountId);
  const [receiptDate, setReceiptDate] = useState<Date | undefined>(
    existingReceipt?.receiptDate ? new Date(existingReceipt.receiptDate) : new Date()
  );
  const [amountReceived, setAmountReceived] = useState<number>(existingReceipt?.amountReceived || 0);
  const [paymentMethod, setPaymentMethod] = useState<ReceiptPaymentMethod | undefined>(
    existingReceipt?.paymentMethod || receiptPaymentMethods[0]
  );
  const [selectedBankName, setSelectedBankName] = useState<BankName | undefined>(existingReceipt?.bankName);
  const [referenceNumber, setReferenceNumber] = useState(existingReceipt?.referenceNumber || '');
  const [notes, setNotes] = useState(existingReceipt?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid confusion

  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);


  useEffect(() => {
    setIsLoadingLedgers(true);
    fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php')
      .then(async res => {
        if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to get error text from response.");
            console.error("Raw error response (Ledger Accounts Fetch - ReceiptForm):", errorText.substring(0, 500));
            throw new Error(`HTTP error! Ledger Accounts status: ${res.status} - ${errorText.substring(0, 100)}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await res.text();
          console.warn("Non-JSON response from getLedgerAccounts.php (ReceiptForm):", responseText.substring(0, 200) + "...");
          throw new Error(`Expected JSON, got ${contentType}. Response: ${responseText.substring(0,100)}...`);
        }
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const validAccounts = data.data.filter((acc: any) => {
            if (acc && acc.id && typeof acc.id === 'string' && acc.id.trim() !== '') {
              return true;
            }
            return false;
          });
          setFetchedLedgerAccounts(validAccounts);
        } else {
          toast({ title: "Error", description: `Failed to fetch ledger accounts: ${data.message || 'Unknown error or unexpected data format.'}`, variant: "destructive" });
          setFetchedLedgerAccounts([]);
        }
      })
      .catch(error => {
        let description = error.message;
        if (error.message && error.message.includes("Unexpected token '<'")) {
            description = "Failed to fetch ledger accounts: Server returned an HTML error page instead of JSON. Check server logs for details.";
        }
        toast({ title: "Fetch Error", description: `Ledger accounts: ${description}`, variant: "destructive" });
        setFetchedLedgerAccounts([]);
      })
      .finally(() => setIsLoadingLedgers(false));
  }, [toast]);

  useEffect(() => {
    if (selectedLedgerAccountId) {
      const account = fetchedLedgerAccounts.find(acc => acc.id === selectedLedgerAccountId);
      setSelectedAccountName(account?.name || null);
      
      setIsLoadingBalance(true);
      setOutstandingBalance(null); // Reset while fetching
      setCreditLimit(null); // Reset while fetching

      fetch(`https://sajfoods.net/busa-api/database/get_ledger_account_d.php?id=${selectedLedgerAccountId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.");
            throw new Error(`HTTP error! Ledger Detail status: ${res.status} - ${errorText}`);
          }
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const responseText = await res.text();
            console.warn("Non-JSON response from get_ledger_account_d.php (ReceiptForm):", responseText.substring(0, 200) + "...");
            throw new Error(`Expected JSON for ledger detail, got ${contentType}.`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.account) {
            const rawBalance = data.outstandingBalance;
            setOutstandingBalance(rawBalance !== undefined && rawBalance !== null ? Number(rawBalance) : null);
            
            const rawCreditLimit = data.account.creditLimit;
            setCreditLimit(rawCreditLimit !== undefined && rawCreditLimit !== null ? Number(rawCreditLimit) : null);
          } else {
            toast({ title: "Balance Error", description: `Could not load account balance: ${data.message || 'Account data missing.'}`, variant: "destructive" });
            setOutstandingBalance(null);
            setCreditLimit(null);
          }
        })
        .catch(error => {
          toast({ title: "Balance Fetch Error", description: error.message, variant: "destructive" });
          setOutstandingBalance(null);
          setCreditLimit(null);
        })
        .finally(() => setIsLoadingBalance(false));

    } else {
      setSelectedAccountName(null);
      setOutstandingBalance(null);
      setCreditLimit(null);
    }
  }, [selectedLedgerAccountId, fetchedLedgerAccounts, toast]);

  const formatCurrency = (value: number | null) => {
    if (value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const selectedAccount = fetchedLedgerAccounts.find(acc => acc.id === selectedLedgerAccountId);

    if (!selectedLedgerAccountId || !selectedAccount) {
      toast({ title: "Error", description: "Please select a valid ledger account.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!receiptDate) {
      toast({ title: "Error", description: "Please select a receipt date.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (amountReceived <= 0) {
      toast({ title: "Error", description: "Amount received must be greater than zero.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Error", description: "Please select a payment method.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const receiptPayload: any = {
      id: existingReceipt?.id,
      receiptNumber,
      receiptDate: format(receiptDate, "yyyy-MM-dd"),
      ledgerAccountId: selectedLedgerAccountId,
      ledgerAccountName: selectedAccount.name,
      amountReceived,
      paymentMethod,
      bankName: selectedBankName || null,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
      createdAt: existingReceipt?.createdAt ? format(new Date(existingReceipt.createdAt as any), "yyyy-MM-dd HH:mm:ss") : format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      updatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
    };

    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_receipt.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server.");
        console.error("Server Response Error Text (Save Receipt):", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText || response.statusText}`);
      }
      const result = await response.json();

      if (result.success && result.id) {
        toast({
          title: existingReceipt ? "Receipt Updated" : "Receipt Created",
          description: `Receipt "${receiptPayload.receiptNumber}" for ${receiptPayload.ledgerAccountName} has been successfully processed.`,
        });
        if (onSaveSuccess) {
          onSaveSuccess(result.id);
        } else {
          router.push(`/receipts/${result.id}`);
        }
      } else {
        console.error("PHP Script Error (Save Receipt):", result.message || "Unknown error from PHP script.");
        throw new Error(result.message || "Failed to save receipt. No ID returned from server.");
      }
    } catch (error: any) {
      console.error("Full error object (Save Receipt):", error);
      let description = error.message;
       if (error.message && error.message.includes("Failed to fetch")) {
        description = "Network error: Could not connect to the server. Please check your internet connection and server status (CORS might be an issue).";
      }
      toast({ title: "Save Failed", description: description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validLedgerAccountsForDropdown = useMemo(() => {
    return Array.isArray(fetchedLedgerAccounts)
      ? fetchedLedgerAccounts.filter(acc => acc && typeof acc.id === 'string' && acc.id.trim() !== '')
      : [];
  }, [fetchedLedgerAccounts]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{existingReceipt ? 'Edit Receipt' : 'Create New Receipt'}</CardTitle>
          <CardDescription>
            {existingReceipt ? `Editing receipt ${existingReceipt.receiptNumber}` : 'Record a new payment received.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ledgerAccount">Ledger Account (Customer/Debtor) <span className="text-destructive">*</span></Label>
              <Select onValueChange={setSelectedLedgerAccountId} value={selectedLedgerAccountId} required disabled={isLoadingLedgers}>
                <SelectTrigger id="ledgerAccount">
                  <SelectValue placeholder={isLoadingLedgers ? <span className='flex items-center'><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading accounts...</span> : "Select account"} />
                </SelectTrigger>
                <SelectContent>
                  {validLedgerAccountsForDropdown.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccountName && (
                <div className="mt-2 text-sm text-muted-foreground border p-2 rounded-md bg-muted/30">
                  <p>Account: <span className="font-medium text-foreground">{selectedAccountName}</span></p>
                  {isLoadingBalance ? (
                     <p className="flex items-center"><RefreshCw className="mr-2 h-3 w-3 animate-spin" /> Loading balance...</p>
                  ) : (
                    <>
                      <p>Outstanding: <span className={`font-medium ${outstandingBalance !== null && outstandingBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>{formatCurrency(outstandingBalance)}</span></p>
                      {creditLimit !== null && <p>Credit Limit: <span className="font-medium text-foreground">{formatCurrency(creditLimit)}</span></p>}
                    </>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="receiptNumber">Receipt Number</Label>
              <Input id="receiptNumber" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiptDate">Receipt Date <span className="text-destructive">*</span></Label>
              <DatePickerComponent date={receiptDate} setDate={setReceiptDate} />
            </div>
            <div>
              <Label htmlFor="amountReceived">Amount Received (NGN) <span className="text-destructive">*</span></Label>
              <Input
                id="amountReceived"
                type="number"
                value={amountReceived}
                onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Payment Method <span className="text-destructive">*</span></Label>
              <Select onValueChange={(value: ReceiptPaymentMethod) => setPaymentMethod(value)} value={paymentMethod} required>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {receiptPaymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bankName">Bank (Optional)</Label>
              <Select onValueChange={(value: BankName | undefined) => setSelectedBankName(value)} value={selectedBankName}>
                <SelectTrigger id="bankName">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {bankNames.map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="e.g., Cheque no., Transfer ID"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details about the payment..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isLoadingLedgers || !selectedLedgerAccountId || !receiptDate || amountReceived <= 0 || !paymentMethod}>
          {isSubmitting ? (existingReceipt ? 'Updating...' : 'Saving...') : (existingReceipt ? 'Save Changes' : 'Save Receipt')}
        </Button>
      </div>
    </form>
  );
}
    
    

    