
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ProductStockLogForm from '@/components/products/ProductStockLogForm'; // Corrected import path
import type { ProductStockAdjustmentLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseISO } from 'date-fns';

function EditStockLogPageContent() {
  const params = useParams();
  const router = useRouter();
  const logId = params.id as string;
  const { toast } = useToast();

  const [logEntry, setLogEntry] = useState<ProductStockAdjustmentLog | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (logId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://harisindustries.com.ng/busa-api/database/get_product_stock_log_detail.php?id=${logId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.");
            throw new Error(`HTTP error! status: ${res.status} - ${errorText.substring(0, 100)}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            const entry = data.data as ProductStockAdjustmentLog;
            setLogEntry({
              ...entry,
              adjustmentDate: typeof entry.adjustmentDate === 'string' ? parseISO(entry.adjustmentDate) : entry.adjustmentDate,
              createdAt: typeof entry.createdAt === 'string' ? parseISO(entry.createdAt) : entry.createdAt,
              updatedAt: entry.updatedAt ? (typeof entry.updatedAt === 'string' ? parseISO(entry.updatedAt) : entry.updatedAt) : undefined,
            });
          } else {
            setError(data.message || "Failed to fetch stock log entry details.");
          }
        })
        .catch(err => {
          setError(err.message || "Error fetching stock log entry.");
          toast({ title: "Error", description: `Failed to load log entry: ${err.message}`, variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [logId, toast]);

  const handleSaveSuccess = () => {
    toast({
      title: "Log Entry Updated",
      description: "The stock log entry has been successfully updated."
    });
    router.push('/products/stock-management/log');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading log entry...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-destructive mb-4 text-lg font-semibold">Error: {error}</p>
        <Link href="/products/stock-management/log" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Stock Log</Button>
        </Link>
      </div>
    );
  }

  if (!logEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="mb-4 text-lg">Stock log entry not found.</p>
        <Link href="/products/stock-management/log" passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Stock Log</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/products/stock-management/log" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Stock Log</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Edit Stock Log Entry: {logEntry.logNumber}
        </h1>
      </header>
      <Card>
        <CardHeader>
            <CardTitle>Modify Stock Adjustment Record</CardTitle>
            <CardDescription>
                Adjust the details for log entry for product: <strong>{logEntry.productName}</strong>. 
                Changing the quantity will attempt to correct the product's current stock level.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ProductStockLogForm 
                isEditMode={true} 
                existingLogEntry={logEntry} 
                onSaveSuccess={handleSaveSuccess}
            />
        </CardContent>
      </Card>
    </div>
  );
}


export default function EditStockLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2"/>Loading...</div>}>
      <EditStockLogPageContent />
    </Suspense>
  );
}

    