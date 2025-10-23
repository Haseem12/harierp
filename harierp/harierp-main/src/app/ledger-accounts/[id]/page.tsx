
"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CalendarDays,
  Banknote,
  Tag,
  Eye,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  NotebookPen,
  Landmark,
  RefreshCw,
  Printer,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
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
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { LedgerAccount as LedgerAccountTypeFromTypes } from "@/types"

interface AccountActivity {
  id: string
  date: Date
  type: "Invoice" | "Receipt" | "Credit Note"
  documentNumber: string
  description: string
  amount: number
  status?: string
  detailsLink: string
}

interface LedgerAccount extends LedgerAccountTypeFromTypes {}

// Fallback data for when API is unavailable
const generateFallbackData = (accountId: string): any => { // Return type 'any' for flexibility with structure
  const fallbackAccount: LedgerAccount = {
    id: accountId,
    accountCode: `ACC-${accountId.padStart(4, "0")}`,
    name: `Customer Account ${accountId}`,
    accountType: "Customer",
    phone: "+234 123 456 7890",
    address: "123 Business Street, Lagos, Nigeria",
    priceLevel: "Standard",
    zone: "Lagos Zone",
    creditPeriod: 30,
    creditLimit: 500000,
    bankDetails: "First Bank Nigeria\nAccount: 1234567890\nSort Code: 011",
    createdAt: new Date("2024-01-15T10:30:00Z").toISOString(), // Ensure string for consistency
    updatedAt: new Date("2024-01-20T14:45:00Z").toISOString(),
  }

  const fallbackInvoices = [
    {
      id: "inv-001",
      invoiceNumber: "INV-2024-001",
      issueDate: "2024-01-15T00:00:00Z",
      customerName: fallbackAccount.name, // Used by processActivities
      totalAmount: 150000,
      status: "Paid",
    },
    {
      id: "inv-002",
      invoiceNumber: "INV-2024-002",
      issueDate: "2024-01-20T00:00:00Z",
      customerName: fallbackAccount.name,
      totalAmount: 200000,
      status: "Sent",
    },
  ]

  const fallbackReceipts = [
    {
      id: "rec-001",
      receiptNumber: "REC-2024-001",
      receiptDate: "2024-01-18T00:00:00Z",
      paymentMethod: "Bank Transfer", // Used by processActivities
      amountReceived: 150000,
      status: "Completed", 
    },
  ]

  const fallbackCreditNotes = [
    {
      id: "cn-001",
      creditNoteNumber: "CN-2024-001",
      creditNoteDate: "2024-01-22T00:00:00Z",
      reason: "Product Return", // Used by processActivities
      description: "Defective items returned", // Used by processActivities
      amount: 25000,
      status: "Approved", 
    },
  ]

  const totalInvoiced = fallbackInvoices.reduce((sum, inv) => sum + (inv.status !== 'Cancelled' ? inv.totalAmount : 0), 0)
  const totalReceived = fallbackReceipts.reduce((sum, rec) => sum + rec.amountReceived, 0)
  const totalCredited = fallbackCreditNotes.reduce((sum, cn) => sum + cn.amount, 0)
  const outstandingBalance = totalInvoiced - totalReceived - totalCredited

  return {
    success: true, // Mimic API success structure
    account: fallbackAccount,
    invoices: fallbackInvoices,
    receipts: fallbackReceipts,
    creditNotes: fallbackCreditNotes,
    totalInvoiced,
    totalReceived,
    totalCredited,
    outstandingBalance,
  }
}

