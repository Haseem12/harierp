
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerComponent } from "@/components/ui/date-picker";
import { useToast } from '@/hooks/use-toast';
import type { RawMaterial, RawMaterialUsageLog, UnitOfMeasure, UsageDepartment } from '@/types';
import { usageDepartments } from '@/types';
import { format } from 'date-fns';

interface RecordUsageFormProps {
}

export default function RecordUsageForm({}: RecordUsageFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);

  const [usageNumber, setUsageNumber] = useState(
    `USE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
  );
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string | undefined>(undefined);
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterial | null>(null);
  const [quantityUsed, setQuantityUsed] = useState<number>(0);
  const [department, setDepartment] = useState<UsageDepartment | undefined>(usageDepartments[0]);
  const [usageDate, setUsageDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoadingMaterials(true);
    fetch('https://sajfoods.net/busa-api/database/get_raw_materials.php')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch raw materials: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setRawMaterials(data.data);
        } else {
          toast({ title: "Error", description: data.message || "Could not load raw materials.", variant: "destructive"});
          setRawMaterials([]);
        }
      })
      .catch(error => {
        toast({ title: "Fetch Error", description: `Raw Materials: ${error.message}`, variant: "destructive"});
        setRawMaterials([]);
      })
      .finally(() => setIsLoadingMaterials(false));
  }, [toast]);

  useEffect(() => {
    if (selectedRawMaterialId) {
      const material = rawMaterials.find(m => m.id === selectedRawMaterialId);
      setSelectedRawMaterial(material || null);
    } else {
      setSelectedRawMaterial(null);
    }
  }, [selectedRawMaterialId, rawMaterials]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!selectedRawMaterialId || !selectedRawMaterial) {
      toast({ title: "Error", description: "Please select a raw material.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (quantityUsed <= 0) {
      toast({ title: "Error", description: "Quantity used must be greater than zero.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (quantityUsed > selectedRawMaterial.stock) {
      toast({
        title: "Error",
        description: `Quantity used (${quantityUsed}) cannot exceed available stock (${selectedRawMaterial.stock}).`,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    if (!department) {
      toast({ title: "Error", description: "Please select a department.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (!usageDate) {
      toast({ title: "Error", description: "Please select a usage date.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const usageLogPayload: any = {
      usageNumber,
      rawMaterialId: selectedRawMaterial.id,
      quantityUsed: Number(quantityUsed),
      department,
      usageDate: format(usageDate, "yyyy-MM-dd"),
      notes,
    };

    try {
      const response = await fetch('https://sajfoods.net/busa-api/database/save_raw_material_usage.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usageLogPayload),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Failed to read error from server.");
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Material Usage Recorded",
          description: `${quantityUsed} ${selectedRawMaterial.unitOfMeasure} of ${selectedRawMaterial.name} recorded for ${department}.`,
        });
        router.push('/store/usage');
      } else {
        throw new Error(result.message || "Failed to save usage log.");
      }
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Record Material Usage</CardTitle>
          <CardDescription>Log the consumption of raw materials or store items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rawMaterial">Raw Material/Store Item <span className="text-destructive">*</span></Label>
              <Select onValueChange={setSelectedRawMaterialId} value={selectedRawMaterialId} required disabled={isLoadingMaterials}>
                <SelectTrigger id="rawMaterial">
                  <SelectValue placeholder={isLoadingMaterials ? "Loading materials..." : "Select item"} />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.sku}) - Stock: {material.stock} {material.unitOfMeasure}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRawMaterial && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Current stock for {selectedRawMaterial.name}: {selectedRawMaterial.stock} {selectedRawMaterial.unitOfMeasure}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="usageNumber">Usage ID</Label>
              <Input id="usageNumber" value={usageNumber} onChange={e => setUsageNumber(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantityUsed">Quantity Used <span className="text-destructive">*</span></Label>
              <Input
                id="quantityUsed"
                type="number"
                value={quantityUsed}
                onChange={e => setQuantityUsed(parseFloat(e.target.value) || 0)}
                min="0.01"
                step="any"
                required
                disabled={!selectedRawMaterial}
              />
               {selectedRawMaterial && <p className="mt-1 text-xs text-muted-foreground">Unit: {selectedRawMaterial.unitOfMeasure}</p>}
            </div>
             <div>
              <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
              <Select onValueChange={(value: UsageDepartment) => setDepartment(value)} value={department} required>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {usageDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="usageDate">Usage Date <span className="text-destructive">*</span></Label>
            <DatePickerComponent date={usageDate} setDate={setUsageDate} />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for usage, project ID, etc..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || isLoadingMaterials || !selectedRawMaterialId || quantityUsed <= 0 || !department || !usageDate}>
          {isLoading ? 'Recording...' : 'Record Usage'}
        </Button>
      </div>
    </form>
  );
}
