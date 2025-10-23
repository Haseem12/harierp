
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RawMaterial, RawMaterialCategory, UnitOfMeasure, LedgerAccount } from '@/types';
import { rawMaterialCategories, unitsOfMeasure } from '@/types';
import { uploadFileToServer } from '@/lib/storageUtils'; // Use server upload
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RawMaterialFormProps {
  rawMaterial?: RawMaterial;
}

const NO_SUPPLIER_VALUE = "_NONE_";

export default function RawMaterialForm({ rawMaterial: existingMaterial }: RawMaterialFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<RawMaterial>>({
    name: '',
    description: '',
    category: rawMaterialCategories[0],
    sku: '',
    unitOfMeasure: unitsOfMeasure[0],
    litres: 0,
    stock: 0,
    costPrice: 0,
    lowStockThreshold: 10,
    imageUrl: '',
    supplierId: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [supplierAccounts, setSupplierAccounts] = useState<LedgerAccount[]>([]);

  useEffect(() => {
    setIsFetchingSuppliers(true);
    fetch('https://sajfoods.net/busa-api/database/getLedgerAccounts.php')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setSupplierAccounts(data.data.filter((acc: LedgerAccount) => acc.accountType === 'Supplier'));
        } else {
          toast({ title: "Error", description: "Could not load supplier accounts.", variant: "destructive" });
        }
      })
      .catch(error => {
        toast({ title: "Fetch Error", description: `Suppliers: ${error.message}`, variant: "destructive" });
      })
      .finally(() => setIsFetchingSuppliers(false));
  }, [toast]);

  useEffect(() => {
    if (existingMaterial) {
      setFormData({
        name: existingMaterial.name || '',
        description: existingMaterial.description || '',
        category: existingMaterial.category || rawMaterialCategories[0],
        sku: existingMaterial.sku || '',
        unitOfMeasure: existingMaterial.unitOfMeasure || unitsOfMeasure[0],
        litres: existingMaterial.litres || 0,
        stock: existingMaterial.stock || 0,
        costPrice: existingMaterial.costPrice || 0,
        lowStockThreshold: existingMaterial.lowStockThreshold || 10,
        imageUrl: existingMaterial.imageUrl || '',
        supplierId: existingMaterial.supplierId || undefined,
      });
      if (existingMaterial.imageUrl) {
        setImagePreviewUrl(existingMaterial.imageUrl);
      }
    }
  }, [existingMaterial]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['stock', 'costPrice', 'lowStockThreshold', 'litres'];
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: keyof RawMaterial, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

   const handleSupplierChange = (selectedVal: string) => {
    if (selectedVal === NO_SUPPLIER_VALUE) {
      setFormData(prev => ({ ...prev, supplierId: undefined }));
    } else {
      setFormData(prev => ({ ...prev, supplierId: selectedVal }));
    }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.name || !formData.category || !formData.sku || formData.stock === undefined || !formData.unitOfMeasure || formData.costPrice === undefined) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Category, SKU, Stock, Unit of Measure, Cost Price).",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    let imageUrlToSave = formData.imageUrl || ''; 

    if (selectedFile) { 
      try {
        imageUrlToSave = await uploadFileToServer(selectedFile, 'raw-materials-images');
      } catch (error: any) {
        toast({
          title: "Image Upload Failed",
          description: `Could not upload image: ${error.message}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    } else if (!imagePreviewUrl && existingMaterial?.imageUrl) {
        imageUrlToSave = '';
    }


    const materialPayload: any = {
      ...formData,
      id: existingMaterial?.id,
      imageUrl: imageUrlToSave,
      stock: Number(formData.stock || 0),
      costPrice: Number(formData.costPrice || 0),
      lowStockThreshold: Number(formData.lowStockThreshold || 0),
      litres: Number(formData.litres || 0),
      createdAt: existingMaterial?.createdAt ? (new Date(existingMaterial.createdAt as any)).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
     if (!existingMaterial?.id) { 
      delete materialPayload.id;
    }


    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_raw_material.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server.");
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();

      if (result.success && result.id) {
        toast({
          title: existingMaterial ? "Store Item Updated" : "Store Item Added",
          description: `"${materialPayload.name}" has been successfully ${existingMaterial ? 'updated' : 'added'}. You can now print the Goods Received Note.`,
        });
        router.push(`/store/${result.id}`); 
      } else {
        throw new Error(result.message || "Failed to save raw material. No ID returned.");
      }
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="grid auto-rows-max gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{existingMaterial ? 'Edit Store Item' : 'Add New Store Item'}</CardTitle>
            <CardDescription>
              {existingMaterial ? `Editing ${existingMaterial.name}` : 'Fill in the information for the new item (e.g., bottles, caps, chemicals).'}
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
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Select name="category" onValueChange={(value) => handleSelectChange('category', value as RawMaterialCategory)} value={formData.category} required>
                  <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {rawMaterialCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="costPrice">Cost Price (NGN) <span className="text-destructive">*</span></Label>
                <Input id="costPrice" name="costPrice" type="number" step="0.01" value={formData.costPrice} onChange={handleInputChange} required />
              </div>
               <div className="grid gap-3">
                <Label htmlFor="unitOfMeasure">Unit of Measure <span className="text-destructive">*</span></Label>
                <Select name="unitOfMeasure" onValueChange={(value) => handleSelectChange('unitOfMeasure', value as UnitOfMeasure)} value={formData.unitOfMeasure} required>
                  <SelectTrigger id="unitOfMeasure"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitsOfMeasure.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {formData.unitOfMeasure === 'Litres' && (
              <div className="grid gap-3 md:w-1/2">
                <Label htmlFor="litres">Content (Litres)</Label>
                <Input id="litres" name="litres" type="number" step="0.01" value={formData.litres} onChange={handleInputChange} placeholder="e.g., 1 for 1L, 0.5 for 500ml" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-3">
                <Label htmlFor="stock">Initial Stock Quantity <span className="text-destructive">*</span></Label>
                <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input id="lowStockThreshold" name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="supplierId">Supplier (Optional)</Label>
              <Select name="supplierId" onValueChange={handleSupplierChange} value={formData.supplierId || NO_SUPPLIER_VALUE} disabled={isFetchingSuppliers}>
                <SelectTrigger id="supplierId">
                  <SelectValue placeholder={isFetchingSuppliers ? "Loading suppliers..." : "Select supplier (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER_VALUE}>None</SelectItem>
                  {supplierAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid auto-rows-max gap-4 lg:col-span-1">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Item Image</CardTitle>
            <CardDescription>Upload an image for the item.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-md border border-dashed bg-muted/20 overflow-hidden flex items-center justify-center">
                {imagePreviewUrl ? (
                  <Image src={imagePreviewUrl} alt="New image preview" layout="fill" objectFit="cover" data-ai-hint="item image store" />
                ) : (
                  <div className="text-center p-4">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No Image</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="raw-material-image-upload-input" className={cn(buttonVariants({ variant: "outline" }), "w-full max-w-xs cursor-pointer")}>
                  <Upload className="mr-2 h-4 w-4" />
                  {imagePreviewUrl ? 'Change Image' : 'Upload Image'}
                </Label>
                <Input
                  id="raw-material-image-upload-input"
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
        <Link href="/store" passHref>
          <Button type="button" variant="outline" disabled={isLoading || isFetchingSuppliers}>Cancel</Button>
        </Link>
        <Button type="submit" disabled={isLoading || isFetchingSuppliers}>
          {isLoading ? (existingMaterial ? 'Saving...' : 'Adding...') : (existingMaterial ? 'Save Changes' : 'Add Item to Store')}
        </Button>
      </div>
    </form>
  );
}
