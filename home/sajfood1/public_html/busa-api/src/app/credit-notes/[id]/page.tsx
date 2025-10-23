
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Printer, Trash2, User, CalendarDays, Banknote, FileText as FileTextIcon, Hash, Info, Package, RefreshCw } from 'lucide-react';
import type { CreditNote } from '@/types';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

export default function CreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const creditNoteId = params.id as string;

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
            setError(data.message || "Failed to fetch credit note details.");
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching credit note.");
            toast({title: "Error", description: `Failed to load credit note: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [creditNoteId, toast]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const handleDelete = async () => {
    if (!creditNote) return;
    try {
      const response = await fetch('https://harisindustries.com.ng/busa-api/database/delete_credit_note.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: creditNote.id }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Credit Note Deleted", description: `Credit Note "${creditNote?.creditNoteNumber}" has been removed.` });
        router.push('/credit-notes');
      } else {
        throw new Error(result.message || "Failed to delete credit note from server.");
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading credit note...</div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center h-full"><p className="text-destructive mb-4">Error: {error}</p><Link href="/credit-notes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Credit Notes</Button></Link></div>;
  }
  if (!creditNote) {
    return <div className="flex flex-col items-center justify-center h-full"><p className="mb-4">Credit Note not found.</p><Link href="/credit-notes" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Credit Notes</Button></Link></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/credit-notes" passHref><Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Back</span></Button></Link>
        <div className="flex gap-2">
          <Link href={`/credit-notes/${creditNote.id}/edit`} passHref><Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit</Button></Link>
          {/* <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button> */}
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete credit note &quot;{creditNote.creditNoteNumber}&quot;.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="w-full shadow-lg">
        <CardHeader className="bg-muted/50 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div><CardTitle className="text-2xl font-bold mb-1">Credit Note {creditNote.creditNoteNumber}</CardTitle><CardDescription>Details of the issued credit note.</CardDescription></div>
            <div className="text-sm text-muted-foreground sm:text-right mt-2 sm:mt-0"><p>Issued: {creditNote.createdAt ? format(new Date(creditNote.createdAt), 'PPP p') : 'N/A'}</p></div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid gap-4">
          <InfoItem icon={User} label="Credited To" value={creditNote.ledgerAccountName || 'N/A'} />
          <InfoItem icon={CalendarDays} label="Credit Note Date" value={creditNote.creditNoteDate ? format(new Date(creditNote.creditNoteDate), 'PPP') : 'N/A'} />
          <InfoItem icon={Banknote} label="Amount Credited" value={formatCurrency(creditNote.amount)} className="font-semibold text-lg text-green-600" />
          <InfoItem icon={FileTextIcon} label="Reason" value={creditNote.reason} />
          {creditNote.description && (<InfoItem icon={Info} label="Description" value={creditNote.description} fullWidth isTextarea />)}
          {creditNote.relatedInvoiceId && (<InfoItem icon={Hash} label="Related Invoice #" value={creditNote.relatedInvoiceId} />)}

          {creditNote.reason === 'Returned Goods' && creditNote.items && creditNote.items.length > 0 && (
            <div className="md:col-span-2 mt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Returned Items</h4>
              <Card><CardContent className="p-0"><Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {creditNote.items.map((item, index) => (
                        <TableRow key={index}><TableCell>{item.productName}</TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell><TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell></TableRow>
                      ))}
                    </TableBody>
              </Table></CardContent></Card>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-6 text-center text-xs text-muted-foreground"><p>This credit note has been applied to the ledger account.</p></CardFooter>
      </Card>
    </div>
  );
}

interface InfoItemProps { icon: React.ElementType; label: string; value: string | number; className?: string; fullWidth?: boolean; isTextarea?: boolean; }
const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className, fullWidth, isTextarea }) => (
  <div className={cn("flex items-start gap-3", fullWidth ? 'md:col-span-2' : '')}>
    <Icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
    <div><p className="font-medium text-sm">{label}</p>{isTextarea ? <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap", className)}>{value}</p> : <p className={cn("text-sm text-muted-foreground", className)}>{value}</p>}</div>
  </div>
);

    