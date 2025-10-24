"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { ArrowLeft, Edit, Trash2, RefreshCw, Printer, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Invoice, Receipt } from "@/types"
import { format, isValid, parseISO } from "date-fns"

export default function InvoiceDetailsPage() {
  const params = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [relatedReceipts, setRelatedReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const invoiceId = params.id as string

  const fetchData = useCallback(async () => {
    if (!invoiceId) return
    setIsLoading(true)
    setError(null)
    try {
      // Fetch Invoice
      const invoiceRes = await fetch(`https://sajfoods.net/busa-api/database/get_invoice.php?id=${invoiceId}`)
      if (!invoiceRes.ok) throw new Error(`HTTP error fetching invoice! status: ${invoiceRes.status}`)
      const invoiceData = await invoiceRes.json()

      if (invoiceData.success && invoiceData.data) {
        const fetchedInvoice = {
          ...invoiceData.data,
          issueDate:
            invoiceData.data.issueDate && isValid(parseISO(invoiceData.data.issueDate))
              ? parseISO(invoiceData.data.issueDate)
              : new Date(),
          dueDate:
            invoiceData.data.dueDate && isValid(parseISO(invoiceData.data.dueDate))
              ? parseISO(invoiceData.data.dueDate)
              : new Date(),
          items: Array.isArray(invoiceData.data.items)
            ? invoiceData.data.items
            : JSON.parse(invoiceData.data.items || "[]"),
        }
        setInvoice(fetchedInvoice)

        // Fetch all receipts for the customer to calculate payment status
        if (fetchedInvoice.customer?.id) {
          const receiptsRes = await fetch(
            `https://sajfoods.net/busa-api/database/get_receipts.php?customerId=${fetchedInvoice.customer.id}`,
          )
          if (!receiptsRes.ok) console.warn(`Could not fetch receipts for customer ${fetchedInvoice.customer.id}`)
          else {
            const receiptsData = await receiptsRes.json()
            if (receiptsData.success && Array.isArray(receiptsData.data)) {
              setRelatedReceipts(
                receiptsData.data.map((r: any) => ({ ...r, amountReceived: Number(r.amountReceived) })),
              )
            }
          }
        }
      } else {
        setError(invoiceData.message || "Invoice not found or invalid response format")
      }
    } catch (err: any) {
      setError(`Failed to fetch invoice: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { amountPaid, paymentStatus, amountDue } = useMemo(() => {
    if (!invoice) return { amountPaid: 0, paymentStatus: "Unpaid", amountDue: 0 }

    // For this prototype, we'll sum all receipts for the customer as payment towards all invoices.
    // A real app would need a system to link receipts to specific invoices.
    const totalPaidByCustomer = relatedReceipts.reduce((sum, receipt) => sum + receipt.amountReceived, 0)
    const invoiceTotal = invoice.totalAmount

    // We'll cap the "paid" amount at the invoice total for this view.
    const paidForThisInvoice = Math.min(totalPaidByCustomer, invoiceTotal)
    const due = Math.max(0, invoiceTotal - paidForThisInvoice)

    let status: "Pending Payment" | "Partially Paid" | "Unpaid" = "Unpaid"
    if (paidForThisInvoice >= invoiceTotal) {
      status = "Pending Payment"
    } else if (paidForThisInvoice > 0) {
      status = "Partially Paid"
    }

    return { amountPaid: paidForThisInvoice, paymentStatus: status, amountDue: due }
  }, [invoice, relatedReceipts])

  const handleDeleteInvoice = async () => {
    if (!invoice) return
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
    window.print()
  }

  const handleDownloadCsv = () => {
    if (!invoice) return
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += "Invoice Details\n"
    csvContent += `Invoice #,${invoice.invoiceNumber}\n`
    csvContent += `Issue Date,${format(invoice.issueDate, "yyyy-MM-dd")}\n`
    csvContent += `Due Date,${format(invoice.dueDate, "yyyy-MM-dd")}\n`
    csvContent += `Customer,${invoice.customer.name}\n\n`
    csvContent += "Item,Quantity,Unit Price,Total Price\n"
    invoice.items.forEach((item) => {
      csvContent += `"${item.productName}",${item.quantity},${item.unitPrice},${item.totalPrice}\n`
    })
    csvContent += "\n"
    csvContent += `Subtotal,,,"${invoice.subTotal}"\n`
    if (invoice.discountAmount) csvContent += `Discount,,,"${invoice.discountAmount}"\n`
    if (invoice.taxAmount) csvContent += `Tax,,,"${invoice.taxAmount}"\n`
    csvContent += `Total,,,"${invoice.totalAmount}"\n\n`
    csvContent += `Amount Paid,,,"${amountPaid}"\n`
    csvContent += `Amount Due,,,"${amountDue}"\n`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `invoice_${invoice.invoiceNumber}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount)
  const formatDate = (date: Date | string) => format(new Date(date), "PPP")

  const getStatusBadgeVariant = (status: Invoice["status"]): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Paid":
        return "default"
      case "Sent":
        return "secondary"
      case "Draft":
        return "outline"
      case "Overdue":
        return "destructive"
      case "Cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  if (error) return <div className="text-center text-red-500">Error: {error}</div>
  if (!invoice) return <div className="text-center">Invoice not found.</div>

  const hasItems = invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0

  const watermarkText = invoice.status === "Paid" ? "PAID" : invoice.status === "Overdue" ? "OVERDUE" : ""
  const displayStatus = invoice.status === "Sent" ? "Approved" : invoice.status

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 print:hidden">
          <div className="flex justify-between items-center mb-6">
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Link href={`/invoices/${params.id}/edit`}>
                <Button size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete invoice "{invoice.invoiceNumber}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteInvoice}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <div id="printable-invoice-area" className="mx-auto bg-white print:bg-white">
          <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
            {/* Header - Keep as is */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 print:mb-6">
              <div className="flex items-center gap-4">
                <img
  src="/hari logo-01.png"
  alt="Company Logo"
  style={{
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    objectFit: "cover",
  }}
/>

                <div>
                  <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
                  <p className="text-muted-foreground text-sm"># {invoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-lg font-semibold">Hari Industries Limited</h2>
                <p className="text-xs text-muted-foreground">
                  KM 3 Zaria-Kano Expressway, Maraban Gwanda, Sabon Gari Zaria Kaduna State
                </p>
                <p className="text-xs text-muted-foreground">+234 8093939368, 08125293535</p>
                <p className="text-xs text-muted-foreground">billing@hariindustries.ng, contact@hariindustries.ng</p>
              </div>
            </div>

            <Separator className="mb-6 print:mb-4" />

            <div className="grid grid-cols-2 gap-6 mb-8 print:mb-6 print:gap-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Bill To</h3>
                <p className="font-semibold text-sm">{invoice.customer.name}</p>
                <p className="text-xs text-muted-foreground">{invoice.customer.address}</p>
                <p className="text-xs text-muted-foreground">{invoice.customer.email}</p>
              </div>
              <div className="space-y-2 text-sm print:text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Invoice #:</span>
                  <span>{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Issue Date:</span>
                  <span>{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Due Date:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                    {displayStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mb-6 print:mb-4">
              <Table className="text-sm print:text-xs">
                <TableHeader>
                  <TableRow className="border-b-2 print:border-b">
                    <TableHead className="w-[50%] py-2 print:py-1">Item Description</TableHead>
                    <TableHead className="text-right py-2 print:py-1">Qty</TableHead>
                    <TableHead className="text-right py-2 print:py-1">Unit Price</TableHead>
                    <TableHead className="text-right py-2 print:py-1">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasItems ? (
                    invoice.items.map((item, index) => (
                      <TableRow key={item.productId || index} className="border-b print:border-b">
                        <TableCell className="py-2 print:py-1">{item.productName}</TableCell>
                        <TableCell className="text-right py-2 print:py-1">{item.quantity}</TableCell>
                        <TableCell className="text-right py-2 print:py-1">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right py-2 print:py-1 font-medium">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No items on this invoice.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator className="mb-6 print:mb-4" />

            <div className="grid grid-cols-3 gap-6 mb-8 print:mb-6 print:gap-4">
              {/* Notes section */}
              <div className="col-span-2">
                {invoice.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Notes</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                  </div>
                )}
              </div>

              {/* Totals section */}
              <div className="space-y-2 text-sm print:text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subTotal)}</span>
                </div>
                {invoice.discountAmount && invoice.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount && invoice.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <Separator className="my-2 print:my-1" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Amount Paid:</span>
                  <span>-{formatCurrency(amountPaid)}</span>
                </div>
                <Separator className="my-2 print:my-1" />
                <div className="flex justify-between font-bold text-base print:text-sm bg-primary/10 p-2 rounded">
                  <span className="text-primary">Amount Due:</span>
                  <span className="text-primary">{formatCurrency(amountDue)}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 print:mt-8">
              <Separator className="mb-8 print:mb-6" />
              <div className="grid grid-cols-2 gap-8 print:gap-6">
                <div className="text-center">
                  <div className="border-t border-foreground h-12 print:h-8 mb-1"></div>
                  <p className="text-xs font-semibold">Authorized Signature</p>
                  <p className="text-xs text-muted-foreground">Date: _______________</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-foreground h-12 print:h-8 mb-1"></div>
                  <p className="text-xs font-semibold">Customer Signature</p>
                  <p className="text-xs text-muted-foreground">Date: _______________</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 print:mt-6 text-center text-xs text-muted-foreground border-t pt-4 print:pt-2">
              <p>Thank you for your business! Please make payments to the designated company account.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          #printable-invoice-area, #printable-invoice-area * {
            visibility: visible;
          }

          #printable-invoice-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 10mm;
            box-sizing: border-box;
            background: white;
            box-shadow: none !important;
            border: none !important;
          }

          @page :header {
            display: none;
          }

          @page :footer {
            display: none;
          }

          /* Prevent page breaks inside elements */
          table, tr, td {
            page-break-inside: avoid;
          }

          /* Ensure text is visible */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}
