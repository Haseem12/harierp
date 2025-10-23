
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import RecordUsageForm from '../RecordUsageForm';
// Mock data import removed

export default function NewMaterialUsagePage() {
  // The RecordUsageForm now handles its own submission.
  // The onSave prop is no longer needed here.
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/store/usage" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Usage Log</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Record New Material Usage
        </h1>
      </header>
      
      <RecordUsageForm /> {/* onSave prop removed */}
    </div>
  );
}

    