export default function LedgerAccountDetailPage() {
  const params = useParams()
  const accountId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [account, setAccount] = useState<LedgerAccount | null>(null)
  const [activities, setActivities] = useState<AccountActivity[]>([])
  const [outstandingBalance, setOutstandingBalance] = useState(0)
  const [totalInvoiced, setTotalInvoiced] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [totalCredited, setTotalCredited] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)

  useEffect(() => {
    if (!accountId) {
      setError("Account ID is missing.")
      setLoading(false)
      return
    }

    async function loadAccountDetails() {
      setLoading(true)
      setError(null)
      setIsUsingFallback(false)

      // Primary endpoint
      const primaryEndpoint = `https://sajfoods.net/busa-api/database/get_ledger_account_d.php?id=${accountId}`
      let dataFetchedSuccessfully = false
      
      try {
        console.log(`Attempting to fetch from: ${primaryEndpoint}`)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout for API

        const res = await fetch(primaryEndpoint, {
          signal: controller.signal,
          headers: { Accept: "application/json", "Content-Type": "application/json" },
        })
        clearTimeout(timeoutId)
        console.log(`Response status from ${primaryEndpoint}: ${res.status}`)

        if (!res.ok) {
          let errorText = `HTTP ${res.status}: ${res.statusText}`
          let responseBody = ""
          try { 
            responseBody = await res.text()
            const errJson = JSON.parse(responseBody)
            errorText = errJson.message || errorText
          } catch (e) { 
            errorText = `${errorText} - Response: ${responseBody.substring(0,200)}...`
            console.error("Raw error response (if not JSON):", responseBody)
          }
          throw new Error(errorText)
        }

        const contentType = res.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await res.text()
          console.warn(`Non-JSON response from ${primaryEndpoint}: ${responseText.substring(0, 200)}...`)
          throw new Error(`Expected JSON response from ${primaryEndpoint}, got ${contentType}. Response body: ${responseText.substring(0,200)}...`)
        }

        const json = await res.json()
        console.log("API Response from " + primaryEndpoint + ":", json)

        if (!json.success || !json.account) {
          throw new Error(json.message || "API returned unsuccessful response or missing account data.")
        }
        
        setAccount(json.account as LedgerAccount)
        setTotalInvoiced(Number.parseFloat(String(json.totalInvoiced ?? "0")) || 0)
        setTotalReceived(Number.parseFloat(String(json.totalReceived ?? "0")) || 0)
        setTotalCredited(Number.parseFloat(String(json.totalCredited ?? "0")) || 0)
        setOutstandingBalance(Number.parseFloat(String(json.outstandingBalance ?? "0")) || 0)
        
        const allActivities = processActivities(json.invoices || [], json.receipts || [], json.creditNotes || [], json.account.name)
        setActivities(allActivities)
        dataFetchedSuccessfully = true
      } catch (apiError: any) {
        console.error(`Failed to fetch from ${primaryEndpoint}:`, apiError.message)
        setError(`API Error: ${apiError.message}. `) // Set error to be used with fallback message
      }


      if (!dataFetchedSuccessfully) {
        console.log("API endpoint failed or returned invalid data, using fallback data.")
        const fallbackData = generateFallbackData(accountId)
        setAccount(fallbackData.account)
        setTotalInvoiced(fallbackData.totalInvoiced)
        setTotalReceived(fallbackData.totalReceived)
        setTotalCredited(fallbackData.totalCredited)
        setOutstandingBalance(fallbackData.outstandingBalance)
        const allFallbackActivities = processActivities(fallbackData.invoices, fallbackData.receipts, fallbackData.creditNotes, fallbackData.account.name)
        setActivities(allFallbackActivities)
        setIsUsingFallback(true)
        
        const fallbackMessage = "Could not connect to the server or server returned an error. Displaying sample data for demonstration."
        setError(prevError => prevError ? prevError + fallbackMessage : fallbackMessage)
        toast({
          title: "Using Demo Data",
          description: error || fallbackMessage, // Show API error if available, else generic fallback
          variant: "default",
          duration: 7000,
        })
      }
      setLoading(false)
    }
    loadAccountDetails()
  }, [accountId, toast])


  const processActivities = (invoices: any[], receipts: any[], creditNotes: any[], accountName: string = "Customer"): AccountActivity[] => {
    const mapActivity = (
      item: any,
      type: "Invoice" | "Receipt" | "Credit Note",
      dateField: string,
      amountField: string,
      descriptionFn: (item: any, accName: string) => string,
      linkPrefix: string,
      docNumField: string
    ): AccountActivity | null => {
      try {
        const dateValue = item[dateField] || item.date
        if (!dateValue) {
          console.warn(`Missing date for ${type} ID ${item.id || 'unknown'}`)
          return null
        }
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for ${type} ID ${item.id || 'unknown'}: ${dateValue}`)
          return null
        }
        const amount = Number.parseFloat(String(item[amountField] || "0"))
        if (isNaN(amount)) {
            console.warn(`Invalid amount for ${type} ID ${item.id || 'unknown'}: ${item[amountField]}`)
            return null
        }

        return {
          id: item.id || `temp-${type}-${Math.random().toString(36).substr(2, 9)}`,
          date,
          type,
          documentNumber: item[docNumField] || "N/A",
          description: descriptionFn(item, accountName),
          amount: amount,
          status: item.status || undefined,
          detailsLink: `${linkPrefix}/${item.id || 'no-id'}`, // Handle missing ID for link
        }
      } catch (err: any) {
        console.error(`Error mapping ${type} item (ID: ${item?.id || 'unknown'}):`, err.message, item)
        return null
      }
    }

    const mappedInvoices = invoices.map(inv => mapActivity(inv, "Invoice", "issueDate", "totalAmount", (item, accName) => `Invoice to ${item.customerName || accName}`, "/invoices", "invoiceNumber")).filter(Boolean) as AccountActivity[]
    const mappedReceipts = receipts.map(r => mapActivity(r, "Receipt", "receiptDate", "amountReceived", (item, accName) => `Payment from ${item.ledgerAccountName || accName} via ${item.paymentMethod || "Unknown"}`, "/receipts", "receiptNumber")).filter(Boolean) as AccountActivity[]
    const mappedCreditNotes = creditNotes.map(cn => mapActivity(cn, "Credit Note", "creditNoteDate", "amount", (item, accName) => `${item.reason || "Credit"}: ${item.description || ""}`, "/credit-notes", "creditNoteNumber")).filter(Boolean) as AccountActivity[]

    return [...mappedInvoices, ...mappedReceipts, ...mappedCreditNotes].sort((a, b) => b.date.getTime() - a.date.getTime())
  }

  const formatCurrency = (amt: number | undefined | null) => {
    if (amt === undefined || amt === null || isNaN(amt)) return "₦0.00" 
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amt)
  }

  const creditStatus = useMemo(() => {
    if (!account || account.creditLimit === undefined || account.creditLimit === null || account.creditLimit <= 0) {
      return { color: "text-muted-foreground", msg: "No credit limit set or N/A." }
    }
    const limit = account.creditLimit
    const usagePercentage = (outstandingBalance / limit) * 100

    if (outstandingBalance >= limit)
      return { color: "text-destructive font-semibold", msg: "Credit limit reached or exceeded!" }
    if (usagePercentage >= 80) return { color: "text-orange-500 font-medium", msg: "Nearing credit limit." }
    if (outstandingBalance < 0) return { color: "text-green-600 font-medium", msg: "Account in credit."}
    return { color: outstandingBalance > 0 ? "text-amber-600" : "text-green-600", msg: "Within credit limit." }
  }, [account, outstandingBalance])

  const handleDelete = async () => {
    if (!account) return

    if (isUsingFallback) {
      toast({
        title: "Demo Mode",
        description: "Delete functionality is disabled in demo mode.",
        variant: "default",
      })
      router.push("/ledger-accounts")
      return
    }

    try {
      const response = await fetch("https://sajfoods.net/busa-api/database/delete_ledger_account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Account Deleted",
          description: `Ledger account "${account.name}" has been removed.`,
        })
        router.push("/ledger-accounts")
      } else {
        throw new Error(result.message || "Failed to delete account from server.")
      }
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" })
      console.error("Error deleting ledger account:", error)
    }
  }

  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return "N/A"
    try {
      const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn("Invalid date value for formatting:", dateValue)
        return "Invalid Date"
      }
      return format(date, "PPP")
    } catch (error) {
      console.error("Date formatting error:", error, dateValue)
      return "Date Error"
    }
  }

  const generateAccountStatement = () => {
    if (!account) return;
    const printWindow = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
    if (!printWindow) {
      toast({ title: "Print Error", description: "Please allow pop-ups to print the statement.", variant: "destructive" });
      return;
    }

    const sortedActivities = [...activities].sort((a, b) => a.date.getTime() - b.date.getTime());
    let runningBalance = 0; 

    const statementHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Statement - ${account.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 10pt; }
          .header, .footer { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 1.5em; }
          .header p { margin: 2px 0; font-size: 0.9em; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; padding:10px; border: 1px solid #ccc; border-radius: 5px;}
          .details-grid h3 { font-size: 1.1em; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px;}
          .details-grid p { margin: 3px 0; font-size: 0.9em; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9em; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          .debit { color: #c00; } 
          .credit { color: green; }
          .balance-row td { font-weight: bold; border-top: 2px solid #000; }
          @media print {
            body { font-size: 9pt; margin: 10mm; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HARI INDUSTRIES LIMITED</h1>
          <p>123 Business Road, Industrial Area, Kano, Nigeria</p>
          <p>Phone: +234 123 456 789 | Email: accounts@hari-industries.com</p>
          <h2>Account Statement</h2>
          <p><strong>Statement Date:</strong> ${format(new Date(), "PPP")}</p>
          ${isUsingFallback ? "<p style='color:red;'><strong>DEMO DATA PREVIEW</strong></p>" : ""}
        </div>

        <div class="details-grid">
          <div>
            <h3>Account Holder</h3>
            <p><strong>Name:</strong> ${account.name}</p>
            <p><strong>Account Code:</strong> ${account.accountCode}</p>
            <p><strong>Type:</strong> ${account.accountType}</p>
            ${account.phone ? `<p><strong>Phone:</strong> ${account.phone}</p>` : ""}
            ${account.address ? `<p><strong>Address:</strong> ${account.address}</p>` : ""}
          </div>
          <div>
            <h3>Account Summary</h3>
            <p><strong>Total Invoiced:</strong> ${formatCurrency(totalInvoiced)}</p>
            <p><strong>Total Received:</strong> ${formatCurrency(totalReceived)}</p>
            <p><strong>Total Credited:</strong> ${formatCurrency(totalCredited)}</p>
            <p style="font-weight:bold; font-size: 1.1em;"><strong>Outstanding Balance:</strong> <span class="${outstandingBalance >= 0 ? 'debit' : 'credit'}">${formatCurrency(outstandingBalance)}</span></p>
            <p><strong>Credit Limit:</strong> ${formatCurrency(account.creditLimit)} (${creditStatus.msg})</p>
          </div>
        </div>

        <h3>Transaction Details</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Document #</th>
              <th>Description</th>
              <th class="text-right">Debit</th>
              <th class="text-right">Credit</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${sortedActivities.map(activity => {
              let debit = 0;
              let credit = 0;
              if (activity.type === "Invoice") {
                debit = activity.amount;
              } else if (activity.type === "Receipt" || activity.type === "Credit Note") {
                credit = activity.amount;
              }
              runningBalance = (activity.type === "Invoice") ? runningBalance + activity.amount : runningBalance - activity.amount; 
              return `
                <tr>
                  <td>${format(activity.date, "yyyy-MM-dd")}</td>
                  <td>${activity.type} ${activity.status ? `(${activity.status})` : ''}</td>
                  <td>${activity.documentNumber}</td>
                  <td>${activity.description}</td>
                  <td class="text-right">${debit > 0 ? formatCurrency(debit) : '-'}</td>
                  <td class="text-right">${credit > 0 ? formatCurrency(credit) : '-'}</td>
                  <td class="text-right ${runningBalance >= 0 ? '' : 'credit'}">${formatCurrency(runningBalance)}</td>
                </tr>`;
            }).join("")}
            ${sortedActivities.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding: 20px;">No transactions found for this period.</td></tr>' : ''}
          </tbody>
          <tfoot>
             <tr class="balance-row">
                <td colspan="6" class="text-right"><strong>Closing Balance (as per transactions listed):</strong></td>
                <td class="text-right ${runningBalance >= 0 ? '' : 'credit'}"><strong>${formatCurrency(runningBalance)}</strong></td>
             </tr>
             <tr class="balance-row">
                <td colspan="6" class="text-right"><strong>Overall Outstanding Balance:</strong></td>
                <td class="text-right ${outstandingBalance >= 0 ? 'debit' : 'credit'}"><strong>${formatCurrency(outstandingBalance)}</strong></td>
             </tr>
          </tfoot>
        </table>
        <div class="footer">
          <p>This statement reflects the account status as of ${format(new Date(), "PPP")}.</p>
          <p>Please verify all transactions and report any discrepancies within 30 days.</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(statementHTML);
    printWindow.document.close();
    printWindow.focus(); 
    setTimeout(() => {
        printWindow.print();
    }, 500); 
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading account details, please wait...</p>
        </div>
      </div>
    )
  }
  
  if (error && !account && !isUsingFallback) { 
    return (
         <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-xl font-semibold text-destructive mb-2">Error Loading Account</p>
            <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
            <Link href="/ledger-accounts">
            <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Accounts
            </Button>
            </Link>
        </div>
    );
  }

  if (!account && !loading && !isUsingFallback) { 
    return (
      <div className="flex flex-col justify-center items-center h-full text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive mb-2">Ledger Account Not Found</p>
        <p className="text-muted-foreground mb-6">The requested account (ID: {accountId}) could not be loaded or does not exist.</p>
        <Link href="/ledger-accounts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Accounts
          </Button>
        </Link>
      </div>
    )
  }
  
  if (!account) {
      return (
          <div className="flex justify-center items-center h-full">
              <p>Preparing account details...</p>
          </div>
      );
  }


  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {isUsingFallback && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Demo Data Mode:</strong> The application could not connect to the live database or the data was incomplete.
                You are currently viewing sample data for demonstration purposes.
                {error && <span className="block mt-1">Details: {error}</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/ledger-accounts">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={generateAccountStatement}>
            <Printer className="mr-2 h-4 w-4" />
            Statement
          </Button>
          <Link href={`/ledger-accounts/${account.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isUsingFallback}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the ledger account for
                  &quot;<strong>{account.name}</strong>&quot;. Related transaction history might become unlinked or orphaned depending on database constraints.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="overflow-hidden shadow-md">
        <CardHeader className="bg-muted/30 border-b p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-primary">{account.name}</CardTitle>
              <Badge
                variant={
                  account.accountType === "Customer" || account.accountType === "Sales Rep" ? "default" : "secondary"
                }
                className="mt-1 text-xs"
              >
                {account.accountType}
              </Badge>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground sm:text-right mt-2 sm:mt-0">
              <p>
                Code: <span className="font-medium text-foreground">{account.accountCode}</span>
              </p>
              {account.createdAt && <p>Date Created: {formatDate(account.createdAt)}</p>}
              {account.updatedAt && <p>Last Updated: {formatDate(account.updatedAt)}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid md:grid-cols-2 gap-x-6 gap-y-3">
          <InfoItem icon={Phone} label="Phone Number" value={account.phone} />
          <InfoItem icon={MapPin} label="Address" value={account.address} fullWidth={!!account.address && account.address.length > 50} />
          <InfoItem icon={Tag} label="Assigned Price Level" value={account.priceLevel} />
          <InfoItem icon={Tag} label="Operational Zone" value={account.zone} />
          <InfoItem icon={CalendarDays} label="Credit Period Allowed" value={`${account.creditPeriod || 0} days`} />
          <InfoItem icon={Banknote} label="Credit Limit (NGN)" value={formatCurrency(account.creditLimit)} />
          <InfoItem icon={Landmark} label="Bank Account Details" value={account.bankDetails} fullWidth isTextarea />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader  className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryItem icon={TrendingUp} label="Total Invoiced" value={formatCurrency(totalInvoiced)} colorClass="text-blue-600" />
          <SummaryItem icon={TrendingDown} label="Total Payments Received" value={formatCurrency(totalReceived)} colorClass="text-green-600" />
          <SummaryItem icon={NotebookPen} label="Total Credit Notes Issued" value={formatCurrency(totalCredited)} colorClass="text-purple-600"/>
          <Card className="shadow-sm border-l-4" style={{borderColor: creditStatus.color || 'hsl(var(--border))'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
              <AlertCircle className={cn("h-5 w-5", creditStatus.color || "text-muted-foreground")} />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className={cn("text-xl sm:text-2xl font-bold", creditStatus.color || "text-foreground")}>{formatCurrency(outstandingBalance)}</div>
              <p className={cn("text-xs mt-1", creditStatus.color || "text-muted-foreground")}>{creditStatus.msg}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl">Transaction Activity Log</CardTitle>
            <CardDescription>Invoices, receipts, and credit notes for this account.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-2 md:p-4">
          {activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount (NGN)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>{format(new Date(activity.date), "dd MMM, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={ activity.type === "Invoice" ? "secondary" : activity.type === "Receipt" ? "default" : "destructive"} >
                        {activity.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{activity.documentNumber}</TableCell>
                    <TableCell className="max-w-[200px] sm:max-w-[250px] truncate" title={activity.description}> {activity.description} </TableCell>
                    <TableCell
                      className={cn( "text-right font-semibold",
                        activity.type === "Receipt" && "text-green-600",
                        activity.type === "Credit Note" && "text-orange-500", 
                        activity.type === "Invoice" && "text-blue-600",
                      )} >
                      {activity.type === "Invoice" ? formatCurrency(activity.amount) : `-${formatCurrency(activity.amount)}`}
                    </TableCell>
                    <TableCell>
                      {activity.status ? (
                        <Badge variant={
                            activity.status === "Paid" || activity.status === "Completed" || activity.status === "Received" || activity.status === "Approved"
                              ? "default" : activity.status === "Cancelled" || activity.status === "Overdue"
                                ? "destructive" : "secondary" } >
                          {activity.status}
                        </Badge>
                      ) : ( "-" )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={activity.detailsLink} passHref>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                           <span className="sr-only">View Details</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8 px-4">No transaction activities found for this account.</p>
          )}
        </CardContent>
        <CardFooter className="p-4 sm:p-6">
          <div className="text-xs text-muted-foreground">End of activity list.</div>
        </CardFooter>
      </Card>
    </div>
  )
}

interface InfoItemProps {
  icon: React.ElementType
  label: string
  value: string | number | undefined | null
  className?: string
  fullWidth?: boolean
  isTextarea?: boolean
}

const InfoItem: React.FC<InfoItemProps> = ({ icon: Icon, label, value, className, fullWidth, isTextarea }) => (
  <div className={cn("flex items-start gap-3 py-2 border-b border-dashed border-border/50 last:border-b-0", fullWidth ? "sm:col-span-2" : "")}>
    <Icon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
    <div className="flex-1 min-w-0"> {}
      <p className="font-semibold text-sm text-muted-foreground">{label}</p>
      {isTextarea ? (
        <p className={cn("text-foreground whitespace-pre-wrap text-sm break-words", className)}>
          {value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : <span className="text-muted-foreground italic">N/A</span>}
        </p>
      ) : (
        <p className={cn("text-foreground text-sm break-words", className)}>
          {value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : <span className="text-muted-foreground italic">N/A</span>}
        </p>
      )}
    </div>
  </div>
)

interface SummaryItemProps {
  icon: React.ElementType
  label: string
  value: string | undefined | null
  colorClass?: string
}
const SummaryItem: React.FC<SummaryItemProps> = ({ icon: Icon, label, value, colorClass = "text-primary" }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className={cn("h-5 w-5", colorClass)} />
    </CardHeader>
    <CardContent className="pb-4 px-4">
      <div className={cn("text-xl sm:text-2xl font-bold", colorClass)}>
        {value !== undefined && value !== null ? String(value) : <span className="text-muted-foreground italic text-lg">N/A</span>}
      </div>
    </CardContent>
  </Card>
)
