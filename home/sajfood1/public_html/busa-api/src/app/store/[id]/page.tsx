
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, RefreshCw, Warehouse, User, Calendar, Tag, Layers, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RawMaterial } from '@/types';
import { defaultCompanyDetails } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

function InfoItem({ icon: Icon, label, value, className = '' }: { icon: React.ElementType; label: string; value: string | number | null | undefined | React.ReactNode; className?: string; }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 mt-1 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm text-muted-foreground">{label}</p>
        <div className={cn("text-base", className)}>{value ?? 'N/A'}</div>
      </div>
    </div>
  );
}

export default function GoodsReceivedNotePage() {
  const params = useParams();
  const { toast } = useToast();
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const materialId = params.id as string;

  const fetchMaterial = useCallback(async () => {
    if (!materialId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`https://sajfoods.net/busa-api/database/get_raw_material.php?id=${materialId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch item details: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setMaterial({
          ...data.data,
          createdAt: parseISO(data.data.createdAt),
          updatedAt: parseISO(data.data.updatedAt),
        });
      } else {
        throw new Error(data.message || 'Store item not found.');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [materialId, toast]);

  useEffect(() => {
    fetchMaterial();
  }, [fetchMaterial]);
  
  const handlePrint = () => {
    window.print();
  };
  
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, 'PPP p') : 'Invalid Date';
  };
  
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading Goods Received Note...</div>;
  }

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Store item details could not be loaded.</p>
        <Link href="/store" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Store</Button></Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/store" passHref>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Store</span>
            </Button>
          </Link>
          <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print GRN</Button>
        </div>

        <div id="printable-area">
          <Card className="w-full shadow-lg print:shadow-none print:border-none">
            <CardHeader className="text-center bg-muted/30 p-6 print:bg-transparent">
              <div className="flex justify-center items-center gap-2 mb-2">
                <Warehouse className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">{defaultCompanyDetails.name}</h1>
              </div>
              <CardTitle className="text-xl">Goods Received Note (GRN)</CardTitle>
              <CardDescription>Confirmation of item received into store.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <InfoItem icon={Calendar} label="Date Received" value={formatDate(material.createdAt)} />
              <InfoItem icon={User} label="Supplier" value={material.supplierName || 'N/A'} className="font-semibold" />

              <div className="md:col-span-2 my-2 border-t" />
              
              <div className="md:col-span-2 flex gap-4 items-center">
                 {material.imageUrl && <Image src={material.imageUrl} alt={material.name} width={64} height={64} className="rounded-md border object-cover" />}
                 <div>
                    <h3 className="font-bold text-lg">{material.name}</h3>
                    <p className="text-sm text-muted-foreground">{material.description}</p>
                 </div>
              </div>
              
              <InfoItem icon={Package} label="SKU" value={material.sku} className="font-mono" />
              <InfoItem icon={Tag} label="Category" value={material.category} />
              <InfoItem icon={Layers} label="Quantity Received" value={`${material.stock} ${material.unitOfMeasure}`} className="font-bold text-xl text-primary" />
              <InfoItem icon={Layers} label="Unit Cost" value={formatCurrency(material.costPrice)} />
            </CardContent>
            <CardFooter className="bg-muted/50 p-6 flex-col items-start gap-6 print:mt-16 print:bg-transparent print:p-2">
                <div className="w-full flex justify-around">
                    <div className="text-center">
                        <p className="border-t pt-2 mt-8 w-48">Received By (Signature)</p>
                        <p className="text-xs text-muted-foreground">Store Manager</p>
                    </div>
                    <div className="text-center">
                        <p className="border-t pt-2 mt-8 w-48">Supplier's Rep (Signature)</p>
                         <p className="text-xs text-muted-foreground">Delivery Personnel</p>
                    </div>
                </div>
              <p className="text-center text-xs text-muted-foreground w-full mt-4">This document confirms the receipt of the goods listed above in good condition.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
       <style jsx global>{`
          @media print {
              body * {
                  visibility: hidden;
              }
              #printable-area, #printable-area * {
                  visibility: visible;
              }
              #printable-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 1rem;
              }
          }
      `}</style>
    </>
  );
}
