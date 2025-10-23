
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import RawMaterialForm from '../RawMaterialForm';
// Mock data import removed as form handles submission to backend

export default function NewRawMaterialPage() {
  // The RawMaterialForm now handles its own submission to the backend.
  // The onSave prop is no longer needed here for mock data manipulation.
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
          Add New Item to Store
        </h1>
      </header>
      
      <RawMaterialForm /> {/* onSave prop removed */}
    </div>
  );
}
