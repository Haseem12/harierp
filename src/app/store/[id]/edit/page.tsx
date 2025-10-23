
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import RawMaterialForm from '../../RawMaterialForm';
import type { RawMaterial } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function EditRawMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;
  const [rawMaterial, setRawMaterial] = useState<RawMaterial | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (materialId) {
      setIsLoading(true);
      setError(null);
      fetch(`https://sajfoods.net/busa-api/database/get_raw_material.php?id=${materialId}`)
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Failed to read error from server.");
            throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.data) {
            // Ensure dates are Date objects if they are stored as strings
            const fetchedMaterial = {
              ...data.data,
              createdAt: data.data.createdAt ? new Date(data.data.createdAt) : new Date(),
              updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : new Date(),
            };
            setRawMaterial(fetchedMaterial);
          } else {
            setError(data.message || "Failed to fetch store item data for editing.");
          }
        })
        .catch(err => {
            setError(err.message || "Error fetching store item.");
            toast({title: "Error", description: `Failed to load item: ${err.message}`, variant: "destructive"});
        })
        .finally(() => setIsLoading(false));
    }
  }, [materialId, toast]);

  // The RawMaterialForm will handle the API call for saving.

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><RefreshCw className="h-8 w-8 animate-spin mr-2" /> Loading item details...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4 text-destructive">Error: {error}</p>
        <Link href="/store" passHref><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Store</Button></Link>
      </div>
    );
  }
  
  if (!rawMaterial) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Store Item not found.</p>
        <Link href="/store" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Store
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/store" passHref> 
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Store</span> 
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Edit Store Item: {rawMaterial.name} 
        </h1>
      </header>
      
      <RawMaterialForm rawMaterial={rawMaterial} /> {/* onSave prop removed */}
    </div>
  );
}
