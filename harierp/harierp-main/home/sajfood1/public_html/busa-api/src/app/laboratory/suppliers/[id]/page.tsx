
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, User, Users, Hash, Phone, MapPin, Landmark, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MilkSupplier } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from "@/lib/utils";

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number | undefined | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="font-medium text-sm text-muted-foreground">{label}</p>
        <div className="text-base">{value}</div>
      </div>
    </div>
  );
}

export default function MilkSupplierDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<MilkSupplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supplierId = params.id as string;

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`https://harisindustries.com.ng/busa-api/database/get_milk_supplier_detail.php?id=${supplierId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch supplier details: ${errorText}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setSupplier({
          ...data.data,
          createdAt: data.data.created_at ? parseISO(data.data.created_at) : new Date(0), // Corrected field name
        });
      } else {
        throw new Error(data.message || 'Supplier not found.');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [supplierId, toast]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);
  
  const formatDateSafe = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return "N/A";
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!date || !isValid(date)) return "Invalid Date";
    return format(date, 'PPP');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading supplier details...</div>;
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Supplier details could not be loaded.</p>
        <Link href="/laboratory/suppliers" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/laboratory/suppliers" passHref>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
      </header>

      <Card>
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-center gap-4">
             {supplier.supplier_type === 'Cooperative' ? 
                <Users className="h-10 w-10 text-primary" /> : 
                <User className="h-10 w-10 text-primary" />
             }
             <div>
                <CardTitle className="text-2xl">{supplier.name}</CardTitle>
                <CardDescription>{supplier.supplier_type}</CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoItem icon={Hash} label="Supplier Code" value={supplier.code} />
          <InfoItem icon={Phone} label="Phone Number" value={supplier.phone} />
          <InfoItem icon={Calendar} label="Date Registered" value={formatDateSafe(supplier.createdAt)} />
          <InfoItem icon={MapPin} label="Address" value={supplier.address} />
          <InfoItem icon={Landmark} label="Bank Details" value={supplier.bankDetails} />

          {supplier.supplier_type === 'Cooperative' && (
            <>
              <div className="md:col-span-2 my-2 border-t" />
              <InfoItem icon={Hash} label="Registration Number" value={supplier.registrationNumber} />
              <InfoItem icon={Users} label="Member Count" value={supplier.memberCount} />
              <InfoItem icon={User} label="Chairman's Name" value={supplier.chairmanName} />
              <InfoItem icon={User} label="Secretary's Name" value={supplier.secretaryName} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    