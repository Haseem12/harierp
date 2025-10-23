
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { ArrowLeft, RefreshCw, TestTube2, Droplets, Thermometer, FlaskConical, Zap, Wind, Eye, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Product } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TestResult = 'Pass' | 'Fail' | 'Pending';

export default function RecordLabTestPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [batchNumber, setBatchNumber] = useState(`B${format(new Date(), 'yyyyMMdd')}-`);
  const [sampleId, setSampleId] = useState(`S${format(new Date(), 'yyyy')}-`);
  const [testDate, setTestDate] = useState<Date | undefined>(new Date());
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Parameters
  const [phLevel, setPhLevel] = useState<number | undefined>();
  const [tdsLevel, setTdsLevel] = useState<number | undefined>();
  const [chlorineLevel, setChlorineLevel] = useState<number | undefined>();
  const [turbidity, setTurbidity] = useState<number | undefined>();
  const [conductivity, setConductivity] = useState<number | undefined>();
  const [temperature, setTemperature] = useState<number | undefined>();
  
  // Test Results
  const [microbiologicalTest, setMicrobiologicalTest] = useState<TestResult>('Pending');
  const [chemicalTest, setChemicalTest] = useState<TestResult>('Pending');
  const [physicalTest, setPhysicalTest] = useState<TestResult>('Pending');
  
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoadingProducts(true);
    fetch('https://sajfoods.net/busa-api/database/get_products.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          toast({ title: "Error", description: "Could not load products list.", variant: "destructive" });
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to fetch products list.", variant: "destructive" }))
      .finally(() => setIsLoadingProducts(false));
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!testDate || !selectedProductId || !sampleId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields: Sample ID, Product, and Test Date.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const payload = {
      batchNumber,
      sampleId,
      testDate: format(testDate, "yyyy-MM-dd"),
      productName: selectedProduct?.name || 'N/A',
      phLevel,
      tdsLevel,
      chlorineLevel,
      turbidity,
      conductivity,
      temperature,
      microbiologicalTest,
      chemicalTest,
      physicalTest,
      notes,
    };

    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_lab_test.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.id) {
        toast({
          title: "Lab Test Logged",
          description: `Test with Sample ID ${sampleId} has been recorded.`,
        });
        router.push(`/laboratory/tests/${result.id}`);
      } else {
        throw new Error(result.message || "Failed to record test. Please try again.");
      }
    } catch (error: any) {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-4 pb-4 mb-4 border-b">
        <Link href="/laboratory" passHref>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Laboratory Dashboard</span>
          </Button>
        </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 flex items-center">
          <TestTube2 className="mr-3 h-6 w-6"/> Record New Test
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>Log a new water sample test. Fill in the parameters and results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input id="batchNumber" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} placeholder="e.g., B2024-MMDD-XXX" />
              </div>
              <div>
                <Label htmlFor="sampleId">Sample ID <span className="text-destructive">*</span></Label>
                <Input id="sampleId" value={sampleId} onChange={e => setSampleId(e.target.value)} placeholder="e.g., S2024-XXX" required />
              </div>
              <div>
                <Label htmlFor="testDate">Test Date <span className="text-destructive">*</span></Label>
                <DatePickerComponent date={testDate} setDate={setTestDate} />
              </div>
            </div>
            
            <div className="grid md:grid-cols-1 gap-4">
               <div>
                <Label htmlFor="productId">Product <span className="text-destructive">*</span></Label>
                <Select onValueChange={setSelectedProductId} value={selectedProductId} required disabled={isLoadingProducts}>
                  <SelectTrigger id="productId">
                    <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select a product"}/>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CardDescription>Test Parameters</CardDescription>
            <div className="grid md:grid-cols-3 gap-4 border p-4 rounded-md">
              <div className="relative">
                <Label htmlFor="phLevel">pH Level (6.5-8.5)</Label>
                <Input id="phLevel" type="number" step="0.1" value={phLevel || ''} onChange={e => setPhLevel(parseFloat(e.target.value) || undefined)} placeholder="e.g., 7.0"/>
              </div>
              <div className="relative">
                <Label htmlFor="tdsLevel">TDS Level (ppm)</Label>
                <Input id="tdsLevel" type="number" step="1" value={tdsLevel || ''} onChange={e => setTdsLevel(parseFloat(e.target.value) || undefined)} placeholder="e.g., 50"/>
              </div>
               <div className="relative">
                <Label htmlFor="chlorineLevel">Chlorine (mg/L)</Label>
                <Input id="chlorineLevel" type="number" step="0.01" value={chlorineLevel || ''} onChange={e => setChlorineLevel(parseFloat(e.target.value) || undefined)} placeholder="e.g., 0.02"/>
              </div>
              <div className="relative">
                <Label htmlFor="turbidity">Turbidity (NTU)</Label>
                <Input id="turbidity" type="number" step="0.1" value={turbidity || ''} onChange={e => setTurbidity(parseFloat(e.target.value) || undefined)} placeholder="e.g., 0.5"/>
              </div>
              <div className="relative">
                <Label htmlFor="conductivity">Conductivity (µS/cm)</Label>
                <Input id="conductivity" type="number" step="1" value={conductivity || ''} onChange={e => setConductivity(parseFloat(e.target.value) || undefined)} placeholder="e.g., 250"/>
              </div>
              <div className="relative">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input id="temperature" type="number" step="0.1" value={temperature || ''} onChange={e => setTemperature(parseFloat(e.target.value) || undefined)} placeholder="e.g., 22"/>
              </div>
            </div>
            
            <CardDescription>Overall Test Results</CardDescription>
             <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="physicalTest">Physical Test</Label>
                  <Select onValueChange={(v: TestResult) => setPhysicalTest(v)} value={physicalTest}>
                    <SelectTrigger id="physicalTest"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Fail">Fail</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                  </Select>
                </div>
                 <div>
                  <Label htmlFor="chemicalTest">Chemical Test</Label>
                  <Select onValueChange={(v: TestResult) => setChemicalTest(v)} value={chemicalTest}>
                    <SelectTrigger id="chemicalTest"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Fail">Fail</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="microbiologicalTest">Microbiological Test</Label>
                  <Select onValueChange={(v: TestResult) => setMicrobiologicalTest(v)} value={microbiologicalTest}>
                    <SelectTrigger id="microbiologicalTest"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Fail">Fail</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                  </Select>
                </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Test observations and notes" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading || isLoadingProducts}>
              {isLoading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin"/> Saving...</> : 'Save Test'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
