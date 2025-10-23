"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Truck, User, RefreshCw, Trash2, FileSignature } from "lucide-react"
import type { PurchaseOrder } from "@/types"
import { defaultCompanyDetails } from "@/types"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
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

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReceiving, setIsReceiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const poId = params.id as string

  useEffect(() => {
    if (poId) {
      setIsLoading(true)
      setError(null)
      fetch(`https://sajfoods.net/busa-api/database/get_purchase_order.php?id=${poId}`)
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.")
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`)
          }
          return res.json()
        })
        .then((data) => {
          if (data.success && data.data) {
            const fetchedPO = {
              ...data.data,
              orderDate: new Date(data.data.orderDate),
              expectedDeliveryDate: data.data.expectedDeliveryDate
                ? new Date(data.data.expectedDeliveryDate)
                : undefined,
              createdAt: data.data.createdAt ? new Date(data.data.createdAt) : new Date(),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
              items: Array.isArray(data.data.items) ? data.data.items : [],
              supplier: data.data.supplier || {
                id: data.data.supplierId,
                name: data.data.supplierName || "Unknown Supplier",
              },
            }
            setPurchaseOrder(fetchedPO)
          } else {
            setError(data.message || "Failed to fetch PO details.")
          }
        })
        .catch((err) => {
          setError(err.message || "Error fetching PO.")
          toast({ title: "Error", description: `Failed to load PO: ${err.message}`, variant: "destructive" })
        })
        .finally(() => setIsLoading(false))
    }
  }, [poId, toast])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount)
  }

  const getStatusBadgeVariant = (
    status: PurchaseOrder["status"],
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Received":
        return "default"
      case "Ordered":
        return "secondary"
      case "Draft":
        return "outline"
      case "Partially Received":
        return "outline"
      case "Cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const handleReceiveItems = async () => {
    if (!purchaseOrder) return
    setIsReceiving(true)
    try {
      const response = await fetch("https://sajfoods.net/busa-api/database/receive_purchase_order_items.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseOrderId: purchaseOrder.id }),
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error marking PO as received: ${errorText}`)
      }
      const result = await response.json()
      if (result.success) {
        setPurchaseOrder((prev) => (prev ? { ...prev, status: "Received", updatedAt: new Date() } : null))
        toast({
          title: "Items Received",
          description: `PO ${purchaseOrder.poNumber} marked as received and stock updated.`,
        })
      } else {
        throw new Error(result.message || "Failed to mark PO as received.")
      }
    } catch (error: any) {
      toast({ title: "Error Receiving Items", description: error.message, variant: "destructive" })
    } finally {
      setIsReceiving(false)
    }
  }

  const handlePrintGRN = () => {
    window.print()
  }

  const handleDeletePurchaseOrder = async () => {
    if (!purchaseOrder) return
    try {
      const response = await fetch("https://sajfoods.net/busa-api/database/delete_purchase_order.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: purchaseOrder.id }),
      })
      const result = await response.json()
      if (result.success) {
        toast({ title: "Purchase Order Deleted", description: `PO "${purchaseOrder.poNumber}" has been removed.` })
        router.push("/purchases")
      } else {
        throw new Error(result.message || "Failed to delete PO from server.")
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading purchase order details...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-destructive mb-4">Error: {error}</p>
        <Link href="/purchases" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
          </Button>
        </Link>
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Purchase Order not found.</p>
        <Link href="/purchases" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
          </Button>
        </Link>
      </div>
    )
  }

  const isPrintableView = purchaseOrder.status === "Received"
  const viewTitle = "Goods Received Note"

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 print:max-w-full print:p-0 print:m-0">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/purchases" passHref>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Purchase Orders</span>
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/purchases/${purchaseOrder.id}/edit`} passHref>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </Link>
            <Button variant="outline" onClick={handlePrintGRN}>
              <FileSignature className="mr-2 h-4 w-4" /> Print GRN
            </Button>
            {(purchaseOrder.status === "Ordered" || purchaseOrder.status === "Partially Received") && (
              <Button onClick={handleReceiveItems} disabled={isReceiving}>
                {isReceiving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                {isReceiving ? "Processing..." : "Mark as Received"}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete PO "{purchaseOrder.poNumber}". This action cannot be undone and will
                    not adjust stock if items were already received.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePurchaseOrder}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div id="printable-area" className="print:w-full print:h-full">
          <Card className="w-full shadow-lg print:shadow-none print:border-none print:rounded-none print:w-full">
            {/* Header Section */}
            <CardHeader className="bg-muted/50 p-6 print:p-4 print:bg-white print:border-b-2 print:border-foreground">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold print:text-2xl mb-1">{defaultCompanyDetails.name}</h1>
                  <p className="text-sm text-muted-foreground print:text-xs">{defaultCompanyDetails.address}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold print:text-xl text-primary">{viewTitle}</h2>
                  <p className="text-sm font-semibold print:text-xs">Ref: {purchaseOrder.poNumber}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 print:p-4 print:bg-white">
              {/* Document Info Section */}
              <div className="grid grid-cols-3 gap-4 mb-8 print:mb-6 print:gap-2">
                <div className="print:text-xs">
                  <p className="text-xs font-semibold text-muted-foreground print:text-muted-foreground">Order Date</p>
                  <p className="font-semibold">{format(new Date(purchaseOrder.orderDate), "dd MMM yyyy")}</p>
                </div>
                <div className="print:text-xs">
                  <p className="text-xs font-semibold text-muted-foreground print:text-muted-foreground">
                    {isPrintableView ? "Received Date" : "Expected Delivery"}
                  </p>
                  <p className="font-semibold">
                    {isPrintableView
                      ? format(new Date(purchaseOrder.updatedAt || Date.now()), "dd MMM yyyy")
                      : purchaseOrder.expectedDeliveryDate
                        ? format(new Date(purchaseOrder.expectedDeliveryDate), "dd MMM yyyy")
                        : "N/A"}
                  </p>
                </div>
                <div className="text-right print:text-xs">
                  <p className="text-xs font-semibold text-muted-foreground print:text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(purchaseOrder.status)} className="print:text-xs">
                    {purchaseOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Supplier Section */}
              <div className="mb-8 print:mb-6 pb-6 print:pb-4 border-b print:border-b">
                <h3 className="text-sm font-bold text-muted-foreground print:text-xs mb-2 uppercase">
                  Supplier Details
                </h3>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 print:h-3 print:w-3" />
                  <div className="print:text-sm">
                    <p className="font-semibold">{purchaseOrder.supplier.name}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8 print:mb-6">
                <h3 className="text-sm font-bold text-muted-foreground print:text-xs mb-3 uppercase">Items Received</h3>
                <div className="overflow-x-auto">
                  <Table className="print:text-xs">
                    <TableHeader>
                      <TableRow className="print:border-b-2">
                        <TableHead className="print:text-xs print:font-bold">Item Name</TableHead>
                        <TableHead className="text-center print:text-xs print:font-bold">Category</TableHead>
                        <TableHead className="text-center print:text-xs print:font-bold">Qty Ordered</TableHead>
                        {isPrintableView && (
                          <TableHead className="text-center print:text-xs print:font-bold">Qty Received</TableHead>
                        )}
                        <TableHead className="text-center print:text-xs print:font-bold">Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrder.items.map((item, index) => (
                        <TableRow key={`${item.productId}-${index}`} className="print:border-b print:border-gray-300">
                          <TableCell className="print:text-xs">{item.productName}</TableCell>
                          <TableCell className="text-center print:text-xs">{item.category}</TableCell>
                          <TableCell className="text-center print:text-xs">{item.quantity}</TableCell>
                          {isPrintableView && (
                            <TableCell className="text-center print:text-xs">{item.quantity}</TableCell>
                          )}
                          <TableCell className="text-center print:text-xs">{item.unitOfMeasure}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes Section */}
              {purchaseOrder.notes && (
                <div className="mb-8 print:mb-6 pb-6 print:pb-4 border-t print:border-t">
                  <h4 className="font-semibold text-sm print:text-xs mb-2">Notes:</h4>
                  <p className="text-sm text-muted-foreground print:text-xs">{purchaseOrder.notes}</p>
                </div>
              )}
            </CardContent>

            {/* Footer Section - Signatures */}
            {isPrintableView && (
              <CardFooter className="bg-muted/50 print:bg-white print:border-t-2 print:border-foreground p-6 print:p-4 flex-col items-stretch gap-8 print:gap-6">
                <div className="text-center text-xs text-muted-foreground print:text-xs print:text-foreground">
                  <p>This document confirms the receipt of the goods listed above in good condition.</p>
                </div>

                {/* Signature Lines */}
                <div className="grid grid-cols-2 gap-8 print:gap-6 mt-8 print:mt-6">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-full border-t-2 border-foreground print:border-t print:border-black mb-2 print:mb-1"
                      style={{ height: "60px", print: { height: "40px" } }}
                    ></div>
                    <p className="font-semibold text-sm print:text-xs">Received By (Signature)</p>
                    <p className="text-xs text-muted-foreground print:text-xs">Store Manager</p>
                    <p className="text-xs text-muted-foreground print:text-xs mt-1">Date: _______________</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className="w-full border-t-2 border-foreground print:border-t print:border-black mb-2 print:mb-1"
                      style={{ height: "60px", print: { height: "40px" } }}
                    ></div>
                    <p className="font-semibold text-sm print:text-xs">Supplier's Rep (Signature)</p>
                    <p className="text-xs text-muted-foreground print:text-xs">Delivery Personnel</p>
                    <p className="text-xs text-muted-foreground print:text-xs mt-1">Date: _______________</p>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }

          /* Show only the printable area */
          #printable-area {
            display: block !important;
            width: 100%;
            max-width: 210mm;
            height: auto;
            margin: 0;
            padding: 0;
            background: white;
            box-shadow: none;
            border: none;
            page-break-after: avoid;
          }

          /* Hide all non-printable elements */
          .print\\:hidden {
            display: none !important;
          }

          /* Ensure card displays properly */
          .card,
          [class*="Card"] {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
          }

          /* Header styling */
          [class*="CardHeader"] {
            background: white !important;
            border-bottom: 2px solid #000 !important;
            padding: 12mm !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }

          /* Content styling */
          [class*="CardContent"] {
            background: white !important;
            padding: 12mm !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }

          /* Footer styling */
          [class*="CardFooter"] {
            background: white !important;
            border-top: 2px solid #000 !important;
            padding: 12mm !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }

          /* Table styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8mm 0;
            page-break-inside: avoid;
          }

          thead {
            background: #f5f5f5 !important;
            page-break-inside: avoid;
          }

          th,
          td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            text-align: left;
            font-size: 10pt;
          }

          th {
            font-weight: bold;
            background: #f5f5f5 !important;
          }

          tr {
            page-break-inside: avoid;
          }

          /* Text sizing for print */
          h1 {
            font-size: 18pt !important;
            margin: 0 0 4mm 0 !important;
          }

          h2 {
            font-size: 14pt !important;
            margin: 0 0 3mm 0 !important;
          }

          h3 {
            font-size: 11pt !important;
            margin: 6mm 0 3mm 0 !important;
            font-weight: bold;
          }

          p {
            margin: 0 0 2mm 0 !important;
            font-size: 10pt;
          }

          /* Badge styling */
          [class*="badge"] {
            border: 1px solid #000 !important;
            padding: 2px 6px !important;
            font-size: 9pt;
          }

          /* Signature lines */
          div[style*="border-t"] {
            border-top: 1px solid #000 !important;
            margin: 4mm 0 !important;
          }

          /* Remove shadows and unnecessary styling */
          * {
            box-shadow: none !important;
          }

          /* Ensure content is visible */
          body > * {
            display: none !important;
          }

          body > #__next {
            display: block !important;
          }

          #__next > * {
            display: none !important;
          }

          #printable-area {
            display: block !important;
          }

          #printable-area * {
            display: revert !important;
          }
        }
      `}</style>
    </>
  )
}
