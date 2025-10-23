
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer, RefreshCw, History, PackageCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import type { ProductStockAdjustmentLog } from '@/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SubmissionHistoryPage() {
    const [history, setHistory] = useState<ProductStockAdjustmentLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://harisindustries.com.ng/busa-api/database/get_submission_history.php');
            if (!response.ok) throw new Error("Failed to fetch submission history.");
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setHistory(data.data.map((log: any) => ({
                    ...log,
                    adjustmentDate: log.adjustmentDate ? parseISO(log.adjustmentDate) : new Date(0),
                    updatedAt: log.updatedAt ? parseISO(log.updatedAt) : undefined,
                    quantityAdjusted: Number(log.quantityAdjusted),
                })));
            } else {
                toast({ title: "Info", description: data.message || "No submission history found.", variant: "default" });
                setHistory([]);
            }
        } catch (error: any) {
            toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
    
    const sortedHistory = useMemo(() => 
        [...history].sort((a,b) => new Date(b.adjustmentDate).getTime() - new Date(a.adjustmentDate).getTime()),
    [history]);

    const handlePrint = () => {
        window.print();
    };

    const formatDateSafe = (dateInput: Date | string | null | undefined) => {
        if (!dateInput) return "N/A";
        const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
        if (!date || !isValid(date)) return "Invalid Date";
        return format(date, 'PP p');
    };

    const getStatusBadge = (log: ProductStockAdjustmentLog) => {
        if (log.adjustmentType === 'PENDING_APPROVAL') {
            return <Badge variant="secondary">Pending</Badge>;
        }
        if (log.adjustmentType === 'PRODUCTION_YIELD') {
            return <Badge variant="default">Approved</Badge>;
        }
        return <Badge variant="outline">{log.adjustmentType.replace(/_/g, ' ')}</Badge>;
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading submission history...</div>;
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <header className="flex items-center justify-between pb-4 border-b print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/inventory-dashboard" passHref>
                        <Button variant="outline" size="icon" className="h-7 w-7">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Finish Bay</span>
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-semibold flex items-center">
                        <History className="mr-3 h-6 w-6" /> Product Submission History
                    </h1>
                </div>
                 <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
            </header>

            <Card className="flex-grow print-content">
                <CardHeader>
                    <CardTitle>Packaging to Inventory Submissions</CardTitle>
                    <CardDescription>
                        A complete log of all finished goods submitted from Packaging, including their approval status and dates.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Log ID</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Approved At</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedHistory.length > 0 ? sortedHistory.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.logNumber}</TableCell>
                                    <TableCell>{log.productName}</TableCell>
                                    <TableCell className="text-right font-semibold">{log.quantityAdjusted.toLocaleString()}</TableCell>
                                    <TableCell>{formatDateSafe(log.adjustmentDate)}</TableCell>
                                    <TableCell>{getStatusBadge(log)}</TableCell>
                                    <TableCell>
                                      {log.adjustmentType === 'PRODUCTION_YIELD' && log.updatedAt ? formatDateSafe(log.updatedAt) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate" title={log.notes || ''}>{log.notes || '-'}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                       <AlertCircle className="mx-auto h-6 w-6 mb-2 text-muted-foreground" />
                                       No submission history found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Showing <strong>{history.length}</strong> total submissions.
                    </div>
                </CardFooter>
            </Card>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-content, .print-content * {
                        visibility: visible;
                    }
                    .print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}

    