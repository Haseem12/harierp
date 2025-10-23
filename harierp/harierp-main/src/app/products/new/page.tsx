
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '../ProductForm'; // Import the new ProductForm
import type { Product } from '@/types';
import { useRouter } from 'next/navigation';

export default function NewProductPage() {
  const router = useRouter();

  const handleSaveNewProduct = (product: Product) => {
    // The actual saving is handled within ProductForm.
    // This function is called by ProductForm's onSave prop after a successful save.
    // We can use it for post-save actions, like navigation, if needed.
    console.log("New product creation process initiated for:", product.name);
    // The form itself now handles redirection.
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/products" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Products</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Add New Finished Product
        </h1>
      </header>
      
      <ProductForm onSave={handleSaveNewProduct} />
    </div>
  );
}
