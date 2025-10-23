
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import MilkSupplierForm from '../MilkSupplierForm';

export default function RegisterMilkSupplierPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSaveSuccess = (supplierId: string, supplierName: string) => {
    toast({
      title: "Supplier Registered",
      description: `Supplier "${supplierName}" has been successfully created.`,
    });
    router.push('/laboratory/suppliers');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/laboratory" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Laboratory</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          Register New Water Supplier
        </h1>
      </header>
      
      <MilkSupplierForm onSaveSuccess={handleSaveSuccess} />
    </div>
  );
}
