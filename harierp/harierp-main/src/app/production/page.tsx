"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, PlusCircle, Factory, RefreshCw, Archive } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { RawMaterialUsageLog } from '@/types';

function ActionCard({ href, icon: Icon, title, description, buttonText }: { href: string; icon: React.ElementType; title: string; description: string; buttonText: string; }) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-primary h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-6 w-6 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      </CardContent>
      <CardContent>
        <Link href={href} passHref className="mt-auto block">
          <Button className="w-full">{buttonText}</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ProductionDashboardPage() {
  const [batches, setBatches] = useState<RawMaterialUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchBatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/get_production_batches.php');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch production batches: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setBatches(data.data.map((b: any) => ({
            ...b,
            usageDate: parseISO(b.usageDate),
        })));
      } else {
        setBatches([]);
        toast({
          title: "Info",
          description: data.message || "No production batches found.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const formatDateSafe = (dateInput: Date | string) => {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return isValid(date) ? format(date, 'PP') : 'Invalid Date';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight flex items-center">
        <Factory className="mr-3 h-7 w-7" />
        Production Dashboard
      </h1>
      
       <div className="grid gap-6 md:grid-cols-2">
        <ActionCard
          href="/production/new-batch"
          icon={PlusCircle}
          title="Step 1: Record Material Consumption"
          description="Begin a new production run by recording the store items (chemicals, bottles, caps, etc.) that will be consumed. This deducts from store inventory."
          buttonText="Start New Batch"
        />
        <ActionCard
          href="/products/stock-management/add"
          icon={Archive}
          title="Step 2: Submit Finished Product"
          description="After production, submit the final count of packaged water to the Finish Bay for approval. This adds the yield to pending inventory."
          buttonText="Submit Finished Goods"
        />
      </div>


       <Card>
        <CardHeader>
          <CardTitle>Recent Production Material Consumptions</CardTitle>
          <CardDescription>Overview of recent production runs showing consumed materials.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center h-24">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading batches...</span>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Material Consumed</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {batches.length > 0 ? batches.slice(0, 5).map((batch, index) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{(batch as any).batchId}</TableCell>
                    <TableCell>{formatDateSafe(batch.usageDate)}</TableCell>
                    <TableCell>{batch.rawMaterialName}</TableCell>
                    <TableCell className="text-right">{batch.quantityUsed} {batch.unitOfMeasure}</TableCell>
                    <TableCell className="max-w-md truncate" title={batch.notes}>{batch.notes || '-'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      No production batches found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Production Workflow (Water Bottling)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li><strong>Raw Materials Intake:</strong> Raw water is tested and logged via the <Link href="/laboratory" className="text-primary hover:underline">Laboratory</Link>. Packaging materials (bottles, caps, labels, etc.) are received into the <Link href="/store" className="text-primary hover:underline">Store</Link> via Purchase Orders.</li>
            <li><strong>Start Production Batch (Step 1):</strong> Use the 'Start New Batch' action to log consumption of treatment chemicals, bottles, caps, etc. This deducts them from store inventory.</li>
            <li><strong>Submit Finished Goods (Step 2):</strong> Once production is complete, use the 'Submit Finished Goods' action to log the final produced quantity (yield) of bottled water.</li>
            <li><strong>Finish Bay Approval:</strong> The submission is sent to the <Link href="/inventory-dashboard" className="text-primary hover:underline">Finish Bay</Link> for approval. Once approved, the stock is added to the main Finished Goods inventory and becomes available for sale.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}