
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '../../ProductForm';
import type { Product, PriceTier } from '@/types'; 
import { priceLevelOptions } from '@/types'; 

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetch(`https://harisindustries.com.ng/busa-api/database/get_product.php?id=${productId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && data.product) {
            const productData = data.product as Partial<Product>;
            let finalPriceTiers: PriceTier[] = [];

            if (productData.priceTiers && typeof productData.priceTiers === 'string') {
              try {
                const parsed = JSON.parse(productData.priceTiers);
                // Ensure parsed is an array and its elements are valid PriceTier objects
                if (Array.isArray(parsed) && parsed.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                  finalPriceTiers = parsed;
                } else {
                  console.warn("Parsed priceTiers from string is not a valid array of PriceTier objects for product:", productData.name);
                }
              } catch (e) {
                console.error("Failed to parse priceTiers JSON string in EditProductPage for product:", productData.name, e);
              }
            } else if (Array.isArray(productData.priceTiers)) {
              // Validate if it's already an array
              if (productData.priceTiers.every(tier => typeof tier === 'object' && tier !== null && 'priceLevel' in tier && 'price' in tier)) {
                finalPriceTiers = productData.priceTiers;
              } else {
                console.warn("Existing priceTiers array contains invalid PriceTier objects for product:", productData.name);
              }
            } else if (productData.priceTiers) {
              console.warn(`priceTiers for product ${productData.name} is neither an array nor a string, but: ${typeof productData.priceTiers}. Resetting.`);
            }
            
            setProduct({
                id: productData.id || productId,
                name: productData.name || 'Unknown Product',
                price: productData.price || 0,
                productCategory: productData.productCategory || 'Other Finished Good',
                sku: productData.sku || 'N/A',
                stock: productData.stock || 0,
                unitOfMeasure: productData.unitOfMeasure || 'PCS',
                createdAt: productData.createdAt ? new Date(productData.createdAt) : new Date(),
                updatedAt: productData.updatedAt ? new Date(productData.updatedAt) : new Date(),
                ...productData, // Spread the rest
                priceTiers: finalPriceTiers, // Use the processed and validated array
            });
          } else {
            console.error("Failed to fetch product or success false:", data.message || "Unknown error");
            setProduct(null); 
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching product:', error);
          setIsLoading(false);
          setProduct(null); 
        });
    }
  }, [productId]);

  const handleSaveChanges = (updatedProduct: Product) => {
    console.log('Product update process initiated by ProductForm for:', updatedProduct.id);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><p>Loading product details...</p></div>;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="mb-4">Product not found or failed to load.</p>
        <Link href="/products" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Products
          </Button>
        </Link>
      </div>
    );
  }

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
          Edit Product: {product.name}
        </h1>
      </header>

      <ProductForm product={product} onSave={handleSaveChanges} />
    </div>
  );
}

    