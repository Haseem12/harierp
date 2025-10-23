
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Search, Filter, RefreshCw, PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { ProductStockAdjustmentLog } from '@/types';
import { format, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProductStockLogPage() {
  const [stockLogs, setStockLogs] = useState<ProductStockAdjustmentLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_product_stock_logs.php');
      if (!response.ok) throw new Error(`Failed to fetch stock logs: ${response.status}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setStockLogs(data.data
            .filter((log: any) => log.adjustmentType !== 'PENDING_APPROVAL') // Exclude pending items from this log view
            .map((log: any) => ({
              ...log,
              adjustmentDate: log.adjustmentDate ? parseISO(log.adjustmentDate) : new Date(),
              quantityAdjusted: Number(log.quantityAdjusted || 0),
              previousStock: Number(log.previousStock || 0),
              newStock: Number(log.newStock || 0),
              createdAt: log.createdAt ? parseISO(log.createdAt) : new Date(),
        })));
      } else {
        setStockLogs([]);
        toast({ title: "Error", description: data.message || "Could not load stock adjustment logs.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
      setStockLogs([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    toast({ title: "Refreshed", description: "Stock adjustment log updated." });
  };

  const filteredStockLogs = useMemo(() => {
    let logs = [...stockLogs];
    if (searchTerm) {
      logs = logs.filter(log =>
        log.logNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (fromDate && isValid(fromDate)) {
      logs = logs.filter(log => log.adjustmentDate && new Date(log.adjustmentDate) >= startOfDay(fromDate));
    }
    if (toDate && isValid(toDate)) {
      logs = logs.filter(log => log.adjustmentDate && new Date(log.adjustmentDate) <= endOfDay(toDate));
    }
    logs.sort((a,b) => new Date(b.adjustmentDate).getTime() - new Date(a.adjustmentDate).getTime());
    return logs;
  }, [stockLogs, searchTerm, fromDate, toDate]);

  const formatDateSafe = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "N/A";
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!date || !isValid(date)) return "Invalid Date";
    return format(date, 'PP p');
  };
  
  const handleDeleteLogEntry = async (logId: string) => {
     const logToDelete = stockLogs.find(log => log.id === logId);
     if (!logToDelete) {
        toast({ title: "Error", description: "Log entry not found.", variant: "destructive" });
        return;
     }

     try {
        const response = await fetch('https://sajfoods.net/busa-api/database/delete_product_stock_log.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: logId }),
        });
        const result = await response.json();
        if (result.success) {
            setStockLogs(prevLogs => prevLogs.filter(log => log.id !== logId));
            toast({
                title: "Log Entry Deleted",
                description: `Log entry "${logToDelete.logNumber}" for product "${logToDelete.productName}" has been successfully deleted and stock reversed (if applicable).`,
            });
            // Optionally, trigger a full data refresh if backend stock changes are complex
            fetchData(); 
        } else {
            throw new Error(result.message || "Failed to delete log entry from server.");
        }
     } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
     }
  };


  if (isLoading && !isRefreshing) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading stock logs...</div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center justify-between pb-4 border-b">
        <h1 className="text-2xl font-semibold">Product Stock Adjustment Log</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/products/stock-management/add">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Record Stock Adjustment
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="fromDate" className="text-sm font-medium">From Date</label>
            <DatePickerComponent date={fromDate} setDate={setFromDate} placeholder="Start date" />
          </div>
          <div>
            <label htmlFor="toDate" className="text-sm font-medium">To Date</label>
            <DatePickerComponent date={toDate} setDate={setToDate} placeholder="End date" />
          </div>
           <div className="relative self-end">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Log ID, Product, Notes..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
          <CardDescription>
            Showing {filteredStockLogs.length} of {stockLogs.length} total stock adjustment records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty Adjusted</TableHead>
                <TableHead className="text-right">Prev. Stock</TableHead>
                <TableHead className="text-right">New Stock</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStockLogs.length > 0 ? (
                filteredStockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.logNumber}</TableCell>
                    <TableCell>{formatDateSafe(log.adjustmentDate)}</TableCell>
                    <TableCell>{log.productName}</TableCell>
                    <TableCell>
                        <Badge variant={log.adjustmentType === 'ADDITION' || log.adjustmentType === 'MANUAL_CORRECTION_ADD' || log.adjustmentType === 'RETURN_ADDITION' || log.adjustmentType === 'PRODUCTION_YIELD' ? 'default' : (log.adjustmentType === 'MANUAL_CORRECTION_SUBTRACT' || log.adjustmentType === 'SALE_DEDUCTION' || log.adjustmentType === 'REJECTED_BY_INVENTORY' ? 'destructive' : 'secondary')}>
                            {log.adjustmentType.replace(/_/g, ' ')}
                        </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${log.quantityAdjusted >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {log.quantityAdjusted >= 0 ? `+${log.quantityAdjusted}` : log.quantityAdjusted}
                    </TableCell>
                    <TableCell className="text-right">{log.previousStock}</TableCell>
                    <TableCell className="text-right">{log.newStock}</TableCell>
                    <TableCell className="max-w-xs truncate" title={log.notes || undefined}>{log.notes || '-'}</TableCell>
                    <TableCell className="text-center space-x-1">
                        <Link href={`/products/stock-management/log/${log.id}/edit`} passHref>
                            <Button variant="ghost" size="sm" disabled={log.adjustmentType === 'SALE_DEDUCTION' || log.adjustmentType === 'RETURN_ADDITION'}> <Edit className="h-4 w-4 mr-1"/> Edit</Button>
                        </Link>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={log.adjustmentType === 'SALE_DEDUCTION' || log.adjustmentType === 'RETURN_ADDITION'}>
                                    <Trash2 className="h-4 w-4 mr-1"/> Delete
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete log entry "{log.logNumber}" for product "{log.productName}"? 
                                    This will attempt to reverse the stock change of {log.quantityAdjusted} {log.productName}. This action cannot be undone.
                                    Sales-related deductions/returns cannot be deleted here.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteLogEntry(log.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete & Reverse
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No stock adjustment logs match the current filters.
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
