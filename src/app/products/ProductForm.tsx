
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductCategory, UnitOfMeasure, PriceTier } from '@/types';
import { productCategories, unitsOfMeasure, priceLevelOptions } from '@/types';
import { uploadFileToServer } from '@/lib/storageUtils'; // Corrected import
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductFormProps {
  product?: Product;
  onSave: (product: Product) => void;
}

const defaultNewPriceTier = (): PriceTier => ({ priceLevel: priceLevelOptions[0], price: 0 });

export default function ProductForm({ product: existingProduct, onSave }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<Product>>(() => {
    const initial = {
        name: '',
        description: '',
        price: 0,
        costPrice: 0,
        productCategory: productCategories[0],
        sku: '',
        stock: 0,
        alternateUnits: '',
        pcsPerUnit: 0,
        unitOfMeasure: unitsOfMeasure[0],
        litres: 0,
        lowStockThreshold: 10,
        imageUrl: '',
        priceTiers: [defaultNewPriceTier()], // Always start with one tier for new product UI
    };

    if (existingProduct) {
        initial.name = existingProduct.name || '';
        initial.description = existingProduct.description || '';
        initial.price = existingProduct.price || 0;
        initial.costPrice = existingProduct.costPrice || 0;
        initial.productCategory = existingProduct.productCategory || productCategories[0];
        initial.sku = existingProduct.sku || '';
        initial.stock = existingProduct.stock || 0;
        initial.alternateUnits = existingProduct.alternateUnits || '';
        initial.pcsPerUnit = existingProduct.pcsPerUnit || 0;
        initial.unitOfMeasure = existingProduct.unitOfMeasure || unitsOfMeasure[0];
        initial.litres = existingProduct.litres || 0;
        initial.lowStockThreshold = existingProduct.lowStockThreshold || 10;
        initial.imageUrl = existingProduct.imageUrl || '';
        
        let tiersToSet: PriceTier[] = [];
        if (Array.isArray(existingProduct.priceTiers)) {
            tiersToSet = existingProduct.priceTiers;
        } else if (typeof existingProduct.priceTiers === 'string') { // Should be parsed by EditProductPage
            try {
                const parsed = JSON.parse(existingProduct.priceTiers);
                tiersToSet = Array.isArray(parsed) ? parsed : [];
            } catch { /* tiersToSet remains empty */ }
        }
        // If existing product has no tiers or parsing failed, ensure UI has one row
        initial.priceTiers = tiersToSet.length > 0 ? tiersToSet : [defaultNewPriceTier()];
    }
    return initial;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(existingProduct?.imageUrl || null);

  useEffect(() => {
    if (existingProduct) {
        let processedTiers: PriceTier[] = [];
        if (Array.isArray(existingProduct.priceTiers)) {
            processedTiers = existingProduct.priceTiers;
        } else if (typeof existingProduct.priceTiers === 'string') {
            try {
                const parsed = JSON.parse(existingProduct.priceTiers);
                processedTiers = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Error parsing existingProduct.priceTiers in useEffect:", e);
            }
        }
        
        setFormData({
            name: existingProduct.name || '',
            description: existingProduct.description || '',
            price: existingProduct.price || 0,
            costPrice: existingProduct.costPrice || 0,
            productCategory: existingProduct.productCategory || productCategories[0],
            sku: existingProduct.sku || '',
            stock: existingProduct.stock || 0,
            alternateUnits: existingProduct.alternateUnits || '',
            pcsPerUnit: existingProduct.pcsPerUnit || 0,
            unitOfMeasure: existingProduct.unitOfMeasure || unitsOfMeasure[0],
            litres: existingProduct.litres || 0,
            lowStockThreshold: existingProduct.lowStockThreshold || 10,
            imageUrl: existingProduct.imageUrl || '',
            priceTiers: processedTiers.length > 0 ? processedTiers : [defaultNewPriceTier()],
        });
        setImagePreviewUrl(existingProduct.imageUrl || null);
    } else {
        // Reset form for new product or if existingProduct becomes null
        setFormData({
            name: '', description: '', price: 0, costPrice: 0,
            productCategory: productCategories[0], sku: '', stock: 0,
            alternateUnits: '', pcsPerUnit: 0, unitOfMeasure: unitsOfMeasure[0],
            litres: 0, lowStockThreshold: 10, imageUrl: '',
            priceTiers: [defaultNewPriceTier()],
        });
        setImagePreviewUrl(null);
    }
  }, [existingProduct]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['price', 'costPrice', 'stock', 'pcsPerUnit', 'litres', 'lowStockThreshold'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: keyof Product, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handlePriceTierChange = (index: number, field: keyof PriceTier, value: string | number) => {
    const updatedPriceTiers = [...(formData.priceTiers || [])]; // Ensure it's an array
    if (field === 'price') {
      updatedPriceTiers[index] = { ...updatedPriceTiers[index], price: Number(value) };
    } else {
      updatedPriceTiers[index] = { ...updatedPriceTiers[index], [field]: value as string };
    }
    setFormData(prev => ({ ...prev, priceTiers: updatedPriceTiers }));
  };

  const addPriceTier = () => {
    setFormData(prev => ({
      ...prev,
      priceTiers: [...(Array.isArray(prev.priceTiers) ? prev.priceTiers : []), defaultNewPriceTier()]
    }));
  };

  const removePriceTier = (index: number) => {
    const newTiers = (formData.priceTiers || []).filter((_, i) => i !== index);
    // If all tiers are removed, add back one default empty tier for the UI
    setFormData(prev => ({
      ...prev,
      priceTiers: newTiers.length > 0 ? newTiers : [defaultNewPriceTier()]
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, imageUrl: '' }));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    if (!formData.name || !formData.productCategory || !formData.sku || formData.price === undefined || !formData.unitOfMeasure || formData.stock === undefined) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Category, SKU, Price, Unit of Measure, Stock).",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    let imageUrlToSave = formData.imageUrl || '';

    if (selectedFile) {
      try {
        imageUrlToSave = await uploadFileToServer(selectedFile, 'product-images'); // Corrected function call
      } catch (error) {
        toast({
          title: "Image Upload Failed",
          description: "Could not upload the image. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    } else if (!imagePreviewUrl && existingProduct?.imageUrl) {
        imageUrlToSave = '';
    }

    // Filter out any empty/default price tiers if they weren't meaningfully filled
    const finalPriceTiers = (formData.priceTiers || []).filter(
        tier => tier.priceLevel && tier.priceLevel !== priceLevelOptions[0] || tier.price > 0 || (formData.priceTiers || []).length === 1
    );


    const productDataToSave = {
      ...formData,
      name: formData.name!,
      productCategory: formData.productCategory!,
      sku: formData.sku!,
      price: formData.price!,
      costPrice: formData.costPrice || 0,
      unitOfMeasure: formData.unitOfMeasure!,
      litres: formData.litres || 0,
      pcsPerUnit: formData.pcsPerUnit || 0,
      alternateUnits: formData.alternateUnits || '',
      stock: formData.stock!,
      lowStockThreshold: formData.lowStockThreshold || 0,
      priceTiers: finalPriceTiers, // Send the filtered or original array
      imageUrl: imageUrlToSave,
      updatedAt: new Date().toISOString(), 
      id: existingProduct?.id, 
      createdAt: existingProduct?.createdAt ? (existingProduct.createdAt instanceof Date ? existingProduct.createdAt.toISOString() : existingProduct.createdAt) : new Date().toISOString(), 
    };
    
    const submissionPayload: any = { ...productDataToSave };
    if (!existingProduct?.id) { 
      delete submissionPayload.id; 
    }


    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_product.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        let serverErrorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorResult = await response.json();
          serverErrorMessage = errorResult.message || serverErrorMessage;
        } catch (e) { /* Failed to parse JSON, use status text */ }
        throw new Error(serverErrorMessage);
      }

      const result = await response.json();

      if (result.success) {
        const savedProduct: Product = {
            id: result.id || existingProduct?.id || `prod_${Date.now()}`,
            name: productDataToSave.name,
            description: productDataToSave.description,
            price: productDataToSave.price,
            costPrice: productDataToSave.costPrice,
            priceTiers: productDataToSave.priceTiers as PriceTier[],
            productCategory: productDataToSave.productCategory,
            alternateUnits: productDataToSave.alternateUnits,
            pcsPerUnit: productDataToSave.pcsPerUnit,
            unitOfMeasure: productDataToSave.unitOfMeasure,
            litres: productDataToSave.litres,
            sku: productDataToSave.sku,
            stock: productDataToSave.stock,
            lowStockThreshold: productDataToSave.lowStockThreshold,
            imageUrl: productDataToSave.imageUrl,
            createdAt: new Date(productDataToSave.createdAt), 
            updatedAt: new Date(productDataToSave.updatedAt),
        };
        toast({
          title: existingProduct ? "Product Updated" : "Product Created",
          description: `"${savedProduct.name}" has been successfully ${existingProduct ? 'updated' : 'created'}.`,
        });
        onSave(savedProduct); 
        router.push('/products'); 
      } else {
        console.error("Server failed to save product:", result.message || "No message from server.");
        toast({
          title: "Save Failed",
          description: result.message || "The server could not save the product. Please check server logs.",
          variant: "destructive",
        });
      }
    } catch (error: any) { 
      console.error("Error saving product:", error);
      let description = "Could not save product. Please try again.";
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        description = "Network error: Could not connect to the server. Please check your internet connection and ensure the server is accessible (CORS might be an issue).";
      } else {
        description = error.message || description;
      }
      toast({
        title: "Save Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentPriceTiers = Array.isArray(formData.priceTiers) ? formData.priceTiers : [defaultNewPriceTier()];


  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="grid auto-rows-max gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{existingProduct ? 'Edit Product' : 'Add New Product'}</CardTitle>
            <CardDescription>
              {existingProduct ? `Editing ${existingProduct.name}` : 'Fill in the information for the new finished product (e.g., yogurt).'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="min-h-20" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="sku">SKU (Stock Keeping Unit) <span className="text-destructive">*</span></Label>
                <Input id="sku" name="sku" type="text" value={formData.sku} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="productCategory">Product Category <span className="text-destructive">*</span></Label>
                <Select name="productCategory" onValueChange={(value) => handleSelectChange('productCategory', value as ProductCategory)} value={formData.productCategory} required>
                  <SelectTrigger id="productCategory"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="price">Standard Sales Price (NGN) <span className="text-destructive">*</span></Label>
                <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="costPrice">Cost Price (NGN)</Label>
                <Input id="costPrice" name="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="unitOfMeasure">Unit of Measure <span className="text-destructive">*</span></Label>
                <Select name="unitOfMeasure" onValueChange={(value) => handleSelectChange('unitOfMeasure', value as UnitOfMeasure)} value={formData.unitOfMeasure} required>
                  <SelectTrigger id="unitOfMeasure"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formData.unitOfMeasure === 'Litres' && (
                <div className="grid gap-3">
                  <Label htmlFor="litres">Content (Litres)</Label>
                  <Input id="litres" name="litres" type="number" step="0.01" value={formData.litres} onChange={handleInputChange} placeholder="e.g., 1 for 1L bottle" />
                </div>
              )}
              <div className="grid gap-3">
                <Label htmlFor="pcsPerUnit">PCS per Alternate Unit</Label>
                <Input id="pcsPerUnit" name="pcsPerUnit" type="number" value={formData.pcsPerUnit} onChange={handleInputChange} placeholder="e.g., 12 for a carton" />
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="alternateUnits">Alternate Units (e.g., Carton, Pack of 6)</Label>
              <Input id="alternateUnits" name="alternateUnits" type="text" value={formData.alternateUnits} onChange={handleInputChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="stock">Stock Quantity <span className="text-destructive">*</span></Label>
                <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input id="lowStockThreshold" name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleInputChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Price Tiers</CardTitle>
                <CardDescription>Define special pricing for different customer levels (e.g., B1-EX-F/DLR, R-RETAILER-Z1/RTL).</CardDescription>
            </CardHeader>
            <CardContent>
                {currentPriceTiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 mb-4 items-end">
                        <div>
                            <Label htmlFor={`priceLevel-${index}`}>Price Level <span className="text-destructive">*</span></Label>
                            <Select
                                value={tier.priceLevel}
                                onValueChange={(value) => handlePriceTierChange(index, 'priceLevel', value)}
                                required
                            >
                                <SelectTrigger id={`priceLevel-${index}`}>
                                    <SelectValue placeholder="Select price level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {priceLevelOptions.map(level => (
                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor={`tierPrice-${index}`}>Price (NGN) <span className="text-destructive">*</span></Label>
                            <Input
                                id={`tierPrice-${index}`}
                                type="number"
                                step="0.01"
                                value={tier.price}
                                onChange={(e) => handlePriceTierChange(index, 'price', e.target.value)}
                                min="0"
                                required
                            />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePriceTier(index)} className="text-destructive self-end mb-1" disabled={currentPriceTiers.length <= 1 && index === 0}>Remove</Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPriceTier}>Add Price Tier</Button>
            </CardContent>
        </Card>
      </div>

      <div className="grid auto-rows-max gap-4 lg:col-span-1">
         <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload images for your product.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-md border border-dashed bg-muted/20 overflow-hidden flex items-center justify-center">
                {imagePreviewUrl ? (
                  <Image src={imagePreviewUrl} alt="New product image preview" layout="fill" objectFit="cover" data-ai-hint="product image" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No Image</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="product-image-upload-input" className={cn(buttonVariants({ variant: "outline" }), "w-full max-w-xs cursor-pointer")}>
                  <Upload className="mr-2 h-4 w-4" />
                  {imagePreviewUrl ? 'Change Image' : 'Upload Image'}
                </Label>
                <Input
                  id="product-image-upload-input"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept="image/*"
                />
                {imagePreviewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive w-full max-w-xs"
                    onClick={handleRemoveImage}
                  >
                    Remove Image
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 lg:col-span-3">
        <Link href="/products" passHref>
          <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
        </Link>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (existingProduct ? 'Save Changes' : 'Save Product')}
        </Button>
      </div>
    </form>
  );
}
