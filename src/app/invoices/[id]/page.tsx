
"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Trash2, RefreshCw, Printer, Download, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Invoice, Receipt } from "@/types"
import { format, isValid, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

export default function InvoiceDetailsPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [relatedReceipts, setRelatedReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const invoiceId = params.id as string;

  const fetchData = useCallback(async () => {
    if (!invoiceId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch Invoice
      const invoiceRes = await fetch(`https://sajfoods.net/busa-api/database/get_invoice.php?id=${invoiceId}`);
      if (!invoiceRes.ok) throw new Error(`HTTP error fetching invoice! status: ${invoiceRes.status}`);
      const invoiceData = await invoiceRes.json();
      
      if (invoiceData.success && invoiceData.data) {
        const fetchedInvoice = {
          ...invoiceData.data,
          issueDate: invoiceData.data.issueDate && isValid(parseISO(invoiceData.data.issueDate)) ? parseISO(invoiceData.data.issueDate) : new Date(),
          dueDate: invoiceData.data.dueDate && isValid(parseISO(invoiceData.data.dueDate)) ? parseISO(invoiceData.data.dueDate) : new Date(),
          items: Array.isArray(invoiceData.data.items) ? invoiceData.data.items : JSON.parse(invoiceData.data.items || '[]')
        };
        setInvoice(fetchedInvoice);

        // Fetch all receipts for the customer to calculate payment status
        if (fetchedInvoice.customer?.id) {
          const receiptsRes = await fetch(`https://sajfoods.net/busa-api/database/get_receipts.php?customerId=${fetchedInvoice.customer.id}`);
          if (!receiptsRes.ok) console.warn(`Could not fetch receipts for customer ${fetchedInvoice.customer.id}`);
          else {
            const receiptsData = await receiptsRes.json();
            if (receiptsData.success && Array.isArray(receiptsData.data)) {
              setRelatedReceipts(receiptsData.data.map((r:any) => ({...r, amountReceived: Number(r.amountReceived)})));
            }
          }
        }
      } else {
        setError(invoiceData.message || "Invoice not found or invalid response format");
      }
    } catch (err: any) {
      setError(`Failed to fetch invoice: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { amountPaid, paymentStatus, amountDue } = useMemo(() => {
    if (!invoice) return { amountPaid: 0, paymentStatus: 'Unpaid', amountDue: 0 };
    
    // For this prototype, we'll sum all receipts for the customer as payment towards all invoices.
    // A real app would need a system to link receipts to specific invoices.
    const totalPaidByCustomer = relatedReceipts.reduce((sum, receipt) => sum + receipt.amountReceived, 0);
    const invoiceTotal = invoice.totalAmount;
    
    // We'll cap the "paid" amount at the invoice total for this view.
    const paidForThisInvoice = Math.min(totalPaidByCustomer, invoiceTotal);
    const due = Math.max(0, invoiceTotal - paidForThisInvoice);

    let status: 'Pending Payment' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (paidForThisInvoice >= invoiceTotal) {
      status = 'Pending Payment';
    } else if (paidForThisInvoice > 0) {
      status = 'Partially Paid';
    }

    return { amountPaid: paidForThisInvoice, paymentStatus: status, amountDue: due };
  }, [invoice, relatedReceipts]);

  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    try {
      const response = await fetch("https://sajfoods.net/busa-api/database/delete_invoice.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: params.id }),
      })
      const result = await response.json()
      if (result.success) {
        toast({ title: "Invoice Deleted", description: `Invoice "${invoice.invoiceNumber}" has been removed.` })
        router.push("/invoices")
      } else {
        throw new Error(result.message || "Failed to delete invoice.")
      }
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" })
    }
  }
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    if (!invoice) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Invoice Details\n";
    csvContent += `Invoice #,${invoice.invoiceNumber}\n`;
    csvContent += `Issue Date,${format(invoice.issueDate, 'yyyy-MM-dd')}\n`;
    csvContent += `Due Date,${format(invoice.dueDate, 'yyyy-MM-dd')}\n`;
    csvContent += `Customer,${invoice.customer.name}\n\n`;
    csvContent += "Item,Quantity,Unit Price,Total Price\n";
    invoice.items.forEach(item => {
        csvContent += `"${item.productName}",${item.quantity},${item.unitPrice},${item.totalPrice}\n`;
    });
    csvContent += "\n";
    csvContent += `Subtotal,,,"${invoice.subTotal}"\n`;
    if (invoice.discountAmount) csvContent += `Discount,,,"${invoice.discountAmount}"\n`;
    if (invoice.taxAmount) csvContent += `Tax,,,"${invoice.taxAmount}"\n`;
    csvContent += `Total,,,"${invoice.totalAmount}"\n\n`;
    csvContent += `Amount Paid,,,"${amountPaid}"\n`;
    csvContent += `Amount Due,,,"${amountDue}"\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice_${invoice.invoiceNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
  const formatDate = (date: Date | string) => format(new Date(date), "PPP");

  const getStatusBadgeVariant = (status: Invoice["status"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Paid": return "default"
      case "Sent": return "secondary"
      case "Draft": return "outline"
      case "Overdue": return "destructive"
      case "Cancelled": return "destructive"
      default: return "outline"
    }
  }

  if (isLoading) return <div className="flex justify-center items-center h-full"><RefreshCw className="h-8 w-8 animate-spin" /></div>
  if (error) return <div className="text-center text-red-500">Error: {error}</div>
  if (!invoice) return <div className="text-center">Invoice not found.</div>

  const hasItems = invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0;
  
  const watermarkText = invoice.status === 'Paid' ? 'PAID' : (invoice.status === 'Overdue' ? 'OVERDUE' : '');
  const displayStatus = invoice.status === 'Sent' ? 'Approved' : invoice.status;

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Link href="/invoices">
            <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Link href={`/invoices/${params.id}/edit`}>
              <Button size="sm"><Edit className="mr-2 h-4 w-4" />Edit</Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>This action cannot be undone. This will permanently delete invoice "{invoice.invoiceNumber}".</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteInvoice}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div id="printable-invoice-area" data-watermark={watermarkText}>
          <Card className="w-full shadow-lg print:shadow-none print:border-none">
            <CardHeader className="bg-muted/30 p-6 print:bg-transparent">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    {invoice.companyDetails?.logoUrl && <Image src={invoice.companyDetails.logoUrl} alt="Company Logo" width={60} height={60} className="rounded-full" />}
                    <div>
                        <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
                        <p className="text-muted-foreground"># {invoice.invoiceNumber}</p>
                    </div>
                </div>
                <div className="text-left sm:text-right">
                  <h2 className="text-lg font-semibold">{invoice.companyDetails.name}</h2>
                  <p className="text-sm text-muted-foreground">{invoice.companyDetails.address}</p>
                  <p className="text-sm text-muted-foreground">{invoice.companyDetails.phone}</p>
                  <p className="text-sm text-muted-foreground">{invoice.companyDetails.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">BILL TO</h3>
                  <p className="font-bold text-lg">{invoice.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer.address}</p>
                  <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-muted-foreground">Issue Date:</span>
                    <p>{formatDate(invoice.issueDate)}</p>
                  </div>
                   <div>
                    <span className="font-semibold text-muted-foreground">Due Date:</span>
                    <p>{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Invoice Status:</span>
                    <p><Badge variant={getStatusBadgeVariant(invoice.status)}>{displayStatus}</Badge></p>
                  </div>
                   <div>
                    <span className="font-semibold text-muted-foreground">Payment Status:</span>
                    <p>
                        <Badge variant={paymentStatus === "Pending Payment" ? "default" : paymentStatus === "Partially Paid" ? "secondary" : "destructive"}>
                            {paymentStatus}
                        </Badge>
                    </p>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasItems ? (
                    invoice.items.map((item, index) => (
                      <TableRow key={item.productId || index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No items on this invoice.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Separator className="my-6" />

              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  {invoice.notes && (
                    <div>
                      <h4 className="font-semibold mb-1">Notes:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                </div>
                <div className="w-full md:max-w-sm space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subTotal)}</span></div>
                    {invoice.discountAmount && invoice.discountAmount > 0 ? (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(invoice.discountAmount)}</span></div>) : null}
                    {invoice.taxAmount && invoice.taxAmount > 0 ? (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>) : null}
                    <Separator/>
                    <div className="flex justify-between font-bold text-base"><span className="">Total Invoice Amount</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount Paid</span><span>-{formatCurrency(amountPaid)}</span></div>
                    <Separator/>
                    <div className="flex justify-between font-bold text-lg bg-primary/10 p-2 rounded-md"><span className="text-primary">Amount Due</span><span className="text-primary">{formatCurrency(amountDue)}</span></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 text-center text-xs text-muted-foreground print:bg-transparent">
              <p>Thank you for your business! Please make payments to the designated company account.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
      <style jsx global>{`
  @media print {
    @page {
      size: A4 portrait; /* or landscape if you prefer */
      margin: 10mm;
    }

    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background-color: #fff !important;
      margin: 0;
      padding: 0;
    }

    .print-container {
      display: block !important;
    }

    /* Hide everything except printable area */
    body > *:not(#printable-invoice-area) {
      visibility: hidden;
    }

    #printable-invoice-area, #printable-invoice-area * {
      visibility: visible;
    }

    #printable-invoice-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      max-width: 210mm; /* ensures perfect A4 width */
      min-height: 297mm; /* ensures full A4 height */
      margin: 0 auto;
      padding: 10mm 15mm;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      overflow: visible !important;
    }

    /* Optional: hide any print:hidden class */
    .print\\:hidden {
      display: none !important;
    }

    /* Optional watermark */
    #printable-invoice-area::after {
      content: attr(data-watermark);
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 10rem;
      color: rgba(0, 0, 0, 0.05);
      font-weight: 700;
      z-index: -1;
      pointer-events: none;
    }
  }
`}</style>
</>
  )
}
